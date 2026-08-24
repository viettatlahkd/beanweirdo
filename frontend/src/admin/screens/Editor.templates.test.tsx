import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditorCanvas } from './Editor'
import { POST_TEMPLATES } from '../../../../backend/lib/posts'

/*
 * The canvas dispatched on `cards` and `report` and let everything else fall
 * through to the article editor. A long-form post therefore opened as an
 * article — the owner picked Long-form, saw Article, and editing it would have
 * written article-shaped sections over a parsed export.
 *
 * So: every template the database accepts must reach a canvas that draws that
 * template. Adding a sixth without a branch here fails the run.
 */
const post = (template: string) => ({
  id: 'p1',
  module_id: 'sensory',
  en: 'Tiêu đề',
  vi: 'Mô tả',
  kind: 'note',
  template,
  date_label: '2026.08',
  status: 'draft',
  body: template === 'memo' ? { sections: [] } : [],
  lead: null,
  hero_image_url: null,
  hero_caption: null,
  pull_quote: null,
  further_reading: [],
  sort_order: null,
  pinned: false,
  created_at: '',
  updated_at: '',
  published_at: null,
}) as never

describe('EditorCanvas', () => {
  it('draws every template the database accepts', () => {
    for (const template of POST_TEMPLATES) {
      const { container, unmount } = render(
        <EditorCanvas
          template={template as never}
          post={post(template)}
          onChange={vi.fn()}
          onHeroDrop={vi.fn()}
        />,
      )
      // Something reached the page — a template with no branch used to render
      // the article canvas, which is worse than rendering nothing.
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0)
      unmount()
    }
  })

  it('lets a memo be edited in place, which it could not before', () => {
    render(
      <EditorCanvas template={'memo' as never} post={post('memo')} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
    )
    // Its title is a field of the post, so the canvas offers it.
    expect(screen.getAllByDisplayValue('Tiêu đề').length).toBeGreaterThan(0)
  })

  it('does not edit a long-form post as an article', () => {
    render(
      <EditorCanvas template={'longform' as never} post={post('longform')} onChange={vi.fn()} onHeroDrop={vi.fn()} />,
    )
    // The article canvas offers a lead field; long-form has no such thing.
    expect(screen.queryByPlaceholderText(/sapo|lead/i)).toBeNull()
  })
})
