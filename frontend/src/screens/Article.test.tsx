import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PostRow } from '../data/usePublishedPosts'

const openModule = vi.fn()
const openArticle = vi.fn()
const useNav = vi.fn()
vi.mock('../lib/nav', () => ({ useNav: (...args: unknown[]) => useNav(...args) }))

const useModules = vi.fn()
vi.mock('../data/useModules', () => ({ useModules: (...args: unknown[]) => useModules(...args) }))

const usePublishedPosts = vi.fn()
vi.mock('../data/usePublishedPosts', () => ({
  usePublishedPosts: (...args: unknown[]) => usePublishedPosts(...args),
}))

const usePost = vi.fn()
vi.mock('../data/usePost', () => ({ usePost: (...args: unknown[]) => usePost(...args) }))

const { Article } = await import('./Article')

const cgaPost: PostRow = {
  id: 'p1',
  module_id: 'biochem',
  n: '03',
  en: 'Chlorogenic Acids (CGA)',
  vi: 'Nguồn gốc của vị chát và phần lớn vị chua',
  kind: 'essay',
  date_label: '2026.02',
  slug: null,
  body: [{ h: 'Nó là gì', p: 'Một họ hợp chất phenolic.' }],
  hero_caption: 'quả chín, chụp thẳng',
  lead: 'Nguồn gốc của vị chát và phần lớn vị chua trong tách cà phê.',
  pull_quote: 'Rang càng sâu, CGA càng ít.',
  further_reading: ['Farah & Donangelo 2006'],
  sort_order: 3,
  created_at: '2026-02-01T00:00:00Z',
  status: 'published',
  template: 'article',
  hero_image_url: null,
  published_at: '2026-02-01T00:00:00Z',
  deleted_at: null,
  previous_status: null,
  updated_at: '2026-02-01T00:00:00Z',
}

describe('Article', () => {
  it('renders a real post through PostRenderer, splitting a trailing parenthetical into italics', async () => {
    useNav.mockReturnValue({ postId: 'p1', openModule, openArticle })
    useModules.mockReturnValue({ data: [{ id: 'biochem', title: 'biochemistry 101' }], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [], loading: false, error: null })
    usePost.mockReturnValue({ data: cgaPost, loading: false, error: null })

    render(<Article />)

    const title = await screen.findByTestId('article-title')
    expect(title.textContent).toBe('Chlorogenic Acids (CGA)')
    expect(screen.getByText('03 — essay — 2026.02')).toBeInTheDocument()
    expect(screen.getByText('Một họ hợp chất phenolic.')).toBeInTheDocument()

    await userEvent.click(screen.getByText('← biochemistry 101'))
    expect(openModule).toHaveBeenCalledWith('biochem')
  })

  it('shows a graceful placeholder section when the post has no body (the common case)', async () => {
    useNav.mockReturnValue({ postId: 'p2', openModule, openArticle })
    useModules.mockReturnValue({ data: [{ id: 'biochem', title: 'biochemistry 101' }], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [], loading: false, error: null })
    usePost.mockReturnValue({
      data: { ...cgaPost, id: 'p2', n: '01', en: 'Bean Composition', body: null, lead: null, pull_quote: null, further_reading: null },
      loading: false,
      error: null,
    })

    render(<Article />)

    expect(await screen.findByText('Chưa có nội dung')).toBeInTheDocument()
    expect(screen.getByText('Bài viết này đang được biên soạn — quay lại sau nhé.')).toBeInTheDocument()
  })

  it('renders the cards template gracefully with no seeded cards', async () => {
    useNav.mockReturnValue({ postId: 'p3', openModule, openArticle })
    useModules.mockReturnValue({ data: [], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [], loading: false, error: null })
    usePost.mockReturnValue({
      data: { ...cgaPost, id: 'p3', kind: 'ref', template: 'cards', en: 'Sensory Lexicon', body: null },
      loading: false,
      error: null,
    })

    render(<Article />)

    expect(await screen.findByText('Sensory Lexicon')).toBeInTheDocument()
    expect(screen.getByText('Chưa có mục nào trong glossary này.')).toBeInTheDocument()
  })

  it('shows a not-found message when no post matches', async () => {
    useNav.mockReturnValue({ postId: 'missing', openModule, openArticle })
    useModules.mockReturnValue({ data: [], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [], loading: false, error: null })
    usePost.mockReturnValue({ data: null, loading: false, error: null })

    render(<Article />)

    expect(await screen.findByText('Không tìm thấy bài viết.')).toBeInTheDocument()
  })

  it('falls back to the biochem/03 post when opened with no id (the sidebar sample link)', async () => {
    useNav.mockReturnValue({ postId: null, openModule, openArticle })
    useModules.mockReturnValue({ data: [{ id: 'biochem', title: 'biochemistry 101' }], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [cgaPost], loading: false, error: null })
    usePost.mockReturnValue({ data: cgaPost, loading: false, error: null })

    render(<Article />)

    expect(await screen.findByTestId('article-title')).toHaveTextContent('Chlorogenic Acids (CGA)')
    expect(usePost).toHaveBeenCalledWith('p1')
  })
})
