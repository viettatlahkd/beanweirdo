import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostRenderer } from './PostRenderer'
import type { PostRenderData, Template } from './types'

const bandTemplate: Template = {
  id: 't1', name: 'Band · Blush', layout: 'band',
  accent: '#F2A0A5', onColor: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4',
}

const post: PostRenderData = {
  title: 'Senses of Flavors',
  lead: 'Năm giác quan cùng tham gia vào một ngụm cà phê',
  sections: [{ h: 'Nó là gì', p: 'Chlorogenic acid không phải một chất...' }],
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
