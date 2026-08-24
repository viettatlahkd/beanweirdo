import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MetadataStep } from './MetadataStep'

const createTag = vi.fn().mockResolvedValue({ id: 'thi-nghiem', label: 'thí nghiệm' })

vi.mock('../lib/apiClient', () => ({
  listModules: vi.fn().mockResolvedValue([
    { id: 'sensory', title: 'Sensory', kind: 'normal' },
    { id: 'roasting', title: 'Roasting', kind: 'normal' },
    { id: 'ghi01', title: 'Ghi 01', kind: 'special' },
  ]),
  listTags: vi.fn().mockResolvedValue([{ id: 'note', label: 'note' }]),
  listTemplates: vi.fn().mockResolvedValue([
    { id: 't-article', name: 'Article', renderer: 'article', description: '' },
    { id: 't-longform', name: 'Long-form', renderer: 'longform', description: '' },
  ]),
  createTag: (label: string) => createTag(label),
}))

describe('MetadataStep', () => {
  it('asks for everything a post needs in one form', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)

    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))
    // The template used to be a second step, on a page that had forgotten what
    // the post was about.
    await waitFor(() => expect(screen.getByLabelText('Template')).toHaveValue('t-article'))

    await userEvent.selectOptions(screen.getByLabelText('Module'), 'roasting')
    await userEvent.selectOptions(screen.getByLabelText('Template'), 't-longform')
    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Senses of Flavors')
    await userEvent.type(screen.getByLabelText('Mô tả'), 'mô tả')
    await userEvent.click(screen.getByRole('button', { name: /soạn bài/i }))

    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith({
        module_id: 'roasting',
        kind: 'note',
        en: 'Senses of Flavors',
        vi: 'mô tả',
        templateId: 't-longform',
      }),
    )
  })

  /*
   * `kind` was four words a programmer picked, fenced by a database constraint.
   * A tag typed for the first time is written down, so it is offered next time.
   */
  it('writes down a tag it has not seen before', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    await userEvent.clear(screen.getByLabelText('Tag'))
    await userEvent.type(screen.getByLabelText('Tag'), 'thí nghiệm')
    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới')
    await userEvent.click(screen.getByRole('button', { name: /soạn bài/i }))

    await waitFor(() => expect(createTag).toHaveBeenCalledWith('thí nghiệm'))
    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'thi-nghiem' })),
    )
  })

  it('does not write down a tag it already knows', async () => {
    createTag.mockClear()
    render(<MetadataStep onContinue={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Tag')).toHaveValue('note'))

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới')
    await userEvent.click(screen.getByRole('button', { name: /soạn bài/i }))

    await waitFor(() => expect(createTag).not.toHaveBeenCalled())
  })

  /* A description is a nicety; a title is what the post is called. */
  it('needs a title, and asks for nothing in a particular language', async () => {
    render(<MetadataStep onContinue={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    expect(screen.getByRole('button', { name: /soạn bài/i })).toBeDisabled()
    expect(screen.queryByLabelText(/\(EN\)|\(VI\)/)).toBeNull()

    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới')
    expect(screen.getByRole('button', { name: /soạn bài/i })).toBeEnabled()
  })
})
