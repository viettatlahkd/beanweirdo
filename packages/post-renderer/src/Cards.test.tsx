import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Cards } from './Cards'
import type { CardsPostData } from './types'

const post: CardsPostData = {
  title: 'sensory lexicon',
  intro: ['Thuật ngữ dùng trong các buổi nếm.', 'Cập nhật theo từng đợt cupping.'],
  cards: [
    {
      n: '01',
      hue: '#F2A0A5',
      groups: ['hoa'],
      title: 'Floral',
      sub: 'Hương hoa nổi trên nền chua nhẹ.',
      tag: 'hương hoa · sourness',
      parts: [
        { type: 'method', heading: 'Cách nếm', body: 'Hít nhẹ ngay khi rót, trước khi cà phê nguội.' },
        {
          type: 'detail',
          heading: 'Điểm chi tiết',
          rows: [
            { label: 'Cường độ', score: '7', note: 'rõ nhất ở nhiệt độ cao' },
            { label: 'Độ bền', score: '4' },
          ],
        },
        { type: 'callout', heading: 'Ghi chú', lines: ['Dễ nhầm với hương trái cây có hạt.'] },
      ],
    },
    {
      n: '02',
      hue: '#F0B45C',
      groups: ['ngọt'],
      title: 'Honeyed',
      sub: 'Vị ngọt mật ong, hậu vị kéo dài.',
      tag: 'hương ngọt · sweetness',
      parts: [{ type: 'method', heading: 'Cách nếm', body: 'Chú ý hậu vị sau khi nuốt.' }],
    },
  ],
}

describe('Cards', () => {
  it('lists flavour-wheel groups in the wheel order, not the deck order', () => {
    // The deck leads with Sour; the wheel puts Citrus Fruit long before it.
    const wheelPost: CardsPostData = {
      ...post,
      cards: [
        { ...post.cards[0], groups: ['Sour'] },
        { ...post.cards[1], groups: ['Citrus Fruit'] },
      ],
    }
    render(<Cards post={wheelPost} />)
    const chips = screen.getAllByRole('button', { pressed: false })
    const labels = chips.map((c) => c.textContent ?? '')
    const citrus = labels.findIndex((t) => t.includes('Citrus Fruit'))
    const sour = labels.findIndex((t) => t.includes('Sour'))
    expect(citrus).toBeGreaterThanOrEqual(0)
    expect(citrus).toBeLessThan(sour)
  })

  it('paints a selected chip in its own group colour, not one shared colour', () => {
    const wheelPost: CardsPostData = {
      ...post,
      cards: [
        { ...post.cards[0], groups: ['Berry'] },
        { ...post.cards[1], groups: ['Floral'] },
      ],
    }
    render(<Cards post={wheelPost} />)
    const chipFor = (name: string) =>
      screen.getAllByRole('button').find((el) => (el.textContent ?? '').includes(name))!

    fireEvent.click(chipFor('Berry'))
    // Berry's wash, rgb(251, 228, 236) === #FBE4EC
    expect(chipFor('Berry')).toHaveStyle({ background: 'rgb(251, 228, 236)' })

    fireEvent.click(chipFor('Floral'))
    // Floral's own wash, #F8E6FA — a different colour, not a shared green
    expect(chipFor('Floral')).toHaveStyle({ background: 'rgb(248, 230, 250)' })
  })

  it('renders the header title and intro lines', () => {
    render(<Cards post={post} />)
    expect(screen.getByRole('heading', { name: 'sensory lexicon' })).toBeInTheDocument()
    expect(screen.getByText(post.intro[0])).toBeInTheDocument()
    expect(screen.getByText(post.intro[1])).toBeInTheDocument()
  })

  it('renders every card term, subtitle and tag collapsed by default', () => {
    render(<Cards post={post} />)
    expect(screen.getByText('Floral')).toBeInTheDocument()
    expect(screen.getByText('Honeyed')).toBeInTheDocument()
    expect(screen.getByText(post.cards[0].sub)).toBeInTheDocument()
    expect(screen.getByText(post.cards[0].tag)).toBeInTheDocument()
    // collapsed: part content not in the document yet
    expect(screen.queryByText('Hít nhẹ ngay khi rót, trước khi cà phê nguội.')).not.toBeInTheDocument()
  })

  it('expands a card on click to reveal its parts (method, detail rows, callout)', () => {
    render(<Cards post={post} />)
    fireEvent.click(screen.getByText('Floral'))
    expect(screen.getByText('Hít nhẹ ngay khi rót, trước khi cà phê nguội.')).toBeInTheDocument()
    expect(screen.getByText('Cường độ')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('rõ nhất ở nhiệt độ cao')).toBeInTheDocument()
    expect(screen.getByText('Dễ nhầm với hương trái cây có hạt.')).toBeInTheDocument()
  })

  it('collapses an expanded card on a second click', () => {
    render(<Cards post={post} />)
    const term = screen.getByText('Floral')
    fireEvent.click(term)
    expect(screen.getByText('Cường độ')).toBeInTheDocument()
    fireEvent.click(term)
    expect(screen.queryByText('Cường độ')).not.toBeInTheDocument()
  })

  it('renders one filter chip per distinct group with a count', () => {
    render(<Cards post={post} />)
    expect(screen.getByText('hoa')).toBeInTheDocument()
    expect(screen.getByText('ngọt')).toBeInTheDocument()
  })

  it('filters the card list down to one group when its chip is clicked', () => {
    render(<Cards post={post} />)
    fireEvent.click(screen.getByText('hoa'))
    expect(screen.getByText('Floral')).toBeInTheDocument()
    expect(screen.queryByText('Honeyed')).not.toBeInTheDocument()
  })

  it('renders a table-of-contents entry per card', () => {
    render(<Cards post={post} />)
    expect(screen.getByText('01 · Floral')).toBeInTheDocument()
    expect(screen.getByText('02 · Honeyed')).toBeInTheDocument()
  })

  it('uses renderCardTitle and renderCardSub overrides for WYSIWYG term/definition editing', () => {
    render(
      <Cards
        post={post}
        renderCardTitle={(title, i) => <input aria-label={`term-${i}`} defaultValue={title} />}
        renderCardSub={(sub, i) => <textarea aria-label={`definition-${i}`} defaultValue={sub} />}
      />,
    )
    expect(screen.getByLabelText('term-0')).toHaveValue('Floral')
    expect(screen.getByLabelText('definition-0')).toHaveValue(post.cards[0].sub)
  })
})
