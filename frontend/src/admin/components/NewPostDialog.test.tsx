import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const createPost = vi.fn().mockResolvedValue({ id: 'new-1' })

vi.mock('../lib/apiClient', () => ({
  createPost: (...args: unknown[]) => createPost(...args),
}))

// The form inside is its own screen with its own network calls; this file is
// about the box around it, so it is stubbed down to one button.
vi.mock('../screens/MetadataStep', () => ({
  MetadataStep: ({ onContinue }: { onContinue: (m: unknown) => void }) => (
    <button type="button" onClick={() => onContinue({ en: 'Bài' })}>
      Soạn bài
    </button>
  ),
}))

const { NewPostDialog } = await import('./NewPostDialog')

function open(over: Partial<Parameters<typeof NewPostDialog>[0]> = {}) {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(<NewPostDialog open onClose={onClose} onCreated={onCreated} {...over} />)
  return { onClose, onCreated }
}

describe('hộp thoại Bài mới', () => {
  it('đóng thì không vẽ gì cả', () => {
    render(<NewPostDialog open={false} onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mở thì là một dialog thật, có tên', () => {
    open()
    const box = screen.getByRole('dialog')
    expect(box).toHaveAttribute('aria-modal', 'true')
    expect(box).toHaveAccessibleName('Bài mới')
  })

  it('bấm Esc thì đóng', async () => {
    const { onClose } = open()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('bấm ra ngoài thì đóng, bấm vào trong thì không', () => {
    const { onClose } = open()
    const box = screen.getByRole('dialog')

    fireEvent.mouseDown(box)
    expect(onClose).not.toHaveBeenCalled()

    /*
     * Nền là cha của hộp. Dùng `mouseDown` chứ không `click` vì chính component
     * nghe `mousedown`: thả chuột ngoài nền sau khi bôi đen chữ bên trong cũng
     * là một `click` trên nền, và như vậy là đóng mất form đang điền.
     */
    fireEvent.mouseDown(box.parentElement!)
    expect(onClose).toHaveBeenCalled()
  })

  it('tạo xong thì trả id ra ngoài chứ không tự đi đâu', async () => {
    const { onCreated } = open()
    await userEvent.click(screen.getByRole('button', { name: 'Soạn bài' }))
    expect(createPost).toHaveBeenCalledWith({ en: 'Bài' })
    expect(onCreated).toHaveBeenCalledWith('new-1')
  })

  it('tạo hỏng thì nói ra, và không đóng', async () => {
    createPost.mockRejectedValueOnce(new Error('Mất kết nối'))
    const { onCreated, onClose } = open()
    await userEvent.click(screen.getByRole('button', { name: 'Soạn bài' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối')
    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('khoá cuộn của trang phía sau khi mở, trả lại khi đóng', () => {
    const { unmount } = render(<NewPostDialog open onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
