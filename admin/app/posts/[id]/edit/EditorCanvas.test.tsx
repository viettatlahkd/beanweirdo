import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorCanvas } from './EditorCanvas'

const template = { id: 't1', name: 'Sequence · Apricot', layout: 'sequence' as const, accent: '#F0B45C', onColor: '#3B2E19', tint: '#F9EBD2', tint2: '#F3DCAE' }
const post = { title: 'Senses of Flavors', sections: [{ h: 'Nó là gì', p: 'nội dung cũ' }] }

describe('EditorCanvas', () => {
  it('renders inputs seeded with post data and reports edits', async () => {
    const onTitleChange = vi.fn()
    const onSectionBodyChange = vi.fn()
    render(
      <EditorCanvas
        template={template}
        post={post}
        onTitleChange={onTitleChange}
        onSectionBodyChange={onSectionBodyChange}
        onHeroDrop={vi.fn()}
      />,
    )
    const titleInput = screen.getByDisplayValue('Senses of Flavors')
    await userEvent.type(titleInput, '!')
    expect(onTitleChange).toHaveBeenCalled()

    const bodyInput = screen.getByDisplayValue('nội dung cũ')
    await userEvent.type(bodyInput, '!')
    expect(onSectionBodyChange).toHaveBeenCalledWith(0, expect.stringContaining('nội dung cũ'))
  })
})
