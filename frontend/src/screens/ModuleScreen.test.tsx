import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRow } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'

const openArticle = vi.fn()
const goHome = vi.fn()
const useNav = vi.fn()
const useSettings = vi.fn()
vi.mock('../lib/nav', () => ({
  useNav: (...args: unknown[]) => useNav(...args),
  useSettings: (...args: unknown[]) => useSettings(...args),
}))

const useModules = vi.fn()
vi.mock('../data/useModules', () => ({ useModules: (...args: unknown[]) => useModules(...args) }))

const usePublishedPosts = vi.fn()
vi.mock('../data/usePublishedPosts', () => ({
  usePublishedPosts: (...args: unknown[]) => usePublishedPosts(...args),
}))

const { ModuleScreen } = await import('./ModuleScreen')

const sensory: ModuleRow = {
  id: 'sensory',
  title: 'sensory',
  accent: '#F2A0A5',
  on_color: '#3B2A2B',
  tint: '#FBE7E5',
  tint2: '#F6D2D4',
  layout: 'band',
  concept: 'flavor',
  blurb: 'blurb',
  long_desc: 'long',
  treatment: 'treatment',
  layout_note: 'note',
  shot1: 'shot1',
  shot2: 'shot2',
  shot3: 'shot3',
  sort_order: 1,
}

function makePost(overrides: Partial<PostRow>): PostRow {
  return {
    id: 'post-1',
    module_id: 'sensory',
    en: 'Senses of Flavors',
    vi: 'mô tả',
    kind: 'note',
    date_label: '2026.05',
    slug: null,
    body: null,
    hero_caption: null,
    lead: null,
    pull_quote: null,
    further_reading: null,
    sort_order: 1,
    created_at: '2026-05-01T00:00:00Z',
    status: 'published',
    template: 'article',
    hero_image_url: null,
    published_at: '2026-05-01T00:00:00Z',
    deleted_at: null,
    previous_status: null,
    updated_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

describe('ModuleScreen', () => {
  it('renders the band layout for the current module with real posts, and opens a real post id on click', async () => {
    useNav.mockReturnValue({ moduleId: 'sensory', goHome, openArticle })
    useSettings.mockReturnValue({ showPlates: true })
    useModules.mockReturnValue({ data: [sensory], loading: false, error: null })
    usePublishedPosts.mockReturnValue({
      data: [makePost({ id: 'post-1', en: 'Senses of Flavors' }), makePost({ id: 'post-2', n: '02', en: 'Taste Perception' })],
      loading: false,
      error: null,
    })

    render(<ModuleScreen />)

    expect(await screen.findByText('Senses of Flavors')).toBeInTheDocument()
    expect(screen.getByText('Taste Perception')).toBeInTheDocument()
    expect(usePublishedPosts).toHaveBeenCalledWith(expect.objectContaining({ moduleId: 'sensory' }))

    await userEvent.click(screen.getByText('Senses of Flavors'))
    // The second argument records the door the reader came through — see `Origin`.
    expect(openArticle).toHaveBeenCalledWith('post-1', 'module')
  })

  it('shows a loading state while modules are still resolving', () => {
    useNav.mockReturnValue({ moduleId: 'sensory', goHome, openArticle })
    useSettings.mockReturnValue({ showPlates: true })
    useModules.mockReturnValue({ data: [], loading: true, error: null })
    usePublishedPosts.mockReturnValue({ data: [], loading: false, error: null })

    render(<ModuleScreen />)
    expect(screen.getByText('Đang tải…')).toBeInTheDocument()
  })
})
