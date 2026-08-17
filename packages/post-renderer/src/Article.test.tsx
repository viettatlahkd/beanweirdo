import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Article } from './Article'
import type { ArticlePostData } from './types'

const plate = { caption: 'ảnh chính', tint: '#E4F0DF' }

const post: ArticlePostData = {
  eyebrow: 'Hoá học nhân',
  moduleTitle: 'Sinh hoá hạt',
  title: 'Chlorogenic Acids ',
  titleItalic: '(CGA)',
  lead: 'Nguồn gốc của vị chát trong tách cà phê.',
  platePrimary: { ...plate, caption: 'mặt cắt hạt' },
  plateSecondary: { ...plate, caption: 'nhân xanh, 3:4' },
  heroPlate: { ...plate, caption: 'quả chín, chụp thẳng', tint: '#F2A0A5' },
  sections: [
    { h: 'Nó là gì', p: 'Chlorogenic acid không phải một chất...' },
    {
      h: 'Vì sao quan trọng',
      p: 'Nó quyết định vị chát khi rang.',
      fig: {
        label: 'fig-1',
        note: 'source: lab notes',
        caption: 'A chlorogenic acid molecule diagram',
        w: '240px',
        h: '160px',
        tint: '#F9EBD2',
        margin: '12px 0',
      },
    },
  ],
  pull: 'Chát không phải là lỗi.',
  relatedHeading: 'Trong module này',
  related: [{ label: 'Sucrose & caramel hoá' }, { label: 'Vỏ lụa & tannin' }],
  detailPlate: { ...plate, caption: 'chi tiết vỏ lụa, 1:1' },
  furtherReadingHeading: 'Đọc thêm',
  furtherReading: ['Clifford (1999), Chlorogenic acids', 'Farah & Donangelo (2006)'],
}

describe('Article', () => {
  it('renders title (with italic suffix), lead, and section content', () => {
    render(<Article post={post} />)
    const title = screen.getByTestId('article-title')
    expect(title).toHaveTextContent('Chlorogenic Acids (CGA)')
    expect(screen.getByText(post.lead)).toBeInTheDocument()
    expect(screen.getByText('Nó là gì')).toBeInTheDocument()
    expect(screen.getByText(/Chlorogenic acid không phải/)).toBeInTheDocument()
  })

  it('renders the eyebrow and module breadcrumb', () => {
    render(<Article post={post} />)
    expect(screen.getByText(post.eyebrow)).toBeInTheDocument()
    expect(screen.getByText(`← ${post.moduleTitle}`)).toBeInTheDocument()
  })

  it('renders a figure only for sections that have fig data', () => {
    render(<Article post={post} />)
    expect(screen.getByText('A chlorogenic acid molecule diagram')).toBeInTheDocument()
    expect(screen.getByText('source: lab notes')).toBeInTheDocument()
  })

  it('renders the sticky-rail pull quote, related items, and further reading', () => {
    render(<Article post={post} />)
    expect(screen.getByText(post.pull)).toBeInTheDocument()
    expect(screen.getByText('Sucrose & caramel hoá')).toBeInTheDocument()
    expect(screen.getByText('Vỏ lụa & tannin')).toBeInTheDocument()
    expect(screen.getByText('Clifford (1999), Chlorogenic acids')).toBeInTheDocument()
  })

  it('renders the hero plate tint color when no imageUrl is given', () => {
    render(<Article post={post} />)
    expect(screen.getByTestId('article-hero-plate')).toHaveStyle({ background: post.heroPlate.tint })
  })

  it('uses renderTitle override instead of the default heading text', () => {
    render(
      <Article
        post={post}
        renderTitle={(title) => <input defaultValue={title} aria-label="edit title" />}
      />,
    )
    expect(screen.getByLabelText('edit title')).toHaveValue(post.title)
    expect(screen.getByTestId('article-title').tagName).toBe('H1')
  })

  it('uses renderSectionBody override for section paragraphs', () => {
    render(
      <Article
        post={post}
        renderSectionBody={(p, i) => <textarea aria-label={`section-${i}-body`} defaultValue={p} />}
      />,
    )
    expect(screen.getByLabelText('section-0-body')).toHaveValue(post.sections[0].p)
  })

  it('uses renderPullQuote override for the sticky-rail quote', () => {
    render(
      <Article post={post} renderPullQuote={(pull) => <textarea aria-label="edit pull" defaultValue={pull} />} />,
    )
    expect(screen.getByLabelText('edit pull')).toHaveValue(post.pull)
  })

  it('uses renderFigure override instead of the default figure block', () => {
    render(<Article post={post} renderFigure={(fig) => <div data-testid="fig-override">{fig.caption}</div>} />)
    expect(screen.getByTestId('fig-override')).toHaveTextContent('A chlorogenic acid molecule diagram')
  })
})
