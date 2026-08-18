import { describe, expect, it } from 'vitest'
import { computeStatusTransition, InvalidStatusTransitionError, toPostDetail, toPostSummary, type PostRow } from './posts.js'

function row(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: 'p1',
    module_id: 'sensory',
    n: '01',
    en: 'Title',
    vi: 'Mô tả',
    kind: 'essay',
    date_label: '2026.08',
    slug: null,
    body: null,
    hero_caption: null,
    lead: null,
    pull_quote: null,
    further_reading: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    template: 'article',
    hero_image_url: null,
    published_at: null,
    deleted_at: null,
    previous_status: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('toPostSummary / toPostDetail', () => {
  it('maps snake_case columns to camelCase JSON', () => {
    const summary = toPostSummary(row({ hero_image_url: 'https://x/y.jpg' }))
    expect(summary).toMatchObject({ id: 'p1', moduleId: 'sensory', heroImageUrl: 'https://x/y.jpg' })

    const detail = toPostDetail(row({ pull_quote: 'quote', further_reading: ['a', 'b'] }))
    expect(detail).toMatchObject({ pullQuote: 'quote', furtherReading: ['a', 'b'] })
  })
})

describe('computeStatusTransition', () => {
  it('publish: draft -> published, sets published_at', () => {
    const { patch, hardDelete } = computeStatusTransition(row({ status: 'draft' }), 'publish')
    expect(hardDelete).toBe(false)
    expect(patch).toMatchObject({ status: 'published' })
    expect(patch!.published_at).toBeTruthy()
  })

  it('rejects publish on a non-draft post', () => {
    expect(() => computeStatusTransition(row({ status: 'published' }), 'publish')).toThrow(
      InvalidStatusTransitionError,
    )
  })

  it('unpublish: published -> draft', () => {
    const { patch } = computeStatusTransition(row({ status: 'published' }), 'unpublish')
    expect(patch).toMatchObject({ status: 'draft' })
  })

  it('archive: published -> archived; rejects archiving a draft', () => {
    const { patch } = computeStatusTransition(row({ status: 'published' }), 'archive')
    expect(patch).toMatchObject({ status: 'archived' })
    expect(() => computeStatusTransition(row({ status: 'draft' }), 'archive')).toThrow(InvalidStatusTransitionError)
  })

  it('restore: archived -> published', () => {
    const { patch } = computeStatusTransition(row({ status: 'archived' }), 'restore')
    expect(patch).toMatchObject({ status: 'published' })
  })

  it('delete: draft/published/archived -> deleted, sets deleted_at + previous_status', () => {
    for (const status of ['draft', 'published', 'archived'] as const) {
      const { patch } = computeStatusTransition(row({ status }), 'delete')
      expect(patch).toMatchObject({ status: 'deleted', previous_status: status })
      expect(patch!.deleted_at).toBeTruthy()
    }
  })

  it('rejects delete on an already-deleted post', () => {
    expect(() => computeStatusTransition(row({ status: 'deleted' }), 'delete')).toThrow(InvalidStatusTransitionError)
  })

  it('restore-trash: deleted -> previous_status, clears deleted_at + previous_status', () => {
    const { patch } = computeStatusTransition(row({ status: 'deleted', previous_status: 'archived' }), 'restore-trash')
    expect(patch).toMatchObject({ status: 'archived', deleted_at: null, previous_status: null })
  })

  it('rejects restore-trash on a non-deleted post', () => {
    expect(() => computeStatusTransition(row({ status: 'draft' }), 'restore-trash')).toThrow(
      InvalidStatusTransitionError,
    )
  })

  it('permanently-delete: deleted -> hard delete, no patch', () => {
    const result = computeStatusTransition(row({ status: 'deleted' }), 'permanently-delete')
    expect(result.hardDelete).toBe(true)
    expect(result.patch).toBeNull()
  })

  it('rejects permanently-delete on a non-deleted post', () => {
    expect(() => computeStatusTransition(row({ status: 'published' }), 'permanently-delete')).toThrow(
      InvalidStatusTransitionError,
    )
  })
})

describe('toPostSummary — thumbnail', () => {
  const row = (hero: string | null, body: unknown) =>
    toPostSummary({
      id: 'p1', module_id: 'biochem', n: '05', en: 'Lipid', vi: 'mô tả',
      kind: 'note', date_label: '2025.12', slug: null, body, hero_caption: null,
      lead: null, pull_quote: null, further_reading: null, sort_order: 5,
      created_at: 'x', status: 'published', template: 'longform',
      hero_image_url: hero, published_at: null, deleted_at: null,
      previous_status: null, updated_at: 'x',
    } as never)

  it('prefers the cover when the post has one', () => {
    expect(row('/hero.png', [{ k: 'fig', src: '/inside.png' }]).thumbnailUrl).toBe('/hero.png')
  })

  it('falls back to the first picture inside the post', () => {
    // A long-form piece carries its figures in `body`; without this the listing
    // shows a blank swatch for an article full of images.
    expect(row(null, [{ k: 'p' }, { k: 'fig', src: '/first.png' }]).thumbnailUrl).toBe('/first.png')
  })

  it('reaches into a nested block', () => {
    expect(row(null, [{ k: 'aside', items: [{ k: 'fig', src: '/nested.png' }] }]).thumbnailUrl).toBe('/nested.png')
  })

  it('is null when the post has no picture at all', () => {
    expect(row(null, [{ n: '01', title: 'Apple' }]).thumbnailUrl).toBeNull()
    expect(row(null, null).thumbnailUrl).toBeNull()
  })
})
