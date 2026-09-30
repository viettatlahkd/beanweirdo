// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { EditorCanvas } from './Editor'
import { FramingProvider } from '../components/framing'

/*
 * Khối ảnh trong thân bài (2026-09-24).
 *
 * Trước đây ô thả ảnh cao cứng 160px, khung căn khoá theo dải ngang ấy, và
 * không có cách nào gỡ tấm ảnh ra ngoài xoá cả khối. Chủ site: *"logic đang cố
 * định khung ngang >> mở thành tuỳ biến, cho phép user tự crop"* và *"cho phép
 * xoá ảnh >> sau xoá layout thành cho phép viết text trên nền trắng"*.
 */

const uploadImage = vi.fn(async () => ({ url: 'https://x/moi.jpg' }))
vi.mock('../lib/apiClient', async (orig) => ({
  ...(await orig<object>()),
  uploadImage: (...a: [File]) => uploadImage(...a),
}))

class FakeImage {
  onload: (() => void) | null = null
  naturalWidth = 2000
  naturalHeight = 1000
  set src(_: string) {
    queueMicrotask(() => this.onload?.())
  }
}
vi.stubGlobal('Image', FakeImage)

const memo = (imageUrl: string | null) =>
  ({
    id: 'p1',
    module_id: 'sensory',
    en: 'Tiêu đề',
    vi: 'Mô tả',
    kind: 'note',
    template: 'memo',
    date_label: '2026.08',
    status: 'draft',
    body: { elements: [{ type: 'image', caption: 'chú thích', imageUrl }] },
    lead: null,
    hero_image_url: null,
    hero_caption: null,
    plate_images: null,
    pull_quote: null,
    further_reading: [],
    sort_order: null,
    pinned: false,
    created_at: '',
    updated_at: '',
    published_at: null,
  }) as never

const draw = (imageUrl: string | null, onChange = vi.fn()) => {
  render(
    <FramingProvider>
      <EditorCanvas template="memo" post={memo(imageUrl)} onChange={onChange} onHeroDrop={vi.fn()} />
    </FramingProvider>,
  )
  return onChange
}

describe('khối ảnh trong thân bài', () => {
  it('ảnh đã cắt mang đúng hình đã cắt, không còn dải ngang cố định', () => {
    draw('https://x/a.jpg#crop=0,0,50,100,1')
    const drop = screen.getByTestId('image-block-drop')
    expect(drop.style.aspectRatio).toBe('1')
    expect(drop.style.height).toBe('')
  })

  it('tải ảnh lên là mở hộp cắt tay', async () => {
    draw(null)
    const drop = screen.getByTestId('image-block-drop')
    const input = drop.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByText('Cắt ảnh')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Tự do' })).toBeInTheDocument()
  })

  it('có nút đặt link và nút cắt lại ngay ở góc khối', () => {
    draw('https://x/a.jpg')
    const drop = screen.getByTestId('image-block-drop')
    expect(within(drop).getByRole('button', { name: 'đặt link' })).toBeInTheDocument()
    expect(within(drop).getByRole('button', { name: 'đặt vào khung' })).toBeInTheDocument()
  })

  it('ảnh đã đặt thì có ô link đích để người đọc bấm vào ảnh; chưa có ảnh thì không', () => {
    const { unmount } = render(
      <FramingProvider>
        <EditorCanvas template="memo" post={memo('https://x/a.jpg')} onChange={vi.fn()} onHeroDrop={vi.fn()} />
      </FramingProvider>,
    )
    expect(document.body.innerHTML).toContain('link khi bấm vào ảnh (tuỳ chọn)')
    unmount()
    draw(null)
    expect(document.body.innerHTML).not.toContain('link khi bấm vào ảnh')
  })

  it('gỡ ảnh thì khối thành một đoạn chữ trống để viết tiếp', () => {
    const onChange = draw('https://x/a.jpg')
    fireEvent.click(within(screen.getByTestId('image-block-drop')).getByRole('button', { name: 'gỡ ảnh khỏi ô này' }))
    const body = onChange.mock.calls.at(-1)![0].body as { elements: unknown[] }
    expect(body.elements[0]).toEqual({ type: 'paragraph', text: '' })
  })
})
