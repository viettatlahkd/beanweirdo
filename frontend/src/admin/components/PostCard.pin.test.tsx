import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PostCard } from './PostCard'
import type { PostSummary } from '../lib/apiClient'

const post = (over: Partial<PostSummary> = {}): PostSummary =>
  ({
    id: 'p1',
    module_id: 'sensory',
    en: 'Sensory Lexicon',
    vi: 'mô tả',
    kind: 'ref',
    date_label: '2026.03',
    status: 'published',
    template: 'cards',
    hero_image_url: null,
    thumbnail_url: null,
    sort_order: null,
    pinned: false,
    created_at: '',
    updated_at: '',
    published_at: null,
    ...over,
  }) as PostSummary

// The pin was the emoji 📌 held at opacity .18 until hovered, so its whole
// accessible name was the emoji and a pin nobody hovered was invisible. It is
// an icon button now, named by what pressing it does.
const pin = () => screen.getByRole('button', { name: /ghim/i })

describe('ghim bài', () => {
  it('ghim được từ danh sách, ở mọi module — không riêng Ghi 01', () => {
    const onPin = vi.fn()
    render(
      <PostCard post={post({ module_id: 'biochem' })} onAction={vi.fn()} onEdit={vi.fn()} onCopy={vi.fn()} onMove={vi.fn()} onPin={onPin} />,
    )
    fireEvent.click(pin())
    expect(onPin).toHaveBeenCalledWith('p1', true)
  })

  it('bài đang ghim thì bấm lại là bỏ ghim', () => {
    const onPin = vi.fn()
    render(<PostCard post={post({ pinned: true })} onAction={vi.fn()} onEdit={vi.fn()} onCopy={vi.fn()} onMove={vi.fn()} onPin={onPin} />)
    expect(pin()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(pin())
    expect(onPin).toHaveBeenCalledWith('p1', false)
  })

  it('nhìn là biết bài nào đang ghim, và thấy nó cả khi chưa rê chuột', () => {
    const { rerender } = render(
      <PostCard post={post({ pinned: false })} onAction={vi.fn()} onEdit={vi.fn()} onCopy={vi.fn()} onMove={vi.fn()} onPin={vi.fn()} />,
    )
    // Không ghim: nút vẫn vẽ đủ viền, chỉ là nền trắng.
    expect(pin().className).toContain('ab-ghost')
    expect(pin()).toHaveAttribute('aria-pressed', 'false')

    rerender(
      <PostCard post={post({ pinned: true })} onAction={vi.fn()} onEdit={vi.fn()} onCopy={vi.fn()} onMove={vi.fn()} onPin={vi.fn()} />,
    )
    // Ghim rồi: nền đặc, khác hẳn phần còn lại của hàng.
    expect(pin().className).toContain('ab-primary')
  })

})

describe('hành động của một dòng', () => {
  const menuButton = () => screen.getByRole('button', { name: 'Hành động khác' })

  it('dòng không còn bày nút hành động nào; chúng nằm sau nút ba chấm', async () => {
    render(<PostCard post={post()} onAction={vi.fn()} onEdit={vi.fn()} onCopy={vi.fn()} onMove={vi.fn()} onPin={vi.fn()} />)
    // Nút "Sửa" bỏ hẳn — bấm vào dòng là vào màn sửa.
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
    expect(screen.queryByText('Nhân bản')).toBeNull()
    expect(screen.queryByText('Bỏ đăng')).toBeNull()

    await userEvent.click(menuButton())
    expect(screen.getByRole('menuitem', { name: 'Nhân bản' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Bỏ đăng' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Xoá' }).className).toContain('ab-menuitem-danger')
  })

  it('bấm vào dòng là vào màn sửa; bấm vào tiêu đề cũng vậy', async () => {
    const onEdit = vi.fn()
    render(<PostCard post={post()} onAction={vi.fn()} onEdit={onEdit} onCopy={vi.fn()} onMove={vi.fn()} onPin={vi.fn()} />)

    await userEvent.click(screen.getByText('mô tả'))
    expect(onEdit).toHaveBeenCalledWith('p1')

    onEdit.mockClear()
    // Tiêu đề là nút thật, để bàn phím và trình đọc màn hình có chỗ bấm có tên.
    await userEvent.click(screen.getByRole('button', { name: 'Sensory Lexicon' }))
    expect(onEdit).toHaveBeenCalledWith('p1')
  })

  it('bấm nút ghim hay nút ba chấm thì KHÔNG vào màn sửa', async () => {
    const onEdit = vi.fn()
    const onPin = vi.fn()
    render(<PostCard post={post()} onAction={vi.fn()} onEdit={onEdit} onCopy={vi.fn()} onMove={vi.fn()} onPin={onPin} />)

    await userEvent.click(screen.getByRole('button', { name: /ghim/i }))
    expect(onPin).toHaveBeenCalled()
    expect(onEdit).not.toHaveBeenCalled()

    await userEvent.click(menuButton())
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('“Nhân bản” gọi onCopy, không phải một phép đổi trạng thái', async () => {
    const onCopy = vi.fn()
    const onAction = vi.fn()
    render(<PostCard post={post()} onAction={onAction} onEdit={vi.fn()} onCopy={onCopy} onMove={vi.fn()} onPin={vi.fn()} />)

    await userEvent.click(menuButton())
    await userEvent.click(screen.getByRole('menuitem', { name: 'Nhân bản' }))
    expect(onCopy).toHaveBeenCalledWith('p1')
    expect(onAction).not.toHaveBeenCalled()
  })

  /*
   * Chủ site: *"đang không có nút nào giúp tôi làm điều đó cả"* — trước đây
   * chuyển bài sang module khác là xoá đi rồi tạo lại và chép tay nội dung.
   */
  it('“Chuyển sang module…” gọi onMove, không phải một phép đổi trạng thái', async () => {
    const onMove = vi.fn()
    const onAction = vi.fn()
    render(<PostCard post={post()} onAction={onAction} onEdit={vi.fn()} onCopy={vi.fn()} onMove={onMove} onPin={vi.fn()} />)

    await userEvent.click(menuButton())
    await userEvent.click(screen.getByRole('menuitem', { name: 'Chuyển sang module…' }))
    expect(onMove).toHaveBeenCalledWith('p1')
    expect(onAction).not.toHaveBeenCalled()
  })

  it('chọn xong thì menu đóng lại, và Esc cũng đóng', async () => {
    render(<PostCard post={post()} onAction={vi.fn()} onEdit={vi.fn()} onCopy={vi.fn()} onMove={vi.fn()} onPin={vi.fn()} />)

    await userEvent.click(menuButton())
    await userEvent.click(screen.getByRole('menuitem', { name: 'Lưu trữ' }))
    expect(screen.queryByRole('menu')).toBeNull()

    await userEvent.click(menuButton())
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('dòng preview dưới tiêu đề', () => {
  const render1 = (over: Partial<PostSummary>) =>
    render(<PostCard post={post(over)} onAction={vi.fn()} onEdit={vi.fn()} onCopy={vi.fn()} onMove={vi.fn()} onPin={vi.fn()} />)

  it('lấy câu mở đầu bài khi bài có', () => {
    render1({ lead: 'Vị giác nhận ra nhiều thứ hơn cái lưỡi gọi tên được.', vi: 'mô tả tay' })
    expect(screen.getByText('Vị giác nhận ra nhiều thứ hơn cái lưỡi gọi tên được.')).toBeInTheDocument()
    // Không vẽ cả hai: một bài một dòng mô tả.
    expect(screen.queryByText('mô tả tay')).not.toBeInTheDocument()
  })

  it('rơi về mô tả tự viết khi bài chưa có câu mở đầu', () => {
    render1({ lead: null, vi: 'mô tả tay' })
    expect(screen.getByText('mô tả tay')).toBeInTheDocument()
  })

  /*
   * Cùng một hàm với danh sách ngoài site (`postDescription`). Đây là lý do
   * dùng hàm chung thay vì đọc thẳng trường: quản trị và trang đọc không được
   * phép nói khác nhau về cùng một bài.
   */
  it('câu mở đầu toàn khoảng trắng không tính là có', () => {
    render1({ lead: '   ', vi: 'mô tả tay' })
    expect(screen.getByText('mô tả tay')).toBeInTheDocument()
  })
})
