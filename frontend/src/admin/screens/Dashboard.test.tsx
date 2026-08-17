import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../PasswordGate', () => ({ PasswordGate: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../lib/nav', () => ({
  useAdminNav: () => ({
    screen: 'dashboard',
    postId: null,
    goLogin: vi.fn(),
    goDashboard: vi.fn(),
    goNew: vi.fn(),
    goEdit: vi.fn(),
    goPreview: vi.fn(),
  }),
}))

const transitionStatus = vi.fn().mockResolvedValue({ id: 'p1', status: 'published' })
const listPosts = vi.fn().mockResolvedValue([
  {
    id: 'p1',
    moduleId: 'sensory',
    n: 1,
    en: 'Senses of Flavors',
    vi: 'mô tả',
    kind: 'note',
    dateLabel: '2026.06',
    status: 'draft',
    template: 'article',
    heroImageUrl: null,
    sortOrder: 0,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    publishedAt: null,
  },
])

vi.mock('../lib/apiClient', () => ({
  listPosts: (...args: unknown[]) => listPosts(...args),
  transitionStatus: (...args: unknown[]) => transitionStatus(...args),
}))

const { Dashboard } = await import('./Dashboard')

describe('Dashboard', () => {
  it('lists posts with template, meta and preview, and publishes one on click', async () => {
    render(<Dashboard />)
    expect(await screen.findByText('Senses of Flavors')).toBeInTheDocument()
    // Real template name (not the old band/specimen/sequence naming).
    expect(screen.getByText('Article')).toBeInTheDocument()
    // meta: module · kind · date
    expect(screen.getByText(/sensory/)).toBeInTheDocument()
    expect(screen.getByText(/note/)).toBeInTheDocument()
    expect(screen.getByText(/2026\.06/)).toBeInTheDocument()
    // body preview
    expect(screen.getByText('mô tả')).toBeInTheDocument()
    // status badge
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Nháp')

    await userEvent.click(screen.getByRole('button', { name: 'Đăng' }))
    expect(transitionStatus).toHaveBeenCalledWith('p1', 'publish')
  })

  it('fetches posts for the selected status tab', async () => {
    render(<Dashboard />)
    await screen.findByText('Senses of Flavors')
    listPosts.mockClear()

    // Tabs carry their own testid — the "Lưu trữ" tab label and the row's
    // "Lưu trữ" (archive) action button share the same visible text.
    await userEvent.click(screen.getByTestId('tab-archived'))
    expect(listPosts).toHaveBeenCalledWith('archived')
  })

  it('wires published-post actions to unpublish/archive/delete', async () => {
    // mockResolvedValue (not -Once): the page re-fetches (tab + all-posts
    // counts) after every action, so the stub must keep answering the same
    // way for every call this test makes, not just the first.
    listPosts.mockResolvedValue([
      {
        id: 'p2',
        moduleId: 'roasting',
        n: 2,
        en: 'First Crack Field Notes',
        vi: 'ghi chú',
        kind: 'log',
        dateLabel: '2026.05',
        status: 'published',
        template: 'report',
        heroImageUrl: null,
        sortOrder: 0,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
        publishedAt: '2026-05-02T00:00:00Z',
      },
    ])
    render(<Dashboard />)
    await screen.findByText('First Crack Field Notes')

    expect(screen.getByRole('button', { name: 'Bỏ đăng' })).toBeInTheDocument()
    // The row's "Lưu trữ" (archive) button shares its label with the
    // "Lưu trữ" status tab — pick the one that isn't a tab (no aria-pressed).
    const archiveButtons = screen.getAllByRole('button', { name: 'Lưu trữ' })
    const rowArchiveButton = archiveButtons.find((b) => !b.hasAttribute('aria-pressed'))
    expect(rowArchiveButton).toBeTruthy()
    await userEvent.click(rowArchiveButton!)
    expect(transitionStatus).toHaveBeenCalledWith('p2', 'archive')
  })

  it('wires trash-tab actions to restore-trash/permanently-delete', async () => {
    listPosts.mockResolvedValue([
      {
        id: 'p3',
        moduleId: 'biochem',
        n: 3,
        en: 'Chlorogenic Acids (CGA)',
        vi: 'ghi chú',
        kind: 'ref',
        dateLabel: '2026.02',
        status: 'deleted',
        template: 'cards',
        heroImageUrl: null,
        sortOrder: 0,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
        publishedAt: null,
      },
    ])
    render(<Dashboard />)
    await screen.findByText('Chlorogenic Acids (CGA)')

    await userEvent.click(screen.getByRole('button', { name: 'Khôi phục' }))
    expect(transitionStatus).toHaveBeenCalledWith('p3', 'restore-trash')

    await userEvent.click(screen.getByRole('button', { name: 'Xoá vĩnh viễn' }))
    expect(transitionStatus).toHaveBeenCalledWith('p3', 'permanently-delete')
  })
})
