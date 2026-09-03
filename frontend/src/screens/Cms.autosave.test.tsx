import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

/**
 * Ô chữ của trang lưu cả khi đang gõ, không chỉ khi rời ô.
 *
 * Chỉ lưu khi rời ô là một cái bẫy im lặng: gõ xong rồi tải lại trang là ô ấy
 * chưa hề được lưu, và không có gì trên màn hình cho biết. Đây là bản rút gọn
 * của hai lối lưu trong `Cms.tsx` — cùng một hành vi, tách ra để chốt được.
 */
function Field({ onSave }: { onSave: (v: string) => void }) {
  const pending = { current: undefined as ReturnType<typeof setTimeout> | undefined }
  return (
    <input
      aria-label="ô chữ"
      onChange={(e) => {
        clearTimeout(pending.current)
        const v = e.target.value
        pending.current = setTimeout(() => onSave(v), 700)
      }}
      onBlur={(e) => {
        clearTimeout(pending.current)
        onSave(e.target.value)
      }}
    />
  )
}

describe('ô chữ của trang', () => {
  it('lưu sau khi ngừng gõ, dù chưa rời ô', async () => {
    const onSave = vi.fn()
    render(<Field onSave={onSave} />)
    await userEvent.type(screen.getByLabelText('ô chữ'), 'nội dung mới')
    // Không click ra ngoài, không tab — đúng tình huống gõ xong rồi tải lại trang.
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('nội dung mới'), { timeout: 3000 })
  })

  it('rời ô thì lưu ngay, không phải chờ', async () => {
    const onSave = vi.fn()
    render(<Field onSave={onSave} />)
    const box = screen.getByLabelText('ô chữ')
    await userEvent.type(box, 'xong')
    await userEvent.tab()
    expect(onSave).toHaveBeenCalledWith('xong')
  })
})
