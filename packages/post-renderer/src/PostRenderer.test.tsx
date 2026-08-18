import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostRenderer } from './PostRenderer'
import type { ArticlePostData, CardsPostData, ReportPostData } from './types'

const plate = { caption: 'plate', tint: '#E4F0DF' }

const articlePost: ArticlePostData = {
  eyebrow: 'Eyebrow',
  moduleTitle: 'Module',
  title: 'An Article Title',
  lead: 'A lead sentence.',
  platePrimary: plate,
  plateSecondary: plate,
  heroPlate: plate,
  sections: [{ h: 'Section', p: 'Body text.' }],
  pull: 'A pull quote.',
  relatedHeading: 'Related',
  related: [],
  detailPlate: plate,
  furtherReadingHeading: 'Further reading',
  furtherReading: [],
}

const cardsPost: CardsPostData = {
  title: 'A Cards Title',
  intro: ['Intro line one.'],
  cards: [{ n: '01', hue: '#F2A0A5', groups: ['g'], title: 'Term', sub: 'Definition', tag: 'tag', parts: [] }],
}

const reportPost: ReportPostData = {
  title: 'A Report Title',
  blocks: [{ type: 'paragraph', text: 'Report body text.' }],
}

describe('PostRenderer dispatcher', () => {
  it('renders the Article component when template is "article"', () => {
    render(<PostRenderer template="article" post={articlePost} />)
    expect(screen.getByTestId('article-title')).toHaveTextContent('An Article Title')
  })

  it('renders the Cards component when template is "cards"', () => {
    render(<PostRenderer template="cards" post={cardsPost} />)
    expect(screen.getByRole('heading', { name: 'A Cards Title' })).toBeInTheDocument()
    expect(screen.getByText('Term')).toBeInTheDocument()
  })

  it('renders the Report component when template is "report"', () => {
    render(<PostRenderer template="report" post={reportPost} />)
    expect(screen.getByRole('heading', { name: 'A Report Title' })).toBeInTheDocument()
    expect(screen.getByText('Report body text.')).toBeInTheDocument()
  })

  it('forwards template-specific overrides through the dispatcher', () => {
    render(
      <PostRenderer
        template="article"
        post={articlePost}
        renderTitle={(title) => <input aria-label="dispatched-title" defaultValue={title} />}
      />,
    )
    expect(screen.getByLabelText('dispatched-title')).toHaveValue('An Article Title')
  })
})
