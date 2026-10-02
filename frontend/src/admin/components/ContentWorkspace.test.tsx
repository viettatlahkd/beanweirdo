import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The workspace is a tab inside Content management — the area's AuthGate
// covers it, so there is no per-screen gate left to stub out.
const editPost = vi.fn()
vi.mock('../../lib/nav', () => ({
  useNav: () => ({ screen: 'cms', area: 'admin', postId: null, newPost: vi.fn(), editPost, previewPost: vi.fn(), goCms: vi.fn() }),
}))
vi.mock('../../data/usePostAddresses', () => ({ usePostAddresses: () => ({ slugToPublish: () => undefined }) }))

const post = (id: string, over: Record<string, unknown>) => ({
  id,
  module_id: 'm',
  en: id,
  vi: '',
  kind: 'note',
  date_label: '2026.06',
  status: 'published',
  template: 'article',
  hero_image_url: null,
  theme_color: null,
  thumbnail_url: null,
  sort_order: null,
  pinned: false,
  topic_id: 'sensory',
  keywords: [],
  visibility: 'public',
  slug: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  published_at: null,
  ...over,
})

const topics = [
  { id: 'bean-weirdo', parent_id: null, title: 'bean weirdo', intro: '', accent: null, on_color: null, tint: null, tint2: null, image_url: null, sort_order: 1, visibility: 'public', posts: 0 },
  { id: 'sensory', parent_id: 'bean-weirdo', title: 'sensory', intro: '', accent: null, on_color: null, tint: null, tint2: null, image_url: null, sort_order: 2, visibility: 'public', posts: 1 },
  { id: 'art', parent_id: null, title: 'art', intro: '', accent: null, on_color: null, tint: null, tint2: null, image_url: null, sort_order: 3, visibility: 'public', posts: 0 },
  { id: 'book-film', parent_id: 'art', title: 'book & film', intro: '', accent: null, on_color: null, tint: null, tint2: null, image_url: null, sort_order: 4, visibility: 'public', posts: 2 },
]

let posts: ReturnType<typeof post>[] = []
const api = vi.hoisted(() => ({
  listPosts: vi.fn(),
  listTopics: vi.fn(),
  listKeywords: vi.fn(),
  listTags: vi.fn(),
  transitionStatus: vi.fn(),
  updatePost: vi.fn(),
  deleteTag: vi.fn(),
  createTag: vi.fn(),
}))
vi.mock('../lib/apiClient', () => api)

const { ContentWorkspace } = await import('./ContentWorkspace')

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  api.listPosts.mockImplementation(() => Promise.resolve(posts))
  api.listTopics.mockResolvedValue(topics)
  api.listKeywords.mockResolvedValue([])
  api.listTags.mockResolvedValue([{ id: 'note', label: 'note' }, { id: 'book-film', label: 'book-film' }])
  api.transitionStatus.mockResolvedValue({})
  api.updatePost.mockResolvedValue({})
  api.deleteTag.mockResolvedValue({ deleted: 'book-film', moved: { posts: [], notes: [] } })
  api.createTag.mockImplementation((label: string) => Promise.resolve({ id: label, label }))
  posts = [
    post('Senses of Flavors', { status: 'draft' }),
    post('Detachment', { kind: 'book-film', topic_id: 'book-film', date_label: '2025.02' }),
    post('Wings of Desire', { kind: 'book-film', topic_id: 'book-film', date_label: '2021.10' }),
    post('Chlorogenic Acids', { status: 'deleted' }),
  ]
})

const row = (title: string) => screen.getByRole('button', { name: title }).closest('tr') as HTMLElement

describe('ContentWorkspace', () => {
  it('lists the live posts and publishes a draft from its row', async () => {
    render(<ContentWorkspace />)
    expect(await screen.findByRole('button', { name: 'Senses of Flavors' })).toBeInTheDocument()
    // The trash stays out of the list until it is asked for.
    expect(screen.queryByRole('button', { name: 'Chlorogenic Acids' })).not.toBeInTheDocument()
    await userEvent.click(within(row('Senses of Flavors')).getByRole('button', { name: 'Đăng' }))
    expect(api.transitionStatus).toHaveBeenCalledWith('Senses of Flavors', 'publish')
  })

  it('shows the trash on its own, with restore and permanent delete', async () => {
    render(<ContentWorkspace />)
    await screen.findByRole('button', { name: 'Senses of Flavors' })
    await userEvent.click(screen.getByRole('button', { name: /^Thùng rác/ }))
    const trashed = row('Chlorogenic Acids')
    expect(screen.queryByRole('button', { name: 'Senses of Flavors' })).not.toBeInTheDocument()
    await userEvent.click(within(trashed).getByRole('button', { name: 'Khôi phục' }))
    expect(api.transitionStatus).toHaveBeenCalledWith('Chlorogenic Acids', 'restore-trash')
    await userEvent.click(within(trashed).getByRole('button', { name: 'Xoá vĩnh viễn' }))
    expect(api.transitionStatus).toHaveBeenCalledWith('Chlorogenic Acids', 'permanently-delete')
  })

  it('files posts by template — dạng bài is retired', async () => {
    posts[1] = { ...posts[1], template: 'bitesize' }
    render(<ContentWorkspace />)
    await screen.findByRole('button', { name: 'Senses of Flavors' })
    expect(screen.queryByRole('button', { name: /^Sửa note/ })).not.toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Phân loại' })).getByRole('button', { name: /^bitesize/ }))
    expect(screen.getByRole('button', { name: 'Detachment' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Senses of Flavors' })).not.toBeInTheDocument()
  })

  it('moves the selected posts to a topic and puts each back on undo', async () => {
    render(<ContentWorkspace />)
    await screen.findByRole('button', { name: 'Senses of Flavors' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn Senses of Flavors' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn Detachment' }))
    const bar = screen.getByRole('toolbar', { name: 'Sửa nhiều bài' })
    await userEvent.selectOptions(within(bar).getByRole('combobox', { name: 'Chủ đề' }), 'art')
    expect(api.updatePost).toHaveBeenCalledWith('Senses of Flavors', { topic_id: 'art' })
    expect(api.updatePost).toHaveBeenCalledWith('Detachment', { topic_id: 'art' })

    api.updatePost.mockClear()
    await userEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
    await vi.waitFor(() => expect(api.updatePost).toHaveBeenCalledWith('Detachment', { topic_id: 'book-film' }))
    expect(api.updatePost).toHaveBeenCalledWith('Senses of Flavors', { topic_id: 'sensory' })
  })
  it('pins a post from its row, whichever page lists it', async () => {
    render(<ContentWorkspace />)
    await screen.findByRole('button', { name: 'Senses of Flavors' })
    await userEvent.click(within(row('Detachment')).getByRole('button', { name: 'Ghim' }))
    expect(api.updatePost).toHaveBeenCalledWith('Detachment', { pinned: true })
  })
})
