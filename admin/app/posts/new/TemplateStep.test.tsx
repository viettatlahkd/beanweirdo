import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TemplateStep } from './TemplateStep'

vi.mock('../../../lib/apiClient', () => ({
  listTemplates: vi.fn().mockResolvedValue([
    { id: 't1', name: 'Band · Blush', layout: 'band', accent: '#F2A0A5', onColor: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4' },
  ]),
}))

describe('TemplateStep', () => {
  it('lists templates and calls onContinue with the picked id', async () => {
    const onContinue = vi.fn()
    render(<TemplateStep onContinue={onContinue} />)
    await userEvent.click(await screen.findByText('Band · Blush'))
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith('t1')
  })
})
