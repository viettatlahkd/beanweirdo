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
vi.mock('../data/useModules', () => ({
  useModules: () => ({ data: [], loading: false, error: null, postsOf: () => [], reload: () => {} }),
  findPage: () => undefined,
}))
vi.mock('../admin/lib/apiClient', () => ({
  getSite: (...a: unknown[]) => getSite(...a),
  listModules: () => Promise.resolve([]),
  listPosts: () => Promise.resolve([]),
  listTemplates: () => Promise.resolve([]),
  updateSite: (p: unknown) => Promise.resolve(p),
  // Bảng tag nằm cùng tab "Nội dung trang"; không giả lập thì màn không dựng nổi.
  listTags: () => Promise.resolve([]),
  createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn(),
  // Cây chủ đề và tag theme cũng nằm ở tab này (migration 0027).
  listTopics: () => Promise.resolve([]),
  // Quản lý trang (bước 3c) đọc tầng feature.
  getLayout: () => Promise.resolve({ pages: [], overrides: [], rules: [] }),
  listKeywords: () => Promise.resolve([]),
  createModule: vi.fn(), deleteModule: vi.fn(), reorderModules: vi.fn(),
  reorderPosts: vi.fn(), updateModule: vi.fn(), updatePost: vi.fn(),
  uploadImage: vi.fn(), transitionStatus: vi.fn(),
}))
/*
 * Tab nằm trong địa chỉ, nên `nav` phải nhớ được tab vừa bấm — một object đứng
 * yên thì bấm sang "Nội dung trang" không đi tới đâu. `useNav` là hook, nên nó
 * giữ state ngay trong màn đang gọi nó.
 */
vi.mock('../lib/nav', async () => {
  const { useState } = await import('react')
  return {
    useNav: () => {
      const [cmsTab, goCms] = useState('posts')
      return { cmsTab, goCms, openArticle: vi.fn(), goHome: vi.fn() }
    },
  }
})

const { Cms } = await import('./Cms')

describe('CMS hiện nội dung thật', () => {
  it('ô chữ đổi theo dữ liệu về sau, không đứng ở chữ mặc định', async () => {
    // Nội dung chủ site đã lưu — khác hẳn chữ mặc định trong mã.
    const daLuu = 'Ba mạch chính: cảm quan, lý–hoá–sinh, rang.'
    expect(daLuu).not.toBe(SITE_DEFAULTS.blurb)
    // Giữ mạng lại: biểu mẫu phải vẽ ra *trước* khi nội dung về, đúng như khi
    // mở thẳng tab "Nội dung trang" trên một đường truyền chậm. Nếu ô chỉ đọc giá
    // trị một lần lúc vẽ, nó đứng mãi ở chữ mặc định.
    let traVe: (v: unknown) => void = () => {}
    getSite.mockReturnValue(new Promise((r) => (traVe = r)))

    render(<Cms />)
    // Chữ của Mục lục nằm trong chính trang ấy ở Quản lý trang.
    ;(await screen.findByText(/^quản lý trang$/i)).click()
    const muclu = await screen.findByText('Mục lục', { selector: 'span' })
    ;(muclu.parentElement!.querySelector('button') as HTMLButtonElement).click()
    // Ô đã có mặt, mang chữ mặc định, trong lúc mạng còn đang chờ.
    await waitFor(() => expect(screen.queryByDisplayValue(SITE_DEFAULTS.blurb)).not.toBeNull())

    traVe({ blurb: daLuu })

    await waitFor(() => expect(screen.queryByDisplayValue(daLuu)).not.toBeNull())
    expect(screen.queryByDisplayValue(SITE_DEFAULTS.blurb)).toBeNull()
  })
})
