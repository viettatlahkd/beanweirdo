// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CropPicker, dragRect, fitRect } from './CropPicker'
import { readCrop } from '../../lib/imageFocus'

/*
 * Hộp cắt tay của khối ảnh trong thân bài. Mọi số đo tính bằng phần trăm của
 * chính tấm ảnh — jsdom thì mọi thứ rộng 0, nên phần kéo chuột kiểm ở hàm
 * thuần, phần hộp thoại kiểm ở chỗ nó ghi gì ra.
 */

class FakeImage {
  onload: (() => void) | null = null
  naturalWidth = 2000
  naturalHeight = 1000
  set src(_: string) {
    queueMicrotask(() => this.onload?.())
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('phép tính khung cắt', () => {
  it('hình vuông trên ảnh 2:1 chiếm nửa bề ngang, đứng giữa', () => {
    expect(fitRect(1, 2)).toEqual({ x: 25, y: 0, w: 50, h: 100 })
  })

  it('kéo góc dưới-phải: góc trên-trái đứng yên', () => {
    const r = dragRect({ x: 10, y: 10, w: 40, h: 40 }, 'se', 10, 5, null, 1)
    expect(r).toEqual({ x: 10, y: 10, w: 50, h: 45 })
  })

  it('kéo góc trên-trái: góc dưới-phải đứng yên', () => {
    const r = dragRect({ x: 10, y: 10, w: 40, h: 40 }, 'nw', -5, -5, null, 1)
    expect(r).toEqual({ x: 5, y: 5, w: 45, h: 45 })
  })

  it('khoá tỉ lệ: co giãn vẫn giữ đúng hình, dừng ở mép ảnh', () => {
    // Ảnh vuông, khoá 2:1 — chiều cao luôn bằng nửa chiều ngang.
    const r = dragRect({ x: 0, y: 0, w: 40, h: 20 }, 'se', 20, 0, 2, 1)
    expect(r.w).toBeCloseTo(60)
    expect(r.h).toBeCloseTo(30)
    const edge = dragRect({ x: 0, y: 80, w: 20, h: 10 }, 'se', 80, 0, 2, 1)
    // Chỉ còn 20 điểm chiều dọc, nên chiều ngang dừng ở 40.
    expect(edge.h).toBeCloseTo(20)
    expect(edge.w).toBeCloseTo(40)
  })

  it('dời khung không cho nó chạy ra ngoài ảnh', () => {
    expect(dragRect({ x: 50, y: 50, w: 40, h: 40 }, 'move', 30, -80, null, 1)).toEqual({ x: 60, y: 0, w: 40, h: 40 })
  })
})

describe('hộp cắt ghi gì ra', () => {
  it('mặc định giữ nguyên cả tấm, hình dạng đúng hình ảnh', async () => {
    vi.stubGlobal('Image', FakeImage)
    const onSave = vi.fn()
    render(<CropPicker url="https://x/a.jpg" name="Khối ảnh" onCancel={vi.fn()} onSave={onSave} />)
    const done = screen.getByRole('button', { name: 'Xong' })
    await waitFor(() => expect(done).toBeEnabled())
    fireEvent.click(done)
    expect(readCrop(onSave.mock.calls[0][0])).toEqual({ x: 0, y: 0, w: 100, h: 100, ratio: 2 })
  })

  it('ô ảnh của khuôn bài mở với "Vừa ô" chọn sẵn, Xong ngay là đúng hình ô cũ', async () => {
    vi.stubGlobal('Image', FakeImage)
    const onSave = vi.fn()
    render(<CropPicker url="https://x/a.jpg" name="Ô ảnh" cell={1} onCancel={vi.fn()} onSave={onSave} />)
    expect(screen.getByRole('radio', { name: 'Vừa ô' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '16:9' })).toBeInTheDocument()
    const done = screen.getByRole('button', { name: 'Xong' })
    await waitFor(() => expect(done).toBeEnabled())
    fireEvent.click(done)
    const c = readCrop(onSave.mock.calls[0][0])!
    expect(c.ratio).toBeCloseTo(1)
    expect(c.x).toBe(25)
  })

  it('chọn 1:1 thì khung thành vuông trên trang', async () => {
    vi.stubGlobal('Image', FakeImage)
    const onSave = vi.fn()
    render(<CropPicker url="https://x/a.jpg" name="Khối ảnh" onCancel={vi.fn()} onSave={onSave} />)
    const done = screen.getByRole('button', { name: 'Xong' })
    await waitFor(() => expect(done).toBeEnabled())
    fireEvent.click(screen.getByRole('radio', { name: '1:1' }))
    fireEvent.click(done)
    const c = readCrop(onSave.mock.calls[0][0])!
    expect(c.ratio).toBeCloseTo(1)
    expect(c.w).toBe(50)
    expect(c.x).toBe(25)
  })

  it('mở lại ảnh đã cắt thì khung đứng đúng chỗ cũ', async () => {
    vi.stubGlobal('Image', FakeImage)
    render(<CropPicker url="https://x/a.jpg#crop=10,20,30,40,1.5" name="Khối ảnh" onCancel={vi.fn()} onSave={vi.fn()} />)
    const s = screen.getByTestId('crop-frame').style
    expect([s.left, s.top, s.width, s.height]).toEqual(['10%', '20%', '30%', '40%'])
  })
})
