/**
 * Mặt soạn sống, phần kiểm được trong jsdom.
 *
 * **jsdom không dựng `contenteditable`**: `isContentEditable` là `undefined`
 * và gõ phím vào đó không sinh ra chữ nào. Nên phần "gõ tới đâu render tới
 * đó" phải đo trong trình duyệt thật — xem `bw-e2e/live.mjs` và ghi chú bàn
 * giao. Ở đây chỉ giữ những gì jsdom trả lời thật được: mở ra từ markdown thì
 * vẽ đúng chưa.
 *
 * Ghi rõ giới hạn này thay vì giả lập cho xanh: một bài kiểm giả lập
 * `contenteditable` chỉ chứng minh cái giả lập chạy.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LiveText } from './LiveText'

describe('mở ra từ markdown thì vẽ đúng ngay lượt đầu', () => {
  it('tiêu đề ra đúng cấp', () => {
    render(<LiveText text={'## Tiêu đề'} onCommit={vi.fn()} />)
    expect(document.querySelector('h2')?.textContent).toBe('Tiêu đề')
  })

  it('gạch đầu dòng ra danh sách thật, không ra chữ có dấu gạch', () => {
    render(<LiveText text={'- mục một\n- mục hai'} onCommit={vi.fn()} />)
    expect([...document.querySelectorAll('ul li')].map((el) => el.textContent)).toEqual(['mục một', 'mục hai'])
  })

  it('trích dẫn ra thẻ trích dẫn', () => {
    render(<LiveText text={'> lời trích'} onCommit={vi.fn()} />)
    expect(document.querySelector('blockquote')?.textContent).toBe('lời trích')
  })

  it('chữ đậm hiện ra đậm, dấu sao không lộ', () => {
    render(<LiveText text={'có **đậm** đây'} onCommit={vi.fn()} />)
    const p = document.querySelector('.awc-live-input')
    expect(p?.textContent).toBe('có đậm đây')
    expect(document.querySelector('.awc-live-bold')?.textContent).toBe('đậm')
  })

  it('cả một bài nhiều loại vẽ đủ trong **một** mặt', () => {
    render(<LiveText text={'## Tiêu đề\n\nMột đoạn.\n\n- mục'} onCommit={vi.fn()} />)
    expect(document.querySelector('h2')).toBeTruthy()
    expect(document.querySelector('ul li')).toBeTruthy()
    // Một mặt duy nhất: không còn hai mặt để bấm vào là lật.
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('ô rỗng có chữ mờ mời gõ', () => {
    render(<LiveText text="" onCommit={vi.fn()} />)
    expect(screen.getByText('Viết ở đây, hoặc gõ / để chèn')).toBeInTheDocument()
  })
})

/*
 * Bài AI Twin lặp phần 4–7 (2026-09-24): chèn một khối giữa dải là mặt soạn
 * này chỉ còn nửa trước, mà bộ hoàn tác của Lexical vẫn nhớ cả dải cũ. Ctrl+Z
 * dựng lại cả dải, rời ô là ghi đè — nửa sau thành hai bản. Tái hiện trong
 * Chromium ở `frontend/src/harness.tsx`; ở đây kiểm đúng mắt xích ấy.
 */
describe('chữ đổi từ bên ngoài thì hoàn tác không dựng lại chữ cũ', () => {
  it('Ctrl+Z sau khi dải bị cắt không đưa nửa đã chuyển đi quay lại', async () => {
    const { UNDO_COMMAND } = await import('lexical')
    const { act } = await import('@testing-library/react')
    const { rerender } = render(<LiveText text={'## Bốn\n\n## Năm'} onCommit={vi.fn()} />)
    // Một lần sửa trước để bộ hoàn tác có một bản "trước" — giống người đã gõ.
    rerender(<LiveText text={'## Bốn\n\n## Năm\n\n## Sáu'} onCommit={vi.fn()} />)
    await act(async () => new Promise((r) => setTimeout(r, 1100)))
    rerender(<LiveText text={'## Bốn'} onCommit={vi.fn()} />)
    await act(async () => {})
    expect(document.querySelectorAll('h2')).toHaveLength(1)

    const root = document.querySelector('.awc-live-input') as HTMLElement & {
      __lexicalEditor: { dispatchCommand: (c: unknown, p: unknown) => boolean }
    }
    await act(async () => {
      root.__lexicalEditor.dispatchCommand(UNDO_COMMAND, undefined)
    })
    expect([...document.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Bốn'])
  })
})
