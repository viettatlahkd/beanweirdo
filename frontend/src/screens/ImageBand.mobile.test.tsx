import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleImageFields } from '../admin/moduleForm'
import type { ModuleLayout } from '../content/modules'

/*
 * Dải ảnh module ở khổ dọc — ba điều chủ site chỉ ra khi xem thật trên máy:
 * khe giữa các ô "hơi rời rạc", và dải sensory "lệch layout sang phía trái quá
 * nhiều".
 *
 * jsdom không dựng bố cục nên không đo được pixel ở đây; cái đo được — và cũng
 * là cái sinh ra hai lỗi trên — là lề của từng ô và số ô trong dải. Số đo thật
 * lấy trong trình duyệt ở 375px và ghi lại trong từng bài kiểm.
 */
const isMobile = vi.fn()
vi.mock('../lib/useIsMobile', () => ({ useIsMobile: () => isMobile() }))
vi.mock('../data/useModules', () => ({ useModules: vi.fn(), landingModules: (m: unknown[]) => m }))
vi.mock('../data/usePublishedPosts', () => ({ usePublishedPosts: vi.fn() }))
vi.mock('../data/useSiteCopy', () => ({ useSiteCopy: vi.fn() }))
vi.mock('../lib/nav', () => ({ useNav: vi.fn() }))

class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error test-only stub, not a full IntersectionObserver
global.IntersectionObserver = FakeObserver

const { ImageBand } = await import('./Landing')

const mod = (layout: ModuleLayout): ModuleImageFields =>
  ({
    layout,
    img1: null,
    img2: null,
    img3: null,
    shot1: null,
    shot2: null,
    shot3: null,
    tint: '#FBE7E5',
    tint2: '#F6D2D4',
  }) as unknown as ModuleImageFields

function band(layout: ModuleLayout, mobile: boolean) {
  isMobile.mockReturnValue(mobile)
  const { container } = render(<ImageBand m={mod(layout)} />)
  const grid = container.firstElementChild as HTMLElement
  return { grid, tiles: [...grid.children] as HTMLElement[] }
}

const LAYOUTS: ModuleLayout[] = ['band', 'specimen', 'sequence']

describe('dải ảnh module ở khổ dọc', () => {
  it('khe giữa các ô hẹp lại, chỉ ở khổ dọc', () => {
    // 8px là khe của dải rộng 900+; trên màn 375 mỗi ô chỉ còn hơn trăm pixel
    // nên cùng khe ấy đọc ra thành mấy mảnh rời nhau.
    for (const l of LAYOUTS) {
      expect(band(l, true).grid.style.gap).toBe('5px')
      expect(band(l, false).grid.style.gap).toBe('8px')
    }
  })

  it('không ô nào đội ra ngoài mép phải', () => {
    /*
     * Mép phải của dải đã trùng mép màn (lề âm 20px hai bên), nên một lề phải
     * âm không làm ảnh rộng thêm chỗ nào nhìn thấy được — nó chỉ đẩy tài liệu
     * rộng ra: đo trong trình duyệt trước khi sửa, `scrollWidth` là 389 trên
     * màn 375, tức cả trang cuộn ngang được.
     */
    for (const l of LAYOUTS) {
      for (const tile of band(l, true).tiles) {
        expect(tile.style.marginRight.startsWith('-')).toBe(false)
      }
    }
  })

  it('hai ô cột phải thẳng một mép trái', () => {
    // Ô trên thò ra còn ô dưới thụt vào là cái làm dải đọc ra rời rạc.
    for (const l of LAYOUTS) {
      const tiles = band(l, true).tiles
      expect(tiles[1].style.marginLeft).toBe(tiles[2].style.marginLeft)
    }
  })

  it('dải sensory bỏ sợi màu 14px ở khổ dọc, để ảnh chạm mép phải', () => {
    /*
     * Sợi ấy co còn 14px trên màn 375 và cùng tông với nền khối module, nên nó
     * đọc ra là nền. Kết quả: ảnh dừng ở 353 trong khi mép trái ảnh chạm 0.
     * Khổ ngang vẫn giữ sợi — ở đó nó rộng 30px và đọc ra là hình.
     */
    expect(band('band', true).tiles).toHaveLength(3)
    expect(band('band', true).grid.style.gridTemplateColumns).not.toContain('14px')
    expect(band('band', false).tiles).toHaveLength(4)
  })
})
