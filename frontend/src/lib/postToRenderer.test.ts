import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  toArticleData,
  toCardsData,
  toLongformData,
  toMemoData,
  toReportData,
} from './postToRenderer'

/**
 * There is one shape now.
 *
 * The public journal reads a post straight from the database; the admin reads
 * the same post through our API. Those used to arrive under different field
 * names — the API renamed every column on the way out — so each side grew its
 * own adapter, and the two drifted: the preview lost the module's colours,
 * drew flavour groups from the wrong palette, and took its opening line from a
 * different field, all under a banner promising it showed exactly what ships.
 *
 * The renaming is gone. These tests guard the thing that made it possible to
 * remove: both doors open on the same names.
 */

const post = {
  en: 'Sensory Lexicon',
  vi: 'Bộ từ vựng mô tả hương vị',
  lead: 'Thang rút ngắn 0-8',
  kind: 'ref',
  date_label: '2026.03',
  body: [{ n: '01', hue: '#F2703A', groups: ['Other Fruit'], title: 'Apple', sub: '', tag: '', parts: [] }],
  hero_caption: 'ảnh bìa',
  hero_image_url: 'https://example.test/a.jpg',
  pull_quote: 'một câu trích',
  further_reading: ['Sensory Lexicon, 2016 Edition'],
}

const mod = { title: 'sensory', accent: '#F2A0A5', on_color: '#3B2A2B' }

describe('one shape, one adapter', () => {
  it('the API answers in the database\'s own field names', () => {
    // If someone reintroduces the renaming, the two doors stop matching and a
    // second adapter becomes necessary again. Catch it at the source.
    const src = readFileSync(join(__dirname, '../../../backend/lib/posts.ts'), 'utf8')
    const summary = /export interface PostSummary \{([\s\S]*?)\n\}/.exec(src)?.[1] ?? ''
    const detail = /export interface PostDetail extends PostSummary \{([\s\S]*?)\n\}/.exec(src)?.[1] ?? ''
    const fields = [...`${summary}\n${detail}`.matchAll(/^\s{2}(\w+)[?]?:/gm)].map((m) => m[1])

    expect(fields.length).toBeGreaterThan(15)
    expect(fields.filter((f) => /[A-Z]/.test(f))).toEqual([])
  })

  const cases = {
    cards: () => toCardsData(post, mod),
    report: () => toReportData(post, mod),
    longform: () => toLongformData(post, mod),
    memo: () => toMemoData(post, mod),
    article: () => toArticleData(post, 'sensory', [], -1, mod),
  }

  for (const [name, run] of Object.entries(cases)) {
    it(`${name}: carries the module's colours through`, () => {
      expect((run() as { band?: unknown }).band).toEqual({ bg: '#F2A0A5', fg: '#3B2A2B' })
    })
  }

  it('reads the same post the admin would hand it, unchanged', () => {
    // The admin's PostDetail is this shape plus a few fields the templates
    // ignore, so passing one straight in has to work.
    const asAdminSendsIt = { ...post, id: 'p1', module_id: 'sensory', status: 'published', sort_order: 1 }
    expect(toCardsData(asAdminSendsIt, mod)).toEqual(toCardsData(post, mod))
  })
})

describe('the colour a post wears', () => {
  const post = {
    en: 'Rang thử',
    vi: '',
    lead: null,
    kind: 'note',
    date_label: '2026.02',
    body: [],
    hero_caption: null,
    hero_image_url: null,
    pull_quote: null,
    further_reading: null,
  }
  const mod = { title: 'Sensory', accent: '#F2A0A5', on_color: '#3B1F22' }

  // Article also wants a module title, its neighbours and its position; the
  // rest take the post and its module.
  const each = [
    ['article', (p: unknown, m?: unknown) => toArticleData(p as never, 'Sensory', [], 1, m as never)],
    ['cards', (p: unknown, m?: unknown) => toCardsData(p as never, m as never)],
    ['report', (p: unknown, m?: unknown) => toReportData(p as never, m as never)],
    ['longform', (p: unknown, m?: unknown) => toLongformData(p as never, m as never)],
    ['memo', (p: unknown, m?: unknown) => toMemoData(p as never, m as never)],
  ] as const

  it.each(each)('%s takes its module’s colour', (_name, adapt) => {
    expect(adapt(post, mod).band).toEqual({ bg: '#F2A0A5', fg: '#3B1F22' })
  })

  it.each(each)('%s takes the post’s own colour over the module’s', (_name, adapt) => {
    const band = adapt({ ...post, theme_color: '#C25C7C' }, mod).band
    expect(band?.bg).toBe('#C25C7C')
  })

  it('works out what reads on a colour the module never spoke for', () => {
    // `on_color` answers "what reads on *me*" — it is the wrong answer for a
    // colour the module was not asked about.
    const band = toReportData({ ...post, theme_color: '#23211A' } as never, mod).band
    expect(band?.fg).not.toBe('#3B1F22')
  })

  it('leaves a post with no module and no colour of its own bandless', () => {
    expect(toReportData(post as never, undefined).band).toBeUndefined()
  })

  it('gives a journal post a band once it has been given a colour', () => {
    expect(toMemoData({ ...post, theme_color: '#8A6420' } as never, undefined).band?.bg).toBe('#8A6420')
  })
})
