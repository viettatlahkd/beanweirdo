import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRow } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'

const openArticle = vi.fn()
const openModule = vi.fn()
const toggleVariant = vi.fn()
const useNav = vi.fn()
const useSettings = vi.fn()
vi.mock('../lib/nav', async () => {
  const actual = await vi.importActual<typeof import('../lib/nav')>('../lib/nav')
  return {
    ...actual,
    useNav: (...args: unknown[]) => useNav(...args),
    useSettings: (...args: unknown[]) => useSettings(...args),
  }
})

const useModules = vi.fn()
vi.mock('../data/useModules', () => ({
  useModules: (...args: unknown[]) => useModules(...args),
  // The journals are modules too now; only the reading ones are listed here.
  indexModules: (ms: { visibility?: string }[]) => ms.filter((m) => m.visibility !== 'private'),
}))

const usePublishedPosts = vi.fn()
vi.mock('../data/usePublishedPosts', () => ({
  usePublishedPosts: (...args: unknown[]) => usePublishedPosts(...args),
}))

const { IndexScreen } = await import('./IndexScreen')

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

const post: PostRow = {
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
}

describe('IndexScreen', () => {
  it('variant A (ledger) lists posts grouped by module and opens a real post id on click', async () => {
    useNav.mockReturnValue({ variant: 'A', openArticle, openModule, toggleVariant })
    useSettings.mockReturnValue({ density: 'roomy', showPlates: true })
    useModules.mockReturnValue({ data: [sensory], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [post], loading: false, error: null })

    render(<IndexScreen />)

    expect(await screen.findByText('Senses of Flavors')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Senses of Flavors'))
    // The second argument records the door the reader came through — see `Origin`.
    expect(openArticle).toHaveBeenCalledWith('post-1', 'module')
  })

  it('variant A puts a nested module after the one holding it, and one level in', async () => {
    // Trước bản này, Mục lục liệt kê "bean weirdo", "Roasting", "Biochem"
    // ngang hàng nhau — một danh sách module, không phải một mục lục.
    useNav.mockReturnValue({ variant: 'A', openArticle, openModule, toggleVariant })
    useSettings.mockReturnValue({ density: 'roomy', showPlates: true })
    useModules.mockReturnValue({
      data: [
        { ...sensory, id: 'bean', title: 'bean weirdo' },
        { ...sensory, id: 'roasting', title: 'Roasting', parent_id: 'bean' },
      ],
      loading: false,
      error: null,
    })
    usePublishedPosts.mockReturnValue({ data: [], loading: false, error: null })

    render(<IndexScreen />)

    const parent = await screen.findByText('bean weirdo')
    const child = screen.getByText('Roasting')
    // Con nằm sau cha trong thứ tự đọc của trang.
    expect(parent.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // và thụt vào so với cha: 56 + 28.
    // và thụt vào so với cha. React gộp vào shorthand `padding`, nên đọc qua
    // CSSOM chứ không đọc chuỗi thuộc tính.
    const sectionOf = (el: HTMLElement) =>
      el.closest('div[style*="max-width: 1240px"]') as HTMLElement | null
    expect(sectionOf(parent)?.style.paddingLeft).toBe('56px')
    expect(sectionOf(child)?.style.paddingLeft).toBe('84px')
  })

  it('variant B names the module a nested one sits inside, since every tile is the same size', async () => {
    useNav.mockReturnValue({ variant: 'B', openArticle, openModule, toggleVariant })
    useSettings.mockReturnValue({ density: 'roomy', showPlates: true })
    useModules.mockReturnValue({
      data: [
        { ...sensory, id: 'bean', title: 'bean weirdo' },
        { ...sensory, id: 'roasting', title: 'Roasting', parent_id: 'bean' },
      ],
      loading: false,
      error: null,
    })
    usePublishedPosts.mockReturnValue({ data: [], loading: false, error: null })

    render(<IndexScreen />)

    expect(await screen.findByText('trong bean weirdo · flavor')).toBeInTheDocument()
  })

  it('variant B (columns) also renders real posts per module', async () => {
    useNav.mockReturnValue({ variant: 'B', openArticle, openModule, toggleVariant })
    useSettings.mockReturnValue({ density: 'roomy', showPlates: true })
    useModules.mockReturnValue({ data: [sensory], loading: false, error: null })
    usePublishedPosts.mockReturnValue({ data: [post], loading: false, error: null })

    render(<IndexScreen />)

    expect(await screen.findByText('Senses of Flavors')).toBeInTheDocument()
  })
})
