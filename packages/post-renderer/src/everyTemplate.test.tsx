import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostRenderer, type PostRendererProps } from './PostRenderer'
import { POST_TEMPLATES } from '../../../backend/lib/posts'

/**
 * Rules that hold for every template, including ones nobody has written yet.
 *
 * A template is free to look like nothing else in the system — that is the
 * point of having five. But a reader must always be able to see where a post
 * is filed and get back there, so two things are not a template's own business:
 * the trail back, and the colours of the module it belongs to.
 *
 * Adding a template means adding it to `CASES`. If you do not, the first test
 * fails and says which one is missing, rather than the rule quietly not
 * applying to the new one.
 */

const BAND = { bg: 'rgb(1, 2, 3)', fg: 'rgb(4, 5, 6)' }
const CRUMB = <div>đường-quay-lại</div>

const CASES: Record<string, PostRendererProps> = {
  article: {
    template: 'article',
    post: {
      band: BAND, eyebrow: '01 — essay — 2026.02', moduleTitle: 'biochem', title: 'Bài',
      lead: 'dẫn', sections: [], pull: '', relatedHeading: '', related: [],
      furtherReadingHeading: '', furtherReading: [],
      platePrimary: { caption: '', tint: '#EEE', imageUrl: null }, plateSecondary: { caption: '', tint: '#EEE', imageUrl: null },
      heroPlate: { caption: '', tint: '#EEE', imageUrl: null }, detailPlate: { caption: '', tint: '#EEE', imageUrl: null },
    },
  },
  cards: { template: 'cards', post: { band: BAND, title: 'Bài', intro: [''], cards: [] } },
  report: { template: 'report', post: { band: BAND, title: 'Bài', blocks: [] } },
  longform: { template: 'longform', post: { band: BAND, title: 'Bài', blocks: [] } },
  memo: { template: 'memo', post: { band: BAND, title: 'Bài', specs: [], sections: [] } },
}

describe('rules every template obeys', () => {
  it('covers every template the system accepts', () => {
    expect(Object.keys(CASES).sort()).toEqual([...POST_TEMPLATES].sort())
  })

  for (const name of Object.keys(CASES)) {
    it(`${name}: shows the trail back`, () => {
      render(<PostRenderer {...CASES[name]} breadcrumb={CRUMB} />)
      expect(screen.getByText('đường-quay-lại')).toBeInTheDocument()
    })

    it(`${name}: wears its module's colours`, () => {
      const { container } = render(<PostRenderer {...CASES[name]} breadcrumb={CRUMB} />)
      const painted = Array.from(container.querySelectorAll<HTMLElement>('div')).some(
        (d) => d.style.background === BAND.bg || d.style.backgroundColor === BAND.bg,
      )
      expect(painted).toBe(true)
    })
  }
})
