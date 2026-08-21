import { describe, expect, it } from 'vitest'
import {
  fromAdminModule,
  fromAdminPost,
  toArticleData,
  toCardsData,
  toLongformData,
  toMemoData,
  toReportData,
} from './postToRenderer'

/**
 * The public journal and the admin preview read the same post through
 * different doors, and used to meet it under different field names — so each
 * had its own adapter, and the two drifted apart. This renders one post down
 * both paths and insists the result is identical.
 *
 * If a preview ever stops matching what ships, it fails here rather than on
 * the day someone publishes what they thought they had checked.
 */

/** One post, as the public journal reads it straight from the database. */
const fromDatabase = {
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

/** The same post, as the admin's API hands it over. */
const fromApi = {
  en: 'Sensory Lexicon',
  vi: 'Bộ từ vựng mô tả hương vị',
  lead: 'Thang rút ngắn 0-8',
  kind: 'ref',
  dateLabel: '2026.03',
  body: fromDatabase.body,
  heroCaption: 'ảnh bìa',
  heroImageUrl: 'https://example.test/a.jpg',
  pullQuote: 'một câu trích',
  furtherReading: ['Sensory Lexicon, 2016 Edition'],
}

const moduleFromDatabase = { title: 'sensory', accent: '#F2A0A5', on_color: '#3B2A2B' }
const moduleFromApi = { title: 'sensory', accent: '#F2A0A5', onColor: '#3B2A2B' }

describe('one post, two doors, one result', () => {
  it('the bridge puts the API names back exactly', () => {
    expect(fromAdminPost(fromApi)).toEqual(fromDatabase)
    expect(fromAdminModule(moduleFromApi)).toEqual(moduleFromDatabase)
  })

  const cases = {
    cards: () => [
      toCardsData(fromDatabase, moduleFromDatabase),
      toCardsData(fromAdminPost(fromApi), fromAdminModule(moduleFromApi)),
    ],
    report: () => [
      toReportData(fromDatabase, moduleFromDatabase),
      toReportData(fromAdminPost(fromApi), fromAdminModule(moduleFromApi)),
    ],
    longform: () => [
      toLongformData(fromDatabase, moduleFromDatabase),
      toLongformData(fromAdminPost(fromApi), fromAdminModule(moduleFromApi)),
    ],
    memo: () => [
      toMemoData(fromDatabase, moduleFromDatabase),
      toMemoData(fromAdminPost(fromApi), fromAdminModule(moduleFromApi)),
    ],
    article: () => [
      toArticleData(fromDatabase, 'sensory', [], -1, moduleFromDatabase),
      toArticleData(fromAdminPost(fromApi), 'sensory', [], -1, fromAdminModule(moduleFromApi)),
    ],
  }

  for (const [name, run] of Object.entries(cases)) {
    it(`${name}: the preview and the live page agree`, () => {
      const [live, preview] = run()
      expect(preview).toEqual(live)
    })
  }

  it('every template carries the module through', () => {
    for (const run of Object.values(cases)) {
      const [live] = run()
      expect((live as { band?: unknown }).band).toEqual({ bg: '#F2A0A5', fg: '#3B2A2B' })
    }
  })
})
