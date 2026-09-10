/**
 * Ô hai mặt, phần còn lại của nó.
 *
 * Thân bài nay là một mặt soạn sống (`LiveText`), nên ô hai mặt — bấm vào để
 * lật sang chữ thô — chỉ còn ở những khối **không** nằm trong dải chữ: dòng
 * nhãn và khối nhấn. Chúng vẫn giữ markdown trong một ô thường, nên vẫn cần
 * vẽ ra đúng và vẫn cần `Cmd+B`.
 *
 * Phần gõ trong mặt soạn sống đo bằng Playwright — jsdom không dựng
 * `contenteditable`. Xem `tools/e2e/live.mjs`.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReportBlock } from 'post-renderer'
import { textToRuns } from 'post-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'
import { EditorCanvas } from './Editor'

const callout = (text: string) => [{ type: 'callout', id: 'b1', text, heading: '' } as unknown as ReportBlock]

function draw(body: ReportBlock[]) {
  const onChange = vi.fn()
  render(
    <EditorCanvas
      template="report"
      post={{ id: 'p1', module_id: 'sensory', en: 'T', template: 'report', body, lead: '' } as unknown as PostDetail}
      onChange={onChange}
      onHeroDrop={vi.fn()}
    />,
  )
  return onChange
}

describe('khối nhấn vẫn là ô hai mặt', () => {
  it('chữ nhấn vẽ ra là chữ nhấn, dấu sao không lộ ra', () => {
    draw(callout('có **đậm** đây'))
    expect(screen.getByText('đậm').tagName).toBe('EM')
    expect(screen.queryByText(/\*\*/)).toBeNull()
  })

  it('bấm vào là hiện chữ thô để sửa', async () => {
    draw(callout('có **đậm** đây'))
    expect(screen.queryByDisplayValue('có **đậm** đây')).toBeNull()

    await userEvent.click(screen.getByText('đậm'))
    expect(screen.getByDisplayValue('có **đậm** đây')).toBeTruthy()
  })

  it('rời ô thì vẽ lại, không nằm ở chữ thô suốt buổi', async () => {
    draw(callout('có **đậm** đây'))
    await userEvent.click(screen.getByText('đậm'))
    await userEvent.tab()

    expect(screen.queryByDisplayValue('có **đậm** đây')).toBeNull()
    expect(screen.getByText('đậm').tagName).toBe('EM')
  })

  it('sửa xong ghi ra đúng chữ thô, không ghi ra bản đã vẽ', async () => {
    const onChange = draw(callout('có **đậm** đây'))
    await userEvent.click(screen.getByText('đậm'))
    await userEvent.type(screen.getByDisplayValue('có **đậm** đây'), '!')
    await userEvent.tab()

    const body = onChange.mock.calls.at(-1)?.[0].body as { text?: string }[]
    expect(body[0].text).toBe('có **đậm** đây!')
  })

  it('Cmd+B nhấn chữ đang bôi đen', async () => {
    const onChange = draw(callout('có chữ đây'))
    await userEvent.click(screen.getByText('có chữ đây'))
    const field = screen.getByDisplayValue('có chữ đây') as HTMLTextAreaElement
    field.focus()
    field.setSelectionRange(3, 6)
    await userEvent.keyboard('{Meta>}b{/Meta}')
    await userEvent.tab()

    const body = onChange.mock.calls.at(-1)?.[0].body as { text?: string }[]
    expect(body[0].text).toBe('có **chữ** đây')
  })

  it('Cmd+K để lại vỏ link và đặt con trỏ vào chỗ điền địa chỉ', async () => {
    draw(callout('xem đây'))
    await userEvent.click(screen.getByText('xem đây'))
    const field = screen.getByDisplayValue('xem đây') as HTMLTextAreaElement
    field.focus()
    field.setSelectionRange(4, 7)
    await userEvent.keyboard('{Meta>}k{/Meta}')

    expect(field.value).toBe('xem [đây]()')
    expect(field.selectionStart).toBe(field.value.indexOf('()') + 1)
  })

  it('hai mặt đo cùng một kiểu, nên lật mặt không làm trang nhảy', async () => {
    // Con số thật đo bằng Playwright trong Chrome: lệch 0.3px. Ở đây chỉ giữ
    // cái điều kiện làm cho hai mặt đo bằng nhau.
    draw(callout('một dòng'))
    await userEvent.click(screen.getByText('một dòng'))
    expect(screen.getByDisplayValue('một dòng').style.boxSizing).toBe('border-box')
  })
})

describe('dải chữ dùng mặt soạn sống, không phải ô hai mặt', () => {
  it('chữ và chỗ gõ là một', () => {
    draw([{ type: 'paragraph', id: 'b9', text: 'chữ trong dải' } as unknown as ReportBlock])
    const live = document.querySelector('.awc-live-input') as HTMLElement
    expect(live.getAttribute('contenteditable')).toBe('true')
    expect(live.textContent).toContain('chữ trong dải')
  })

  it('danh sách vẽ ra thẻ danh sách thật ngay trong mặt soạn', () => {
    draw([
      { type: 'list', id: 'b9', items: [{ runs: textToRuns('mục một') }] } as unknown as ReportBlock,
    ])
    expect(document.querySelector('.awc-live-input ul li')?.textContent).toBe('mục một')
  })
})
