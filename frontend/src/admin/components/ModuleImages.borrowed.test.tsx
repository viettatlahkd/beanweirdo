import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { formShapeOf } from '../moduleForm'
import { ModuleImages } from './ModuleImages'

/*
 * Ô ảnh đang mượn từ Trang chủ vẫn phải đặt được khung — và đó đúng là lúc cần
 * nó nhất: khung ở trang module có hình dạng khác khung trang chủ, nên ảnh mượn
 * hầu như luôn cắt lệch.
 */
// Ô xem trước đo lấy hình dạng ô thật; jsdom không có ResizeObserver.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never
})

const band = formShapeOf({ id: 'sensory', kind: 'normal', layout: 'band' } as never)
const pageGroup = band.images.find((g) => g.columns === 'module-page')!

const draw = (m: Record<string, unknown>) =>
  render(
    <ModuleImages
      m={m as never}
      group={pageGroup}
      onCaption={vi.fn()}
      onUpload={vi.fn()}
      onClear={vi.fn()}
      onPlace={vi.fn()}
      onSwap={vi.fn()}
    />,
  )

describe('ô ảnh mượn từ Trang chủ', () => {
  const borrowed = { id: 'sensory', layout: 'band', img1: 'https://x/homepage.png' }

  it('nói rõ là đang mượn', () => {
    draw(borrowed)
    expect(screen.getByText(/lấy từ Trang chủ/)).toBeInTheDocument()
  })

  it('vẫn đặt được khung', () => {
    draw(borrowed)
    expect(screen.getByText('đặt vào khung')).toBeInTheDocument()
  })

  it('nhưng không có gì của riêng nó để xoá', () => {
    draw(borrowed)
    expect(screen.queryByText('xoá')).not.toBeInTheDocument()
  })

  it('ô chưa có ảnh nào, kể cả để mượn, thì không đặt khung được', () => {
    draw({ id: 'sensory', layout: 'band' })
    expect(screen.queryByText('đặt vào khung')).not.toBeInTheDocument()
  })

  it('ô có ảnh riêng thì xoá được', () => {
    draw({ id: 'sensory', layout: 'band', page_img1: 'https://x/own.png' })
    expect(screen.getByText('đặt vào khung')).toBeInTheDocument()
    expect(screen.getByText('xoá')).toBeInTheDocument()
  })
})
