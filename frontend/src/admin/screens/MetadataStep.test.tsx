import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MetadataStep } from './MetadataStep'

const createTag = vi.fn().mockResolvedValue({ id: 'thi-nghiem', label: 'thí nghiệm' })

vi.mock('../lib/apiClient', () => ({
  listModules: vi.fn().mockResolvedValue([
    { id: 'sensory', title: 'Sensory', kind: 'normal', accent: '#F2A0A5', on_color: '#3B1F22' },
    { id: 'roasting', title: 'Roasting', kind: 'normal', accent: '#8A6420', on_color: '#FFFFFF' },
    // A journal has no colour of its own — the picker must not fall over on it,
    // and it is exactly the case that needs the list of other themes.
    { id: 'ghi01', title: 'Ghi 01', kind: 'special' },
  ]),
  listTags: vi.fn().mockResolvedValue([{ id: 'note', label: 'note' }]),
  listTemplates: vi.fn().mockResolvedValue([
    { id: 't-article', name: 'Article', renderer: 'article', description: '' },
    { id: 't-longform', name: 'Long-form', renderer: 'longform', description: '' },
  ]),
  createTag: (label: string) => createTag(label),
  listTopics: vi.fn().mockResolvedValue([
    { id: 'bean-weirdo', parent_id: null, title: 'bean weirdo', sort_order: 1 },
    { id: 'roasting', parent_id: 'bean-weirdo', title: 'roasting', sort_order: 1 },
  ]),
}))

/** Every post is filed on the topic tree before it exists (migration 0027). */
async function pickTopic(id = 'roasting') {
  await waitFor(() => expect(screen.getByRole('option', { name: /› roasting/ })).toBeInTheDocument())
  await userEvent.selectOptions(screen.getByLabelText('Chủ đề'), id)
}

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
    await pickTopic()
    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Senses of Flavors')
    await userEvent.type(screen.getByLabelText('Mô tả'), 'mô tả')
    await userEvent.click(screen.getByRole('button', { name: /soạn bài/i }))

    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith({
        module_id: 'roasting',
        topic_id: 'roasting',
        kind: '',
        en: 'Senses of Flavors',
        vi: 'mô tả',
        templateId: 't-longform',
        // Null, not the module's colour: a post that merely copied the colour
        // would keep the old one when the module was recoloured later.
        theme_color: null,
      }),
    )
  })

  it('needs a title, and asks for nothing in a particular language', async () => {
    render(<MetadataStep onContinue={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    expect(screen.getByRole('button', { name: /soạn bài/i })).toBeDisabled()
    expect(screen.queryByLabelText(/\(EN\)|\(VI\)/)).toBeNull()

    await pickTopic()
    expect(screen.getByRole('button', { name: /soạn bài/i })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới')
    expect(screen.getByRole('button', { name: /soạn bài/i })).toBeEnabled()
  })
})

describe('MetadataStep — màu bài', () => {
  it('follows the module by default, and stores nothing for it', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    await pickTopic()
    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới')
    await userEvent.click(screen.getByRole('button', { name: /soạn bài/i }))

    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ theme_color: null })))
  })

  it('takes a colour of its own when one is picked', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    // Every swatch is named the same way: whose colour it is, then the code.
    const other = await screen.findByLabelText('Roasting — #8A6420')
    await userEvent.click(other)
    await pickTopic()
    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới')
    await userEvent.click(screen.getByRole('button', { name: /soạn bài/i }))

    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith(
        expect.objectContaining({ theme_color: expect.stringMatching(/^#/) }),
      ),
    )
  })
})

describe('MetadataStep — mã màu', () => {
  it('names every colour the same way: whose it is, then the code', async () => {
    render(<MetadataStep onContinue={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    expect(screen.getByLabelText('Sensory — #F2A0A5')).toBeInTheDocument()
    expect(screen.getByLabelText('Roasting — #8A6420')).toBeInTheDocument()
    expect(screen.getByText('Sensory — #F2A0A5')).toBeInTheDocument()
  })

  it('takes a code pasted in, and says it belongs to nobody', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    const hex = screen.getByLabelText('mã màu')
    await userEvent.clear(hex)
    await userEvent.paste('#773236')

    expect(screen.getByText('customize — #773236')).toBeInTheDocument()

    await pickTopic()
    await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Bài mới')
    await userEvent.click(screen.getByRole('button', { name: /soạn bài/i }))
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ theme_color: '#773236' })))
  })

  it('holds still while a code is half-typed', async () => {
    render(<MetadataStep onContinue={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))

    const hex = screen.getByLabelText('mã màu')
    await userEvent.clear(hex)
    await userEvent.type(hex, '#77')
    // Three characters are not a colour — the post keeps the one it had.
    expect(screen.getByText('Sensory — #F2A0A5')).toBeInTheDocument()
  })
})
