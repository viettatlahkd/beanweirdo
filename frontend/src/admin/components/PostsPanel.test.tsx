import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

// The panel is a tab inside Content management now — the area's AuthGate
// covers it, so there is no per-screen gate left to stub out.
vi.mock('../../lib/nav', () => ({
  useNav: () => ({
    screen: 'cms',
    area: 'admin',
    postId: null,
    newPost: vi.fn(),
    editPost: vi.fn(),
    previewPost: vi.fn(),
    goCms: vi.fn(),
  }),
}))

const transitionStatus = vi.fn().mockResolvedValue({ id: 'p1', status: 'published' })
const listPosts = vi.fn().mockResolvedValue([
  {
    id: 'p1',
    module_id: 'sensory',
    n: 1,
    en: 'Senses of Flavors',
    vi: 'mô tả',
    kind: 'note',
    date_label: '2026.06',
    status: 'draft',
    template: 'article',
    hero_image_url: null,
    sort_order: 0,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    published_at: null,
  },
])

vi.mock('../lib/apiClient', () => ({
  listPosts: (...args: unknown[]) => listPosts(...args),
  transitionStatus: (...args: unknown[]) => transitionStatus(...args),
}))

const { PostsPanel } = await import('./PostsPanel')

/**
 * Open a row's menu.
 *
 * The row's actions are not on the row any more: there is one three-dot button
 * per row and the actions live behind it. So every test that used to click an
 * action straight away has to open the menu first — that is the behaviour
 * change, not test bookkeeping.
 */
async function openRowMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Hành động khác' }))
}

/** A summary row with only the fields a list test cares about spelled out. */
function row(over: Record<string, unknown>) {
  return {
    id: 'x',
    module_id: 'sensory',
    n: 1,
    en: 'Bài',
    vi: 'mô tả',
    lead: null,
    kind: 'note',
    date_label: '2026.06',
    status: 'draft',
    template: 'article',
    hero_image_url: null,
    thumbnail_url: null,
    pinned: false,
    sort_order: 0,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    published_at: null,
    ...over,
  }
}

describe('PostsPanel', () => {
  it('lists posts with template, meta and preview, and publishes one on click', async () => {
    render(<PostsPanel />)
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

    await openRowMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Đăng' }))
    expect(transitionStatus).toHaveBeenCalledWith('p1', 'publish')
  })

  it('fetches posts for the selected status tab', async () => {
    render(<PostsPanel />)
    await screen.findByText('Senses of Flavors')
    listPosts.mockClear()

    // Filters are picked by testid, not by their words: five of them read the
    // same as a row action, and a filter is not an action.
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
        module_id: 'roasting',
        n: 2,
        en: 'First Crack Field Notes',
        vi: 'ghi chú',
        kind: 'log',
        date_label: '2026.05',
        status: 'published',
        template: 'report',
        hero_image_url: null,
        sort_order: 0,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        published_at: '2026-05-02T00:00:00Z',
      },
    ])
    render(<PostsPanel />)
    await screen.findByText('First Crack Field Notes')

    await openRowMenu()
    expect(screen.getByRole('menuitem', { name: 'Bỏ đăng' })).toBeInTheDocument()
    /*
     * The row's "Lưu trữ" used to need unpicking from the "Lưu trữ" status
     * filter, which carries the same words. It does not any more: the filter is
     * a button and the action is a menuitem, so the role tells them apart.
     */
    await userEvent.click(screen.getByRole('menuitem', { name: 'Lưu trữ' }))
    expect(transitionStatus).toHaveBeenCalledWith('p2', 'archive')
  })

  it('wires trash-tab actions to restore-trash/permanently-delete', async () => {
    listPosts.mockResolvedValue([
      {
        id: 'p3',
        module_id: 'biochem',
        n: 3,
        en: 'Chlorogenic Acids (CGA)',
        vi: 'ghi chú',
        kind: 'ref',
        date_label: '2026.02',
        status: 'deleted',
        template: 'cards',
        hero_image_url: null,
        sort_order: 0,
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
        published_at: null,
      },
    ])
    render(<PostsPanel />)
    await screen.findByText('Chlorogenic Acids (CGA)')

    await openRowMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Khôi phục' }))
    expect(transitionStatus).toHaveBeenCalledWith('p3', 'restore-trash')

    await openRowMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Xoá vĩnh viễn' }))
    expect(transitionStatus).toHaveBeenCalledWith('p3', 'permanently-delete')
  })
  it('bài ghim lên đầu danh sách, phần còn lại giữ thứ tự máy chủ trả về', async () => {
    /*
     * Máy chủ xếp theo `updated_at` giảm dần và không biết gì về ghim, nên thứ
     * tự đến đây là A, B, C với C là bài đang ghim. Cái phải kiểm là C nhấc
     * lên đầu mà A với B không đảo chỗ cho nhau.
     */
    listPosts.mockResolvedValue([
      row({ id: 'a', en: 'Bài A' }),
      row({ id: 'b', en: 'Bài B' }),
      row({ id: 'c', en: 'Bài C', pinned: true }),
    ])
    render(<PostsPanel />)
    await screen.findByText('Bài C')

    const titles = screen.getAllByRole('button', { name: /^Bài [ABC]$/ }).map((el) => el.textContent)
    expect(titles).toEqual(['Bài C', 'Bài A', 'Bài B'])
  })
})
