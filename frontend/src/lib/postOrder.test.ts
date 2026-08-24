import { describe, expect, it } from 'vitest'
import { orderPosts } from './postOrder'

const p = (id: string, o: Partial<{ pinned: boolean; sort_order: number | null; published_at: string | null; created_at: string }> = {}) => ({
  id,
  pinned: o.pinned ?? false,
  sort_order: o.sort_order ?? null,
  published_at: o.published_at ?? null,
  created_at: o.created_at ?? '2026-01-01',
})

describe('orderPosts', () => {
  it('falls back to published_at, newest first, when nobody has placed anything', () => {
    const out = orderPosts([
      p('cũ', { published_at: '2025-12-01' }),
      p('mới', { published_at: '2026-05-01' }),
      p('giữa', { published_at: '2026-02-01' }),
    ])
    expect(out.map((x) => x.id)).toEqual(['mới', 'giữa', 'cũ'])
  })

  it('lets a chosen position win over the date', () => {
    const out = orderPosts([
      p('mới', { published_at: '2026-05-01' }),
      p('đặt tay', { sort_order: 1, published_at: '2020-01-01' }),
    ])
    expect(out.map((x) => x.id)).toEqual(['đặt tay', 'mới'])
  })

  it('puts an unplaced post after every placed one', () => {
    const out = orderPosts([
      p('không đặt', { published_at: '2030-01-01' }),
      p('đặt 2', { sort_order: 2 }),
      p('đặt 1', { sort_order: 1 }),
    ])
    expect(out.map((x) => x.id)).toEqual(['đặt 1', 'đặt 2', 'không đặt'])
  })

  it('leads with a pinned post whatever else is true of it', () => {
    const out = orderPosts([
      p('đặt 1', { sort_order: 1, published_at: '2026-05-01' }),
      p('ghim', { pinned: true, published_at: '2019-01-01' }),
    ])
    expect(out[0].id).toBe('ghim')
  })

  it('uses created_at for a draft, which has no published_at', () => {
    const out = orderPosts([
      p('nháp cũ', { created_at: '2026-01-01' }),
      p('nháp mới', { created_at: '2026-08-01' }),
    ])
    expect(out.map((x) => x.id)).toEqual(['nháp mới', 'nháp cũ'])
  })

  it('breaks a tie on the date the reader sees', () => {
    // Six posts published in one batch share a timestamp to the second; the
    // only thing left separating them is the date on their faces.
    const same = '2026-08-17T15:15:34Z'
    const out = orderPosts([
      { sort_order: null, published_at: same, date_label: '2025.12' },
      { sort_order: null, published_at: same, date_label: '2026.05' },
      { sort_order: null, published_at: same, date_label: '2026.02' },
    ])
    expect(out.map((x) => x.date_label)).toEqual(['2026.05', '2026.02', '2025.12'])
  })

  it('sorts a post with no date at all last, not first', () => {
    const out = orderPosts([
      { sort_order: null, published_at: null, created_at: '' },
      { sort_order: null, published_at: '2026-01-01' },
    ])
    expect(out[0].published_at).toBe('2026-01-01')
  })
})
