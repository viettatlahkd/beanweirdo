import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listTemplates = vi.fn()
vi.mock('../lib/apiClient', () => ({ listTemplates: () => listTemplates() }))

const { TemplateStep } = await import('./TemplateStep')

const templates = [
  { id: 't1', name: 'Article', description: 'Essay hai cột', renderer: 'article', sort_order: 1 },
  { id: 't2', name: 'Long-form', description: 'Bài rất dài', renderer: 'longform', sort_order: 2 },
]

beforeEach(() => {
  listTemplates.mockReset().mockResolvedValue(templates)
})

describe('TemplateStep', () => {
  it('lists the stored templates rather than a hardcoded set', async () => {
    // The count of templates is a fact about the table, not about this file:
    // adding a sixth is a row, and it appears here on its own.
    render(<TemplateStep onContinue={vi.fn()} />)
    expect(await screen.findByText('Article')).toBeInTheDocument()
    expect(screen.getByText('Long-form')).toBeInTheDocument()
    expect(screen.getByText('Bài rất dài')).toBeInTheDocument()
    expect(listTemplates).toHaveBeenCalled()
  })

  it('hands back the template id, not a renderer name', async () => {
    // The id is what lets the server copy that template's body across.
    const onContinue = vi.fn()
    render(<TemplateStep onContinue={onContinue} />)

    await userEvent.click(await screen.findByText('Long-form'))
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith('t2')
  })

  it('keeps continue disabled until something is picked', async () => {
    render(<TemplateStep onContinue={vi.fn()} />)
    await screen.findByText('Article')
    expect(screen.getByRole('button', { name: /tiếp tục/i })).toBeDisabled()
  })

  it('surfaces a failure to load instead of showing an empty list', async () => {
    listTemplates.mockRejectedValue(new Error('mạng hỏng'))
    render(<TemplateStep onContinue={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('mạng hỏng')
  })
})
