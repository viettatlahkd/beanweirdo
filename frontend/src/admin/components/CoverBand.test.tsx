// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CoverBand } from './CoverBand'

/*
 * Ảnh bìa hiện đúng một chỗ.
 *
 * Chủ site, khi thấy băng này bày cùng lúc với ô ảnh bìa của template: *"hiện
 * 1 chỗ thôi chứ?"*. Bài kiểm về chỗ đặt băng nằm ở
 * `Editor.plates.test.tsx`; ở đây là bản thân cái băng.
 */

const props = {
  imageUrl: null,
  onPick: vi.fn(),
  onLink: vi.fn(),
  onReframe: vi.fn(),
  onClear: vi.fn(),
}

const buttons = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))

describe('ô trang bìa', () => {
  it('gọi tên là "trang bìa" và nói rõ khi chưa có ảnh', () => {
    render(<CoverBand {...props} />)
    expect(screen.getByText('trang bìa')).toBeInTheDocument()
    expect(screen.getByText('chưa có ảnh trang bìa')).toBeInTheDocument()
  })

  it('chưa có ảnh thì chỉ có hai lối đưa ảnh vào', () => {
    const { container } = render(<CoverBand {...props} />)
    expect(buttons(container)).toEqual(['tải ảnh lên', 'đặt link'])
  })

  it('có ảnh thì đủ bốn việc', () => {
    const { container } = render(<CoverBand {...props} imageUrl="https://x/a.jpg" />)
    expect(buttons(container)).toEqual([
      'tải ảnh lên',
      'đặt link',
      'đặt vào khung',
      'gỡ ảnh khỏi ô này',
    ])
  })

  it('vẽ ảnh bằng điểm căn, không neo vào góc trên-trái', () => {
    const { container } = render(<CoverBand {...props} imageUrl="https://x/a.jpg#focus=0,100" />)
    const band = container.querySelector<HTMLElement>('[data-cover-band]')
    expect(band).not.toBeNull()
    expect(band!.style.backgroundImage).toBe('url("https://x/a.jpg")')
    expect(band!.style.backgroundPosition).toBe('0% 100%')
  })

  it('clip vẽ bằng thẻ video, và không mời căn khung', () => {
    const { container } = render(<CoverBand {...props} imageUrl="https://x/c.webm" onReframe={undefined} />)
    expect(container.querySelector('video')).not.toBeNull()
    expect(container.querySelector<HTMLElement>('[data-cover-band]')!.style.backgroundImage).toBe('')
    expect(buttons(container)).not.toContain('đặt vào khung')
  })

  it('rộng hết khung sửa, không co lại theo trần chiều cao', () => {
    /*
     * Chủ site chụp màn hình một cái băng rộng 573px giữa khung sửa rộng
     * 1320px: để `width` là `auto` thì trình duyệt suy bề ngang ngược lại từ
     * `maxHeight` qua `aspectRatio`. jsdom không tự tính ra chỗ ấy, nên bài
     * kiểm hỏi thẳng cái thuộc tính đã sửa — bỏ nó đi là lỗi quay lại y hệt.
     */
    const { container } = render(<CoverBand {...props} />)
    const band = container.querySelector<HTMLElement>('[data-cover-band]')!
    expect(band.style.width).toBe('100%')
    expect(band.style.maxHeight).toBe('420px')
  })

  it('thả tệp lên băng cũng là đặt ảnh bìa', () => {
    const onPick = vi.fn()
    const { container } = render(<CoverBand {...props} onPick={onPick} />)
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    fireEvent.drop(container.querySelector('[data-cover-band]')!, {
      dataTransfer: { files: [file] },
    })
    // Hình dạng băng đi kèm để mở khung cắt cho đúng khổ. jsdom không dựng
    // dàn trang nên đo ra 0 và hàm trả `null` — đúng đường thoát an toàn.
    expect(onPick).toHaveBeenCalledWith(file, null)
  })
})
