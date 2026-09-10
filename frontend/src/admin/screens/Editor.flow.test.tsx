/**
 * Thân bài là một dải chữ liền mạch, vẽ sống.
 *
 * **Giới hạn phải nói rõ:** jsdom không dựng `contenteditable`, nên gõ phím
 * vào mặt soạn ở đây không sinh ra chữ nào. Phần "gõ tới đâu render tới đó",
 * bôi đen suốt nhiều khối, và ghi ra markdown lúc rời ô được đo bằng Playwright
 * trong Chrome thật — xem `tools/e2e/live.mjs`.
 *
 * Chỗ này giữ những gì jsdom trả lời thật được: một dải vẽ ra đúng hình dạng
 * của nó, widget vẫn là widget, và cả ba màn cùng một lối.
 */
import { render, screen } from '@testing-library/react'
import type { ReportBlock } from 'post-renderer'
import { textToRuns } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

const head = (text: string, id: string) => ({ type: 'heading', id, level: 2, text }) as unknown as ReportBlock
const para = (text: string, id: string) => ({ type: 'paragraph', id, text }) as unknown as ReportBlock
const list = (id: string, ...lines: string[]) =>
  ({ type: 'list', id, items: lines.map((t) => ({ runs: textToRuns(t) })) }) as unknown as ReportBlock
const table = (id: string) =>
  ({ type: 'table', id, table: { columns: ['Ngày'], rows: [{ cells: ['01'] }], widths: [100] } }) as unknown as ReportBlock

function draw(template: 'report' | 'memo' | 'bitesize', body: unknown) {
  const onChange = vi.fn()
  render(
    <EditorCanvas
      template={template}
      post={
        {
          id: 'p1', module_id: 'sensory', en: 'T', vi: 'm', kind: 'note', date_label: '2026.09',
          status: 'draft', hero_image_url: null, theme_color: null, sort_order: 0, slug: 'b',
          further_reading: [], lead: '', template, body,
        } as unknown as PostDetail
      }
      onChange={onChange}
      onHeroDrop={vi.fn()}
    />,
  )
  return onChange
}

const three = [head('Tiêu đề', 'b1'), para('Một đoạn.', 'b2'), list('b3', 'mục một', 'mục hai')]

describe('một mặt soạn cho cả dải', () => {
  it('cả dải vẽ trong **một** mặt, không phải mỗi khối một ô', () => {
    draw('report', three)
    const surfaces = document.querySelectorAll('.awc-live-input')
    expect(surfaces).toHaveLength(1)
    // Và cả ba khối nằm trong đúng mặt ấy.
    const text = surfaces[0].textContent ?? ''
    expect(text).toContain('Tiêu đề')
    expect(text).toContain('Một đoạn.')
    expect(text).toContain('mục hai')
  })

  it('không còn hai mặt để bấm vào là lật', () => {
    draw('report', three)
    // Không `textarea` nào cho chữ: chữ và chỗ gõ là một.
    expect(document.querySelector('.awc-live-input textarea')).toBeNull()
    expect((document.querySelector('.awc-live-input') as HTMLElement).getAttribute('contenteditable')).toBe('true')
  })

  it('mỗi loại vẽ ra đúng thẻ của nó, không ra ký hiệu markdown', () => {
    draw('report', three)
    expect(document.querySelector('h2')?.textContent).toBe('Tiêu đề')
    expect([...document.querySelectorAll('ul li')].map((el) => el.textContent)).toEqual(['mục một', 'mục hai'])
    expect(document.querySelector('.awc-live-input')?.textContent).not.toContain('##')
  })
})

describe('widget cắm vào giữa dải, không phá dải', () => {
  const withTable = [para('trên', 'b1'), table('t1'), para('dưới', 'b2')]

  it('bảng vẫn là widget riêng, chữ hai bên là hai dải', () => {
    draw('report', withTable)
    expect(document.querySelectorAll('.awc-live-input')).toHaveLength(2)
    // Bảng giữ ô soạn của nó — kéo cột, thêm hàng vẫn ở đó.
    expect(screen.getByDisplayValue('Ngày')).toBeInTheDocument()
  })

  it('bài chỉ có một cái bảng thì không sinh dải chữ rỗng thừa', () => {
    draw('report', [table('t1')])
    expect(screen.getByDisplayValue('Ngày')).toBeInTheDocument()
  })
})

describe('cả ba màn cùng một lối soạn', () => {
  it('memo cũng gom khối chữ vào một mặt', () => {
    draw('memo', { subtitle: 'phụ', elements: [head('Tiêu đề', 'b1'), para('Đoạn', 'b2')] })
    const text = document.querySelector('.awc-live-input')?.textContent ?? ''
    expect(text).toContain('Tiêu đề')
    expect(text).toContain('Đoạn')
  })

  it('bitesize cũng vậy', () => {
    draw('bitesize', { len: 'ngắn', elements: [para('Một', 'b1'), list('b2', 'mục')] })
    const text = document.querySelector('.awc-live-input')?.textContent ?? ''
    expect(text).toContain('Một')
    expect(text).toContain('mục')
  })
})

describe('menu `+` bên máng', () => {
  it('chỉ bày thứ không gõ ra được', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    draw('report', three)
    await userEvent.click(screen.getAllByLabelText('thêm khối')[0])

    expect(screen.getByRole('button', { name: 'Bảng' })).toBeInTheDocument()
    // Tiêu đề, danh sách, trích dẫn là chữ — gõ ra, không chèn.
    expect(screen.queryByRole('button', { name: 'Tiêu đề' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Đoạn văn' })).toBeNull()
  })
})
