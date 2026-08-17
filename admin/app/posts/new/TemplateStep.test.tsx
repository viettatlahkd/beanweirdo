import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TemplateStep } from './TemplateStep'

describe('TemplateStep', () => {
  it('shows the 3 fixed templates (no fetch) and calls onContinue with the picked one', async () => {
    const onContinue = vi.fn()
    render(<TemplateStep onContinue={onContinue} />)

    expect(screen.getByText('Article')).toBeInTheDocument()
    expect(screen.getByText('Cards')).toBeInTheDocument()
    expect(screen.getByText('Report')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Cards'))
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith('cards')
  })

  it('disables continue until a template is picked', () => {
    render(<TemplateStep onContinue={vi.fn()} />)
    expect(screen.getByRole('button', { name: /tiếp tục/i })).toBeDisabled()
  })

  it('picking Article calls onContinue with "article"', async () => {
    const onContinue = vi.fn()
    render(<TemplateStep onContinue={onContinue} />)
    await userEvent.click(screen.getByText('Article'))
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith('article')
  })

  it('picking Report calls onContinue with "report"', async () => {
    const onContinue = vi.fn()
    render(<TemplateStep onContinue={onContinue} />)
    await userEvent.click(screen.getByText('Report'))
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith('report')
  })
})
