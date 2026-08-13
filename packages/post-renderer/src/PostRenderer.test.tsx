import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostRenderer } from './PostRenderer'
import type { PostRenderData, Template } from './types'

const bandTemplate: Template = {
  id: 't1', name: 'Band · Blush', layout: 'band',
  accent: '#F2A0A5', onColor: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4',
}

const specimenTemplate: Template = { ...bandTemplate, id: 't2', layout: 'specimen' }
const sequenceTemplate: Template = { ...bandTemplate, id: 't3', layout: 'sequence' }

const post: PostRenderData = {
  title: 'Senses of Flavors',
  lead: 'Năm giác quan cùng tham gia vào một ngụm cà phê',
  sections: [{ h: 'Nó là gì', p: 'Chlorogenic acid không phải một chất...' }],
}

const postWithFig: PostRenderData = {
  ...post,
  sections: [
    {
      h: 'Nó là gì',
      p: 'Chlorogenic acid không phải một chất...',
      fig: {
        h: 'Molecule',
        w: '240px',
        margin: '0 auto',
        caption: 'A chlorogenic acid molecule diagram',
        label: 'fig-1',
        note: 'source: lab notes',
        imageUrl: 'https://example.com/molecule.png',
      },
    },
  ],
}

describe('PostRenderer — band layout', () => {
  it('renders the title, lead, and section content', () => {
    render(<PostRenderer template={bandTemplate} post={post} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Senses of Flavors' })).toBeInTheDocument()
    expect(screen.getByText(post.lead!)).toBeInTheDocument()
    expect(screen.getByText('Nó là gì')).toBeInTheDocument()
    expect(screen.getByText(/Chlorogenic acid/)).toBeInTheDocument()
  })

  it('applies the template accent color to the hero band', () => {
    render(<PostRenderer template={bandTemplate} post={post} />)
    expect(screen.getByTestId('post-hero')).toHaveStyle({ background: bandTemplate.accent })
  })
})

it('renders a specimen-layout post with a split hero', () => {
  const specimenTemplate: Template = { ...bandTemplate, id: 't2', layout: 'specimen' }
  render(<PostRenderer template={specimenTemplate} post={post} />)
  expect(screen.getByTestId('post-hero-specimen')).toBeInTheDocument()
})

it('renders a sequence-layout post with an oversized title block', () => {
  const sequenceTemplate: Template = { ...bandTemplate, id: 't3', layout: 'sequence' }
  render(<PostRenderer template={sequenceTemplate} post={post} />)
  expect(screen.getByTestId('post-hero-sequence')).toBeInTheDocument()
})

it('uses renderTitle override instead of the default heading when provided', () => {
  render(
    <PostRenderer
      template={bandTemplate}
      post={post}
      renderTitle={(title) => <input defaultValue={title} aria-label="edit title" />}
    />,
  )
  expect(screen.getByLabelText('edit title')).toHaveValue('Senses of Flavors')
  expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
})

it('uses renderSectionBody override for section paragraphs when provided', () => {
  render(
    <PostRenderer
      template={bandTemplate}
      post={post}
      renderSectionBody={(p, i) => <textarea aria-label={`section-${i}-body`} defaultValue={p} />}
    />,
  )
  expect(screen.getByLabelText('section-0-body')).toHaveValue(post.sections[0].p)
})

describe('default title style per layout', () => {
  it('band layout renders a 56px title with no line-height set', () => {
    render(<PostRenderer template={bandTemplate} post={post} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveStyle({ fontSize: '56px' })
    expect(heading.style.lineHeight).toBe('')
  })

  it('specimen layout renders a 48px title with no line-height set', () => {
    render(<PostRenderer template={specimenTemplate} post={post} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveStyle({ fontSize: '48px' })
    expect(heading.style.lineHeight).toBe('')
  })

  it('sequence layout renders an 88px title with line-height 0.95', () => {
    render(<PostRenderer template={sequenceTemplate} post={post} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveStyle({ fontSize: '88px' })
    expect(heading).toHaveStyle({ lineHeight: '0.95' })
  })
})

describe('default figure rendering', () => {
  it('renders a figure with image and caption when a section has fig data, with no override', () => {
    render(<PostRenderer template={bandTemplate} post={postWithFig} />)
    expect(screen.getByText('A chlorogenic acid molecule diagram')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/molecule.png')
  })

  it('renders no figure when a section has no fig data', () => {
    render(<PostRenderer template={bandTemplate} post={post} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('figure')).not.toBeInTheDocument()
  })
})

describe.each([
  ['band', bandTemplate],
  ['specimen', specimenTemplate],
  ['sequence', sequenceTemplate],
] as const)('render-prop overrides on %s layout', (_layoutName, template) => {
  it('uses renderTitle override instead of the default heading', () => {
    render(
      <PostRenderer
        template={template}
        post={post}
        renderTitle={(title) => <input defaultValue={title} aria-label="edit title" />}
      />,
    )
    expect(screen.getByLabelText('edit title')).toHaveValue('Senses of Flavors')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('uses renderHero override with the post heroImageUrl', () => {
    render(
      <PostRenderer
        template={template}
        post={{ ...post, heroImageUrl: 'https://example.com/hero.png' }}
        renderHero={(url) => <div data-testid="hero-override">{url ?? 'none'}</div>}
      />,
    )
    expect(screen.getByTestId('hero-override')).toHaveTextContent('https://example.com/hero.png')
  })
})

describe('renderTitle override inherits real layout typography', () => {
  it('wraps the sequence-layout override in a container carrying the real 88px/0.95 title style', () => {
    render(
      <PostRenderer
        template={sequenceTemplate}
        post={post}
        renderTitle={(title) => <input data-testid="title-input" defaultValue={title} style={{ font: 'inherit' }} />}
      />,
    )
    const input = screen.getByTestId('title-input')
    const wrapper = input.parentElement as HTMLElement
    expect(wrapper).toHaveStyle({ fontSize: '88px', lineHeight: '0.95' })
  })

  it('wraps the band-layout override in a container carrying the real 56px title style', () => {
    render(
      <PostRenderer
        template={bandTemplate}
        post={post}
        renderTitle={(title) => <input data-testid="title-input" defaultValue={title} style={{ font: 'inherit' }} />}
      />,
    )
    const input = screen.getByTestId('title-input')
    const wrapper = input.parentElement as HTMLElement
    expect(wrapper).toHaveStyle({ fontSize: '56px' })
  })
})

describe('default hero rendering (no renderHero override)', () => {
  it('renders an <img> for the hero when heroImageUrl is set', () => {
    render(<PostRenderer template={bandTemplate} post={{ ...post, heroImageUrl: 'https://example.com/hero.png' }} />)
    // hero <img> has alt="" (decorative), so it has role "presentation" not "img" — query by tag instead.
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://example.com/hero.png')
  })

  it('renders nothing extra for the hero when heroImageUrl is not set', () => {
    render(<PostRenderer template={bandTemplate} post={post} />)
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })
})
