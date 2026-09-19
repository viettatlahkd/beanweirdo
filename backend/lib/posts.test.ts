import { describe, expect, it } from 'vitest'
import { computeStatusTransition, firstImageIn, InvalidStatusTransitionError, toPostDetail, toPostSummary, type PostRow } from './posts.js'

function row(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: 'p1',
    module_id: 'sensory',
    en: 'Title',
    vi: 'Mô tả',
    kind: 'essay',
    date_label: '2026.08',
    theme_color: null,
    slug: null,
    body: null,
    hero_caption: null,
    lead: null,
    pull_quote: null,
    further_reading: null,
    sort_order: 0,
  pinned: false,
    created_at: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    template: 'article',
    hero_image_url: null,
    thumbnail_url: null,
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
    expect(summary).toMatchObject({ id: 'p1', module_id: 'sensory', hero_image_url: 'https://x/y.jpg' })

    const detail = toPostDetail(row({ pull_quote: 'quote', further_reading: ['a', 'b'] }))
    expect(detail).toMatchObject({ pull_quote: 'quote', further_reading: ['a', 'b'] })
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

describe('firstImageIn', () => {
  /*
   * Cái này chạy lúc **ghi** bài, không phải lúc đọc danh sách. Kết quả của nó
   * nằm trong cột `posts.thumbnail_url`; trước đây nó chạy trên đường trả về,
   * và đó là lý do câu select phải kéo cả `body` theo.
   */
  it('finds the first picture inside the post', () => {
    // A long-form piece carries its figures in `body`; without this the listing
    // shows a blank swatch for an article full of images.
    expect(firstImageIn([{ k: 'p' }, { k: 'fig', src: '/first.png' }])).toBe('/first.png')
  })

  it('reaches into a nested block', () => {
    expect(firstImageIn([{ k: 'aside', items: [{ k: 'fig', src: '/nested.png' }] }])).toBe('/nested.png')
  })

  it('takes imageUrl where a template uses that name instead', () => {
    expect(firstImageIn([{ k: 'card', imageUrl: '/card.png' }])).toBe('/card.png')
  })

  it('is null when there is no picture, and when there is no body', () => {
    expect(firstImageIn([{ n: '01', title: 'Apple' }])).toBeNull()
    expect(firstImageIn(null)).toBeNull()
  })
})

describe('toPostSummary — thumbnail', () => {
  const summaryOf = (hero: string | null, stored: string | null) =>
    toPostSummary(row({ hero_image_url: hero, thumbnail_url: stored }))

  it('prefers the cover when the post has one', () => {
    expect(summaryOf('/hero.png', '/inside.png').thumbnail_url).toBe('/hero.png')
  })

  /*
   * Chỉ nửa sau được lưu. Ghép ở đây chứ không gộp vào cột, để cột chỉ phụ
   * thuộc vào `body` — một đầu vào thì chỉ có một lúc phải tính lại.
   */
  it('falls back to the picture stored from the body', () => {
    expect(summaryOf(null, '/inside.png').thumbnail_url).toBe('/inside.png')
  })

  it('is null when the post has no picture at all', () => {
    expect(summaryOf(null, null).thumbnail_url).toBeNull()
  })
})
