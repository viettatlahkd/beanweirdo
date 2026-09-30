// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FocusPicker } from './FocusPicker'

/*
 * Khung cắt ảnh: hình chữ nhật sáng nằm đâu trên tấm ảnh.
 *
 * Bản cũ bày tấm ảnh **đã cắt sẵn** — nhìn thấy gì là giữ đúng ngần ấy, phần
 * bỏ đi không có trên màn hình. Bản này bày cả tấm, làm mờ phần bỏ đi, và ô
 * sáng là phần giữ lại. Nên phép tính đổi hẳn: trước đo ảnh tràn ra ngoài
 * khung bao nhiêu, nay đo khung còn chạy được trong ảnh bao nhiêu.
 *
 * Số đo ở đây tính bằng phần trăm của chính tấm ảnh, nên không phụ thuộc hộp
 * thoại rộng bao nhiêu — và jsdom thì mọi thứ rộng 0, nên đó là điều kiện để
 * kiểm được gì cả.
 */

/** jsdom không tải ảnh thật, nên `naturalWidth` phải tự dựng. */
function stubImage(w: number, h: number) {
  class FakeImage {
    onload: (() => void) | null = null
    naturalWidth = w
    naturalHeight = h
    set src(_: string) {
      // Gọi ở lượt vi-task kế tiếp cho giống trình duyệt: React phải kịp gắn
      // `onload` trước khi nó bắn.
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', FakeImage)
}

const box = (testId: string) => screen.getByTestId(testId).style

beforeEach(() => {
  vi.unstubAllGlobals()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const draw = (props: Partial<Parameters<typeof FocusPicker>[0]> = {}) =>
  render(
    <FocusPicker
      url="https://x/a.jpg"
      name="Ảnh chính"
      ratio={1}
      onCancel={vi.fn()}
      onSave={vi.fn()}
      {...props}
    />,
  )

describe('khung cắt nằm ở đâu trên tấm ảnh', () => {
  it('ảnh ngang hơn ô: khung cao hết ảnh, hẹp lại, và chạy ngang được', async () => {
    stubImage(2000, 1000) // 2:1, vào ô vuông
    draw({ ratio: 1 })
    await screen.findByTestId('focus-frame')

    const s = box('focus-frame')
    expect(s.height).toBe('100%')
    // Ô vuông trên tấm ảnh 2:1 chiếm đúng một nửa chiều ngang.
    expect(s.width).toBe('50%')
    // Điểm căn mặc định là giữa, nên khung đứng giữa phần còn lại.
    expect(s.left).toBe('25%')
    expect(s.top).toBe('0%')
  })

  it('ảnh dọc hơn ô: khung rộng hết ảnh, thấp lại, và chạy dọc được', async () => {
    stubImage(1000, 2000) // 1:2, vào ô vuông
    draw({ ratio: 1 })
    await screen.findByTestId('focus-frame')

    const s = box('focus-frame')
    expect(s.width).toBe('100%')
    expect(s.height).toBe('50%')
    expect(s.top).toBe('25%')
    expect(s.left).toBe('0%')
  })

  it('ảnh đúng hình ô: khung phủ kín, không có gì để chọn', async () => {
    stubImage(1200, 800)
    draw({ ratio: 1.5 })
    await screen.findByTestId('focus-frame')

    const s = box('focus-frame')
    expect(s.width).toBe('100%')
    expect(s.height).toBe('100%')
    // Không kéo được thì con trỏ không được mời kéo.
    expect(box('focus-stage').cursor).toBe('default')
  })

  it('nền là cả tấm ảnh, không phải hình đã cắt', async () => {
    stubImage(2000, 1000)
    draw({ ratio: 1 })
    await screen.findByTestId('focus-frame')

    const s = box('focus-stage')
    // `contain` là chỗ khác bản cũ: bản cũ dùng `cover`, tức đã cắt mất rồi.
    expect(s.backgroundSize).toBe('contain')
    expect(s.backgroundImage).toContain('a.jpg')
  })
})

describe('nút căn sát mép', () => {
  it('chỉ bật trục thật sự chọn được', async () => {
    stubImage(2000, 1000) // chỉ chạy ngang
    draw({ ratio: 1 })
    await screen.findByTestId('focus-frame')

    expect(screen.getByLabelText('Sát trái')).toBeEnabled()
    expect(screen.getByLabelText('Sát trên')).toBeDisabled()
  })

  it('bấm "Sát phải" thì khung dời hẳn sang mép phải', async () => {
    stubImage(2000, 1000)
    draw({ ratio: 1 })
    await screen.findByTestId('focus-frame')

    fireEvent.click(screen.getByLabelText('Sát phải'))
    expect(box('focus-frame').left).toBe('50%')
  })

  it('điểm căn đi kèm địa chỉ ảnh khi bấm Xong', async () => {
    stubImage(2000, 1000)
    const onSave = vi.fn()
    draw({ ratio: 1, onSave })
    await screen.findByTestId('focus-frame')

    fireEvent.click(screen.getByLabelText('Sát trái'))
    fireEvent.click(screen.getByText('Xong'))
    expect(onSave).toHaveBeenCalledWith('https://x/a.jpg#focus=0,50')
  })

  it('giữa là mặc định nên không ghi gì vào địa chỉ', async () => {
    stubImage(2000, 1000)
    const onSave = vi.fn()
    draw({ ratio: 1, onSave })
    await screen.findByTestId('focus-frame')

    fireEvent.click(screen.getByText('Xong'))
    expect(onSave).toHaveBeenCalledWith('https://x/a.jpg')
  })
})

describe('những khung khác cùng tấm ảnh', () => {
  it('cùng đổi theo một điểm căn', async () => {
    stubImage(2000, 1000)
    const { container } = draw({
      ratio: 1,
      previews: [
        { label: 'dải · 172×130', ratio: 172 / 130 },
        { label: 'specimen · 3:2', ratio: 3 / 2 },
      ],
    })
    await screen.findByTestId('focus-frame')

    fireEvent.click(screen.getByLabelText('Sát phải'))
    const drawn = Array.from(container.querySelectorAll('div')).filter(
      (el) => el.style.backgroundPosition === '100% 50%',
    )
    // Hai ô xem trước, cộng không ô nào khác: ô chính vẽ bằng khung sáng chứ
    // không bằng `background-position`.
    expect(drawn).toHaveLength(2)
  })
})

describe('đóng lại', () => {
  it('Esc là huỷ', async () => {
    stubImage(2000, 1000)
    const onCancel = vi.fn()
    draw({ onCancel })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})
