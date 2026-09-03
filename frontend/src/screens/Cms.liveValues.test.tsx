import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SITE_DEFAULTS } from '../content/site'

/*
 * Ô chữ trong CMS phải hiện nội dung thật, không phải chữ mặc định trong mã.
 *
 * Ô nhập là `defaultValue`, mà React chỉ đọc nó đúng một lần lúc vẽ ô ra. Biểu
 * mẫu vẽ ngay khi mở màn, còn nội dung thật về sau một nhịp mạng — nên mọi ô
 * đứng nguyên ở chữ mặc định. Trang công khai hiện bản mới, CMS hiện bản cũ, và
 * không ô nào sai chính tả để mà ngờ; chủ site phản hồi ba bốn lần cùng một
 * chuyện trước khi tìm ra chỗ này.
 *
 * Test cũ không bắt được vì nó dựng lại một ô nhập rút gọn để kiểm hành vi lưu,
 * chứ không chạy `Cms` thật. Một bản dựng lại thì không thể sai giống bản thật.
 * Test này chạy đúng màn hình ấy.
 */

const getSite = vi.fn()
vi.mock('../admin/lib/apiClient', () => ({
  getSite: (...a: unknown[]) => getSite(...a),
  listModules: () => Promise.resolve([]),
  listPosts: () => Promise.resolve([]),
  listTemplates: () => Promise.resolve([]),
  updateSite: (p: unknown) => Promise.resolve(p),
  createModule: vi.fn(), deleteModule: vi.fn(), reorderModules: vi.fn(),
  reorderPosts: vi.fn(), updateModule: vi.fn(), updatePost: vi.fn(),
  uploadImage: vi.fn(), transitionStatus: vi.fn(),
}))
vi.mock('../lib/nav', () => ({ useNav: () => ({ openArticle: vi.fn(), goHome: vi.fn() }) }))

const { Cms } = await import('./Cms')

describe('CMS hiện nội dung thật', () => {
  it('ô chữ đổi theo dữ liệu về sau, không đứng ở chữ mặc định', async () => {
    // Nội dung chủ site đã lưu — khác hẳn chữ mặc định trong mã.
    const daLuu = 'Ba mạch chính: cảm quan, lý–hoá–sinh, rang.'
    expect(daLuu).not.toBe(SITE_DEFAULTS.blurb)
    // Giữ mạng lại: biểu mẫu phải vẽ ra *trước* khi nội dung về, đúng như khi
    // mở thẳng tab "Sửa nội dung" trên một đường truyền chậm. Nếu ô chỉ đọc giá
    // trị một lần lúc vẽ, nó đứng mãi ở chữ mặc định.
    let traVe: (v: unknown) => void = () => {}
    getSite.mockReturnValue(new Promise((r) => (traVe = r)))

    render(<Cms />)
    ;(await screen.findByText(/sửa nội dung/i)).click()
    // Ô đã có mặt, mang chữ mặc định, trong lúc mạng còn đang chờ.
    await waitFor(() => expect(screen.queryByDisplayValue(SITE_DEFAULTS.blurb)).not.toBeNull())

    traVe({ blurb: daLuu })

    await waitFor(() => expect(screen.queryByDisplayValue(daLuu)).not.toBeNull())
    expect(screen.queryByDisplayValue(SITE_DEFAULTS.blurb)).toBeNull()
  })
})
