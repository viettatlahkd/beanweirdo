import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModulePlates } from './ModuleScreen'

/*
 * Chú thích là tuỳ chọn. Cái nền mờ sau chữ từng được bôi ra dù bên trong rỗng,
 * nên mỗi ảnh chưa đặt chú thích lại có một vệt xám nhỏ ở góc — trang chủ đã
 * làm đúng chuyện này từ lâu, trang module thì chưa.
 */
const scrims = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLElement>('div')).filter((d) => d.style.background.startsWith('rgba(24, 22, 17'))

const mod = (extra: Record<string, unknown>) =>
  ({
    id: 'biochem',
    title: 'biochemistry 101',
    accent: '#7FB87E',
    on_color: '#1F3323',
    layout: 'specimen',
    ...extra,
  }) as never

describe('chú thích ảnh trên trang module', () => {
  it('có ảnh mà chưa có chú thích thì không vẽ vệt nền nào', () => {
    const { container } = render(<ModulePlates m={mod({ page_img1: 'https://x/a.png', page_img2: 'https://x/b.png' })} />)
    expect(scrims(container)).toHaveLength(0)
  })

  it('có chú thích thì vẽ, kèm nền để đọc được trên ảnh', () => {
    const { container } = render(
      <ModulePlates m={mod({ page_img1: 'https://x/a.png', page_shot1: 'mặt cắt' })} />,
    )
    expect(scrims(container).map((d) => d.textContent)).toContain('mặt cắt')
  })
})
