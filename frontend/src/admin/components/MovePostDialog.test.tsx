import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Module, PostSummary } from '../lib/apiClient'

const listModulesCached = vi.fn()

vi.mock('../lib/lists', () => ({
  listModulesCached: () => listModulesCached(),
}))

const { MovePostDialog } = await import('./MovePostDialog')

const mod = (id: string, title: string, kind: Module['kind'] = 'normal'): Module =>
  ({ id, title, kind }) as Module

const MODULES = [mod('roastery', 'Roastery'), mod('sensory', 'Sensory'), mod('ghi01', 'Ghi 01', 'special')]

const post = (over: Partial<PostSummary> = {}): PostSummary =>
  ({
    id: 'p1',
    module_id: 'ghi01',
    en: 'Bài thử',
    status: 'published',
    ...over,
  }) as PostSummary

function open(over: Partial<Parameters<typeof MovePostDialog>[0]> = {}) {
  listModulesCached.mockResolvedValue(MODULES)
  const onClose = vi.fn()
  const onMoved = vi.fn()
  render(<MovePostDialog post={post()} onClose={onClose} onMoved={onMoved} {...over} />)
  return { onClose, onMoved }
}

const target = () => screen.getByRole('combobox', { name: /module đích/i })
const go = () => screen.getByRole('button', { name: 'Chuyển' })

describe('hộp thoại chuyển module', () => {
  it('không có bài thì không vẽ gì cả', () => {
    render(<MovePostDialog post={null} onClose={vi.fn()} onMoved={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mở ra là một dialog thật, có tên', () => {
    open()
    const box = screen.getByRole('dialog')
    expect(box).toHaveAttribute('aria-modal', 'true')
    expect(box).toHaveAccessibleName('Chuyển sang module khác')
  })

  /*
   * Mở ra đứng sẵn ở module hiện tại: nếu ô chọn nhảy về module đầu danh sách
   * thì bấm Chuyển mà không đọc kỹ là chuyển bài đi chỗ khác ngoài ý muốn.
   */
  it('ô chọn đứng sẵn ở module bài đang nằm, và nút Chuyển chưa bấm được', async () => {
    open()
    await waitFor(() => expect(target()).toHaveValue('ghi01'))
    expect(go()).toBeDisabled()
  })

  it('chọn module khác thì bấm được, và trả đúng id về nơi gọi', async () => {
    const { onMoved } = open()
    await waitFor(() => expect(target()).toHaveValue('ghi01'))
    await userEvent.selectOptions(target(), 'roastery')
    expect(go()).toBeEnabled()
    await userEvent.click(go())
    expect(onMoved).toHaveBeenCalledWith('roastery')
  })

  /*
   * Đường dẫn công khai dựng từ `module_id` (`lib/postSlug.ts:uniqueSlug`),
   * nên phải nói trước khi bấm chứ không phải sau.
   */
  it('chỉ cảnh báo đường dẫn sau khi đã chọn sang module khác', async () => {
    open()
    await waitFor(() => expect(target()).toHaveValue('ghi01'))
    expect(screen.queryByText(/địa chỉ cũ sẽ/i)).not.toBeInTheDocument()
    await userEvent.selectOptions(target(), 'sensory')
    expect(screen.getByText(/địa chỉ cũ sẽ/i)).toBeInTheDocument()
  })

  it('ghi hỏng thì hộp thoại ở lại, không đóng rồi để người ta đoán', async () => {
    const onMoved = vi.fn().mockRejectedValue(new Error('mạng hỏng'))
    open({ onMoved })
    await waitFor(() => expect(target()).toHaveValue('ghi01'))
    await userEvent.selectOptions(target(), 'roastery')
    await userEvent.click(go())
    expect(onMoved).toHaveBeenCalledWith('roastery')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Bấm lại được, chứ không kẹt ở "Đang chuyển…".
    expect(go()).toBeEnabled()
  })

  it('bấm Esc thì đóng', async () => {
    const { onClose } = open()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
