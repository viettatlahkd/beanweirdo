import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const signInWithOtp = vi.fn().mockResolvedValue({ error: null })
vi.mock('../../lib/supabaseClient', () => ({ supabase: { auth: { signInWithOtp } } }))

const { default: LoginPage } = await import('./page')

describe('LoginPage', () => {
  it('sends a magic link for the entered email', async () => {
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.com')
    await userEvent.click(screen.getByRole('button', { name: /gửi magic link/i }))
    expect(signInWithOtp).toHaveBeenCalledWith({ email: 'admin@example.com' })
    expect(await screen.findByText(/đã gửi/i)).toBeInTheDocument()
  })
})
