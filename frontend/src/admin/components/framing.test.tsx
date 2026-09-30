// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FramingProvider } from './framing'
import { PlateImageUpload } from './PlateUpload'
import { readCrop } from '../../lib/imageFocus'

/*
 * "Tải ảnh lên ở đâu cũng ra cùng một khung cắt."
 *
 * Trước đây chỉ ảnh bìa mở khung cắt; nút ở góc mỗi ô ảnh cố định tải xong là
 * đặt thẳng. Cùng một thao tác, hai kết quả, tuỳ đang đứng ở ô nào — chính chỗ
 * chủ site kêu. Bài kiểm này neo vào đường đi của nút ở góc ô, vì đó là đường
 * đông chỗ dùng nhất: mười một ô ảnh cố định trên sáu khuôn bài đều đi qua
 * `PlateImageUpload`.
 */

const uploadImage = vi.fn(async () => ({ url: 'https://x/moi.jpg' }))
vi.mock('../lib/apiClient', () => ({
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

/**
 * Dựng một ô ảnh thật: có mốc toạ độ, có dấu `data-plate-corner`, đúng cái
 * `PlateUpload` phải lần ngược lên để đo hình dạng ô.
 */
function Cell({ onUrl }: { onUrl: (url: string) => void }) {
  return (
    <div style={{ position: 'relative', width: 300, height: 200 }}>
      <div data-plate-corner="primary" style={{ position: 'absolute' }}>
        <PlateImageUpload imageUrl={null} name="Ảnh chính" onUrl={onUrl} />
      </div>
    </div>
  )
}

const pick = (file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })) => {
  const input = document.querySelector('input[type=file]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('mọi chỗ đăng ảnh mở cùng một khung cắt', () => {
  it('nút ở góc ô ảnh: tải xong là khung cắt hiện ra', async () => {
    render(
      <FramingProvider>
        <Cell onUrl={vi.fn()} />
      </FramingProvider>,
    )
    pick()
    expect(await screen.findByText('Cắt ảnh')).toBeInTheDocument()
    // Tên ô đi theo, để biết đang căn cho chỗ nào.
    expect(screen.getByText('Ảnh chính')).toBeInTheDocument()
  })

  it('bấm Xong thì địa chỉ kèm khung cắt mới về tới ô', async () => {
    const onUrl = vi.fn()
    render(
      <FramingProvider>
        <Cell onUrl={onUrl} />
      </FramingProvider>,
    )
    pick()
    await screen.findByText('Cắt ảnh')

    // "Vừa ô" chọn sẵn: bấm Xong ngay là đúng hình ô (jsdom không đo được ô, nên 3:2).
    expect(screen.getByRole('radio', { name: 'Vừa ô' })).toHaveAttribute('aria-checked', 'true')
    const done = screen.getByText('Xong')
    await waitFor(() => expect(done).toBeEnabled())
    fireEvent.click(done)
    await waitFor(() => expect(onUrl).toHaveBeenCalled())
    const c = readCrop(onUrl.mock.calls[0][0])!
    expect(c.ratio).toBeCloseTo(1.5)
    expect(c.x).toBeCloseTo(12.5)
  })

  it('bấm Huỷ là huỷ việc căn, không phải huỷ tấm ảnh', async () => {
    const onUrl = vi.fn()
    render(
      <FramingProvider>
        <Cell onUrl={onUrl} />
      </FramingProvider>,
    )
    pick()
    await screen.findByText('Cắt ảnh')

    fireEvent.click(screen.getByText('Huỷ'))
    await waitFor(() => expect(onUrl).toHaveBeenCalledWith('https://x/moi.jpg'))
    expect(screen.queryByText('Cắt ảnh')).not.toBeInTheDocument()
  })

  it('clip thì không mở khung cắt — căn tâm một hình đang chạy là vô nghĩa', async () => {
    uploadImage.mockResolvedValueOnce({ url: 'https://x/clip.mp4' })
    const onUrl = vi.fn()
    render(
      <FramingProvider>
        <Cell onUrl={onUrl} />
      </FramingProvider>,
    )
    pick(new File(['x'], 'a.mp4', { type: 'video/mp4' }))
    await waitFor(() => expect(onUrl).toHaveBeenCalledWith('https://x/clip.mp4'))
    expect(screen.queryByText('Cắt ảnh')).not.toBeInTheDocument()
  })
})
