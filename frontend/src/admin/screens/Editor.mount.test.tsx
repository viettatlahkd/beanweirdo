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
})
