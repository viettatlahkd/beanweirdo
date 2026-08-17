import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRow } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'

const openModule = vi.fn()
const goHome = vi.fn()
const useNav = vi.fn()
vi.mock('../lib/nav', () => ({ useNav: (...args: unknown[]) => useNav(...args) }))

const useModules = vi.fn()
vi.mock('../data/useModules', () => ({ useModules: (...args: unknown[]) => useModules(...args) }))

const usePublishedPosts = vi.fn()
vi.mock('../data/usePublishedPosts', () => ({
  usePublishedPosts: (...args: unknown[]) => usePublishedPosts(...args),
}))

// jsdom (via vitest.setup.ts) doesn't implement IntersectionObserver, which
// the Rise entrance-animation wrapper used by Landing's ImageBand relies on.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error test-only stub, not a full IntersectionObserver
global.IntersectionObserver = MockIntersectionObserver

const { Landing } = await import('./Landing')

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
    n: '01',
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

describe('Landing', () => {
  it('groups posts by module and opens the module on click', async () => {
    useNav.mockReturnValue({ openModule, goHome })
    useModules.mockReturnValue({ data: [sensory], loading: false, error: null })
    usePublishedPosts.mockReturnValue({
      data: [makePost({ id: 'post-1' })],
      loading: false,
      error: null,
    })

    render(<Landing />)

    expect(screen.getByText('flavor — 1 bài')).toBeInTheDocument()
    expect(screen.getByText('Senses of Flavors')).toBeInTheDocument()
    expect(screen.getByText('xem mục lục 1 bài →')).toBeInTheDocument()

    await userEvent.click(screen.getByText('sensory'))
    expect(openModule).toHaveBeenCalledWith('sensory')
  })
})
