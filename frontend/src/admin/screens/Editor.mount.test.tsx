import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PostDetail } from '../lib/apiClient'

/*
 * Bấm "Sửa" một bài rồi màn trắng xoá.
 *
 * `EditorContent` gọi `useState` cho khung căn ảnh ở DƯỚI chỗ thoát sớm khi
 * `post` còn null. Lượt vẽ đầu chạy bốn hook, tải xong bài thì lượt sau chạy
 * năm — React đếm không khớp là ném "Rendered more hooks than during the
 * previous render" và cả cây đổ. Nghĩa là bài nào cũng trắng, không riêng bài
 * nào.
 *
 * 964 bài kiểm xanh mà lỗi vẫn sống được, vì mọi bài kiểm cũ đều dựng
 * `EditorCanvas` — cái ruột đã có sẵn bài trong tay — chứ chưa bài nào dựng cả
 * màn hình và đi qua đúng bước null → có bài. Bài kiểm này đi bước ấy.
 */
const getPost = vi.fn()
const listModules = vi.fn()
vi.mock('../lib/apiClient', async () => {
  const real = await vi.importActual<typeof import('../lib/apiClient')>('../lib/apiClient')
  return {
    ...real,
    getPost: (...a: unknown[]) => getPost(...a),
    listModules: (...a: unknown[]) => listModules(...a),
    updatePost: vi.fn(async () => undefined),
    uploadImage: vi.fn(async () => ({ url: '' })),
  }
})
vi.mock('../../lib/nav', () => ({ useNav: () => ({ editPost: vi.fn(), previewPost: vi.fn(), goCms: vi.fn() }) }))

const { Editor } = await import('./Editor')

const post = {
  id: 'p1',
  module_id: 'ghi01',
  en: 'taste modality: sơn la',
  vi: 'mô tả',
  kind: 'note',
  date_label: '2026.08',
  status: 'published',
  template: 'memo',
  hero_image_url: null,
  theme_color: null,
  thumbnail_url: null,
  sort_order: 0,
  pinned: false,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  published_at: '2026-08-01T00:00:00Z',
  slug: 'taste-modality',
  body: { specs: [], sections: [] },
  hero_caption: null,
  lead: null,
  pull_quote: null,
  further_reading: null,
  deleted_at: null,
  previous_status: null,
} as unknown as PostDetail

describe('màn sửa bài', () => {
  it('vẽ được bài sau khi tải xong, không đổ giữa chừng', async () => {
    // Trả về qua promise chứ không trả thẳng: phải có đúng một lượt vẽ với
    // `post` còn null thì mới tái hiện được lỗi.
    getPost.mockReturnValue(Promise.resolve(post))
    listModules.mockReturnValue(Promise.resolve([{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0' }]))

    render(<Editor postId="p1" />)
    expect(screen.getByText('Đang tải...')).toBeTruthy()

    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    expect(screen.getByDisplayValue('taste modality: sơn la')).toBeTruthy()
  })

  /*
   * Thanh "ảnh bìa: tải ảnh lên – đặt link – đặt vào khung – xoá" ở đầu khung
   * sửa đã bỏ. Bốn việc của nó không bỏ, chúng chuyển vào băng "trang bìa" —
   * nên bốn bài kiểm dưới đây vẫn hỏi đúng những câu cũ, chỉ hỏi ở chỗ mới.
   *
   * Hỏi bằng `aria-label`: nút ở góc ô là nút icon, không có chữ để đọc, và
   * cái tên đọc lên được chính là thứ phải giữ.
   */
  const coverBand = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-cover-band] button')).map((b) =>
      b.getAttribute('aria-label'),
    )

  it('không còn thanh đặt ảnh ở đầu khung sửa', async () => {
    getPost.mockReturnValue(Promise.resolve({ ...post, hero_image_url: 'https://x/a.jpg' }))
    listModules.mockReturnValue(Promise.resolve([{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0' }]))

    render(<Editor postId="p1" />)
    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    expect(screen.queryByText('ảnh bìa:')).toBeNull()
    expect(screen.queryByText('ảnh body 1:')).toBeNull()
  })

  it('clip thì không mời căn khung ảnh', async () => {
    /*
     * Khung căn vẽ tệp ra bằng `background-image`, mà clip không vẽ ra được
     * kiểu ấy — mở nó cho một clip là bày ba ô trắng trơn. Đo thật trên trình
     * duyệt trước khi sửa: đúng ba ô trắng. Nên nút ấy phải VẮNG, chứ không
     * phải có mà bấm vào không xảy ra gì.
     */
    getPost.mockReturnValue(Promise.resolve({ ...post, hero_image_url: 'https://x/c.webm' }))
    listModules.mockReturnValue(Promise.resolve([{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0' }]))

    const { container } = render(<Editor postId="p1" />)
    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    expect(coverBand(container)).not.toContain('đặt vào khung')
  })

  it('ảnh bìa chỉ hiện ở băng, không vẽ lại ở ô của template', async () => {
    /*
     * Chủ site, khi thấy bản đầu bày cả hai: *"hiện 1 chỗ thôi chứ?"*. Nên ô
     * ảnh bìa của memo đứng giữ chỗ chứ không vẽ ảnh — muốn biết nó trông ra
     * sao thì bấm "xem trước".
     */
    getPost.mockReturnValue(Promise.resolve({ ...post, hero_image_url: 'https://x/a.jpg' }))
    listModules.mockReturnValue(Promise.resolve([{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0' }]))

    const { container } = render(<Editor postId="p1" />)
    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    const drawn = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) =>
      el.style.backgroundImage.includes('a.jpg'),
    )
    expect(drawn).toHaveLength(1)
    expect(drawn[0].hasAttribute('data-cover-band')).toBe(true)
  })

  it('ảnh thì vẫn mời căn khung', async () => {
    getPost.mockReturnValue(Promise.resolve({ ...post, hero_image_url: 'https://x/a.jpg' }))
    listModules.mockReturnValue(Promise.resolve([{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0' }]))

    const { container } = render(<Editor postId="p1" />)
    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    expect(coverBand(container)).toContain('đặt vào khung')
  })

  it('băng trang bìa có đủ bốn việc, kể cả đặt link', async () => {
    // Chủ site: "lấy cái logic của cái chỗ đặt link hiện tại thêm vào tất cả
    // các ảnh bên cạnh button tải lên và xoá".
    getPost.mockReturnValue(Promise.resolve({ ...post, hero_image_url: 'https://x/a.jpg' }))
    listModules.mockReturnValue(Promise.resolve([{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0' }]))

    const { container } = render(<Editor postId="p1" />)
    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    expect(coverBand(container)).toEqual([
      'tải ảnh lên',
      'đặt link',
      'đặt vào khung',
      'gỡ ảnh khỏi ô này',
    ])
  })

  it('có ảnh thì có nút gỡ, chưa có thì không', async () => {
    // Đặt được thì phải gỡ được — chủ site báo là không có đường nào xoá ảnh.
    getPost.mockReturnValue(Promise.resolve({ ...post, hero_image_url: 'https://x/a.jpg' }))
    listModules.mockReturnValue(Promise.resolve([{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0' }]))
    const co = render(<Editor postId="p1" />)
    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    expect(coverBand(co.container)).toContain('gỡ ảnh khỏi ô này')
    co.unmount()

    getPost.mockReturnValue(Promise.resolve({ ...post, hero_image_url: null }))
    const { container } = render(<Editor postId="p1" />)
    await waitFor(() => expect(screen.queryByText('Đang tải...')).toBeNull())
    // Chưa có ảnh thì chỉ còn hai lối đưa ảnh vào, không có gì để gỡ hay căn.
    expect(coverBand(container)).toEqual(['tải ảnh lên', 'đặt link'])
  })
})
