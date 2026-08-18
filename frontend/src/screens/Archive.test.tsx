import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRow } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'

const openArticle = vi.fn()
const useNav = vi.fn()
vi.mock('../lib/nav', () => ({ useNav: (...args: unknown[]) => useNav(...args) }))

const useModules = vi.fn()
vi.mock('../data/useModules', () => ({ useModules: (...args: unknown[]) => useModules(...args) }))

const usePublishedPosts = vi.fn()
vi.mock('../data/usePublishedPosts', () => ({
  usePublishedPosts: (...args: unknown[]) => usePublishedPosts(...args),
}))

const { Archive } = await import('./Archive')

const biochem: ModuleRow = {
  id: 'biochem',
  title: 'biochemistry 101',
  accent: '#7FB87E',
  on_color: '#1F3323',
  tint: '#E4F0DF',
  tint2: '#CFE6C8',
  layout: 'specimen',
  concept: 'structure',
  blurb: 'blurb',
  long_desc: 'long',
  treatment: 'treatment',
  layout_note: 'note',
  shot1: 's1',
  shot2: 's2',
  shot3: 's3',
  sort_order: 2,
}

const post: PostRow = {
  id: 'p1',
  module_id: 'biochem',
  n: '03',
  en: 'Chlorogenic Acids (CGA)',
  vi: 'Nguồn gốc của vị chát',
  kind: 'essay',
  date_label: '2026.02',
  slug: null,
  body: null,
  hero_caption: null,
  lead: null,
  pull_quote: null,
  further_reading: null,
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

describe('Archive', () => {
  it('lists published posts newest-first with their module label, and opens the real post id on click', async () => {
    useNav.mockReturnValue({ openArticle })
    useModules.mockReturnValue({ data: [biochem], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [post], loading: false, error: null })

    render(<Archive />)

    // Archive is the one listing that asks for archived rows too.
    expect(usePublishedPosts).toHaveBeenCalledWith({
      orderBy: 'date_label',
      ascending: false,
      includeArchived: true,
    })
    expect(await screen.findByText('Chlorogenic Acids (CGA)')).toBeInTheDocument()
    expect(screen.getByText('biochemistry 101')).toBeInTheDocument()
    expect(screen.getByText('1 notes — sắp theo thời gian')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Chlorogenic Acids (CGA)'))
    expect(openArticle).toHaveBeenCalledWith('p1')
  })

  it('lists an archived post but does not let it be opened — there is nothing at the other end', async () => {
    useNav.mockReturnValue({ openArticle })
    useModules.mockReturnValue({ data: [biochem], loading: false, error: null })
    usePublishedPosts.mockReturnValue({
      data: [post, { ...post, id: 'p2', en: 'Bean Composition', status: 'archived' }],
      loading: false,
      error: null,
    })

    render(<Archive />)
    openArticle.mockClear()

    expect(await screen.findByText('Bean Composition')).toBeInTheDocument()
    // The count reflects the reading list, with the archive noted beside it.
    expect(screen.getByText(/1 notes — sắp theo thời gian · 1 lưu trữ/)).toBeInTheDocument()

    await userEvent.click(screen.getByText('Bean Composition'))
    expect(openArticle).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('Chlorogenic Acids (CGA)'))
    expect(openArticle).toHaveBeenCalledWith('p1')
  })
})