import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MetadataStep } from './MetadataStep'

vi.mock('../lib/apiClient', () => ({
  listModules: vi.fn().mockResolvedValue([
    { id: 'sensory', title: 'Sensory' },
    { id: 'roasting', title: 'Roasting' },
    { id: 'biochem', title: 'Biochem' },
  ]),
}))

describe('MetadataStep', () => {
  it('fetches real modules via apiClient and calls onContinue with the entered metadata', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)

    // waits for listModules() to resolve and populate the select
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))
    expect(screen.getByText('Roasting')).toBeInTheDocument()
    expect(screen.getByText('Biochem')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Module'), 'roasting')
    await userEvent.selectOptions(screen.getByLabelText('Loại bài'), 'essay')
    await userEvent.type(screen.getByLabelText('Tiêu đề (EN)'), 'Senses of Flavors')
    await userEvent.type(screen.getByLabelText('Mô tả (VI)'), 'mô tả')
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))

    expect(onContinue).toHaveBeenCalledWith({ module_id: 'roasting', kind: 'essay', en: 'Senses of Flavors', vi: 'mô tả' })
  })

  it('disables continue until module, EN and VI titles are filled', async () => {
    render(<MetadataStep onContinue={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Module')).toHaveValue('sensory'))
    expect(screen.getByRole('button', { name: /tiếp tục/i })).toBeDisabled()
  })
})
