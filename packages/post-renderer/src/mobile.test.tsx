import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostRenderer, type PostRendererProps } from './PostRenderer'

/*
 * Bố cục điện thoại của năm khuôn bài.
 *
 * `mobile` là **prop**, không phải thứ package tự đo: cùng một khuôn được vẽ cả
 * trên trang thật lẫn trong khung xem trước hẹp của CMS, và chỉ chỗ gọi biết
 * khung nào rộng bao nhiêu. Package tự đọc bề ngang màn thì ô xem trước sẽ vẽ
 * bố cục desktop trong một khung 800px và nói dối.
 *
 * Vì vậy điều đáng chốt nhất ở đây là **mặc định**: không truyền gì thì mọi chỗ
 * gọi cũ giữ nguyên bố cục desktop.
 */
const BAND = { bg: 'rgb(1, 2, 3)', fg: 'rgb(4, 5, 6)' }

const CASES: Record<string, PostRendererProps> = {
  article: {
    template: 'article',
    post: {
      band: BAND, eyebrow: '01', moduleTitle: 'biochem', title: 'Bài', lead: 'dẫn',
      sections: [{ h: 'Mục', p: 'Đoạn' }], pull: '', relatedHeading: '', related: [],
      furtherReadingHeading: '', furtherReading: [],
      platePrimary: { caption: '', tint: '#EEE', imageUrl: null },
      plateSecondary: { caption: '', tint: '#EEE', imageUrl: null },
      heroPlate: { caption: '', tint: '#EEE', imageUrl: null },
      detailPlate: { caption: '', tint: '#EEE', imageUrl: null },
    },
  },
  cards: { template: 'cards', post: { band: BAND, title: 'Bài', intro: [''], cards: [] } },
  report: { template: 'report', post: { band: BAND, title: 'Bài', blocks: [] } },
  longform: {
    template: 'longform',
    post: { band: BAND, title: 'Bài', blocks: [{ k: 'h1', runs: [{ t: 'Mục' }] }] },
  },
  memo: { template: 'memo', post: { band: BAND, title: 'Bài', specs: [], sections: [] } },
}

const h1Of = (c: HTMLElement) => c.querySelector('h1')

describe('năm khuôn bài trên điện thoại', () => {
  it('không truyền gì thì vẫn là bố cục desktop', () => {
    // Đây là điều giữ cho mọi chỗ gọi cũ — kể cả CMS — không phải sửa một dòng.
    for (const [name, props] of Object.entries(CASES)) {
      const { container, unmount } = render(<PostRenderer {...props} />)
      const size = h1Of(container)?.style.fontSize
      expect(size, `${name}: cỡ tiêu đề desktop`).not.toBe('36px')
      unmount()
    }
  })

  it('mọi khuôn đều thu tiêu đề lại khi được bảo là điện thoại', () => {
    // Tiêu đề 70–78px trên màn 390 thì tràn mép, dù có ngắt âm tiết.
    for (const [name, props] of Object.entries(CASES)) {
      const { container, unmount } = render(<PostRenderer {...props} mobile />)
      const size = parseFloat(h1Of(container)?.style.fontSize ?? '999')
      expect(size, `${name}: cỡ tiêu đề mobile`).toBeLessThanOrEqual(40)
      unmount()
    }
  })

  it('không khuôn nào vẽ ra thứ rộng hơn màn 390 bằng px cứng', () => {
    for (const [name, props] of Object.entries(CASES)) {
      const { container, unmount } = render(<PostRenderer {...props} mobile />)
      const wide = (Array.from(container.querySelectorAll('*')) as HTMLElement[]).filter((el) => {
        const w = el.style.width
        return /^\d+px$/.test(w) && parseInt(w) > 390
      })
      expect(wide.map((e) => e.style.width), `${name}: bề ngang cứng vượt 390`).toEqual([])
      unmount()
    }
  })
})

describe('bảng trong khuôn Report và Memo', () => {
  // Bảng nằm ở kho element dùng chung, nên sửa một lần ăn cả hai khuôn — và
  // ngược lại, kiểm phải kiểm cả hai.
  const withTable = (template: 'report' | 'memo'): PostRendererProps =>
    template === 'report'
      ? {
          template: 'report',
          post: {
            band: BAND, title: 'Bài',
            blocks: [
              {
                type: 'table',
                table: { columns: ['A', 'B', 'C', 'D'], rows: [{ cells: ['1', '2', '3', '4'] }] },
              },
            ] as never,
          },
        }
      : {
          template: 'memo',
          post: {
            band: BAND, title: 'Bài', specs: [],
            sections: [
              { h: 'Mục', table: { head: ['A', 'B', 'C', 'D'], rows: [['1', '2', '3', '4']] } },
            ] as never,
          },
        }

  for (const t of ['report', 'memo'] as const) {
    /*
     * Report vẽ bảng bằng `<table>` của kho element; Memo vẽ bằng lưới của
     * riêng nó — kho sở hữu định dạng, khuôn sở hữu bố cục. Hai đoạn mã khác
     * nhau, nên phải kiểm cả hai: sửa một chỗ không tự ăn sang chỗ kia.
     */
    const wide = (c: HTMLElement) =>
      (Array.from(c.querySelectorAll('*')) as HTMLElement[]).find((e) => e.style.minWidth === '520px')

    it(`${t}: bảng cuộn trong khung của nó, không kéo cả trang`, () => {
      const { container } = render(<PostRenderer {...withTable(t)} mobile />)
      const inner = wide(container)
      // Bốn cột trên 390 cho mỗi cột dưới 90px — chữ vỡ thành từng chữ cái.
      expect(inner, `${t}: bảng có bề ngang tối thiểu`).toBeTruthy()
      const box = inner?.closest('div[style*="overflow"]') as HTMLElement | null
      expect(box?.style.overflowX, `${t}: khung cuộn bọc ngoài`).toBe('auto')
    })

    it(`${t}: desktop thì bảng không đặt bề ngang tối thiểu`, () => {
      const { container } = render(<PostRenderer {...withTable(t)} />)
      expect(wide(container)).toBeUndefined()
    })
  }
})
