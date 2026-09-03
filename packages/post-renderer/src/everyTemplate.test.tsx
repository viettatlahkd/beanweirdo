import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostRenderer, type PostRendererProps } from './PostRenderer'
import { POST_TEMPLATES } from '../../../backend/lib/posts'

/**
 * Rules that hold for every template, including ones nobody has written yet.
 *
 * A template is free to look like nothing else in the system — that is the
 * point of having five. But a reader must always be able to see where a post
 * is filed and get back there, so two things are not a template's own business:
 * the trail back, and the colours of the module it belongs to.
 *
 * Adding a template means adding it to `CASES`. If you do not, the first test
 * fails and says which one is missing, rather than the rule quietly not
 * applying to the new one.
 */

const BAND = { bg: 'rgb(1, 2, 3)', fg: 'rgb(4, 5, 6)' }
const CRUMB = <div>đường-quay-lại</div>

const CASES: Record<string, PostRendererProps> = {
  article: {
    template: 'article',
    post: {
      band: BAND, eyebrow: '01 — essay — 2026.02', moduleTitle: 'biochem', title: 'Bài',
      lead: 'dẫn', sections: [], pull: '', relatedHeading: '', related: [],
      furtherReadingHeading: '', furtherReading: [],
      platePrimary: { caption: '', tint: '#EEE', imageUrl: null }, plateSecondary: { caption: '', tint: '#EEE', imageUrl: null },
      heroPlate: { caption: '', tint: '#EEE', imageUrl: null }, detailPlate: { caption: '', tint: '#EEE', imageUrl: null },
    },
  },
  cards: { template: 'cards', post: { band: BAND, title: 'Bài', intro: [''], cards: [] } },
  report: { template: 'report', post: { band: BAND, title: 'Bài', blocks: [] } },
  /*
   * Long-form cần một khối `h1`: tiêu đề bài được vẽ *thay cho* tiêu đề đầu
   * tiên của bản export, nên bài không có khối nào thì trang không có tiêu đề
   * để mà vẽ. (Đó cũng là một chỗ hở của template lúc bài còn trắng.)
   */
  longform: {
    template: 'longform',
    post: { band: BAND, title: 'Bài', blocks: [{ k: 'h1', runs: [{ t: 'Tiêu đề gốc' }] }] },
  },
  memo: { template: 'memo', post: { band: BAND, title: 'Bài', specs: [], sections: [] } },
}

describe('rules every template obeys', () => {
  it('covers every template the system accepts', () => {
    expect(Object.keys(CASES).sort()).toEqual([...POST_TEMPLATES].sort())
  })

  for (const name of Object.keys(CASES)) {
    it(`${name}: shows the trail back`, () => {
      render(<PostRenderer {...CASES[name]} breadcrumb={CRUMB} />)
      expect(screen.getByText('đường-quay-lại')).toBeInTheDocument()
    })

    it(`${name}: wears its module's colours`, () => {
      const { container } = render(<PostRenderer {...CASES[name]} breadcrumb={CRUMB} />)
      const painted = Array.from(container.querySelectorAll<HTMLElement>('div')).some(
        (d) => d.style.background === BAND.bg || d.style.backgroundColor === BAND.bg,
      )
      expect(painted).toBe(true)
    })
  }
})

/**
 * Tiêu đề bài dài phải tự xuống dòng, và gãy đúng chỗ tiếng Anh cho phép gãy.
 *
 * "biochemistry 101" ở cỡ 92px không vừa mảng màu chứa nó, và HTML mặc định
 * không cắt một từ dài — nó tràn ra rồi bị ô bên cạnh che mất đuôi.
 *
 * `lang="en"` là phần dễ rơi nhất: đo trong trình duyệt thật thì bỏ nó đi,
 * cùng một chữ tràn ra 45px thay vì nằm gọn — vì trang khai `lang="vi"` và
 * tiếng Việt không ngắt âm tiết giữa từ. Không thẻ nào nói mình là tiếng Anh
 * thì luật ngắt không chạy, mà nhìn CSS vẫn thấy đủ.
 */
describe('tiêu đề dài', () => {
  it('mọi template đều khai tiếng Anh và bật luật ngắt âm tiết', () => {
    for (const [name, props] of Object.entries(CASES)) {
      const { container, unmount } = render(<PostRenderer {...props} />)
      const h1 = container.querySelector('h1')
      expect(h1, name).not.toBeNull()
      expect(h1?.getAttribute('lang'), name).toBe('en')
      expect(h1?.style.hyphens || h1?.style.getPropertyValue('-webkit-hyphens'), name).toBe('auto')
      unmount()
    }
  })
})
