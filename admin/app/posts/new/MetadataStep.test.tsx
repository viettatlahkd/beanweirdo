import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MetadataStep } from './MetadataStep'

describe('MetadataStep', () => {
  it('calls onContinue with the entered metadata', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)
    await userEvent.selectOptions(screen.getByLabelText('Module'), 'roasting')
    await userEvent.selectOptions(screen.getByLabelText('Loại bài'), 'essay')
    await userEvent.type(screen.getByLabelText('Tiêu đề (EN)'), 'Senses of Flavors')
    await userEvent.type(screen.getByLabelText('Mô tả (VI)'), 'mô tả')
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith({ moduleId: 'roasting', kind: 'essay', en: 'Senses of Flavors', vi: 'mô tả' })
  })
})
