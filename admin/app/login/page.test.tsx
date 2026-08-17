import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const login = vi.fn()
vi.mock('../../lib/apiClient', () => ({
  login: (...args: unknown[]) => login(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

const { default: LoginPage } = await import('./page')

beforeEach(() => {
  push.mockClear()
  login.mockReset()
})

describe('LoginPage', () => {
  it('logs in with the entered password and redirects to /posts', async () => {
    login.mockResolvedValue({ token: 'tok' })
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Mật khẩu quản trị'), 'B1bibob0bAkERY')
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))
    expect(login).toHaveBeenCalledWith('B1bibob0bAkERY')
    expect(push).toHaveBeenCalledWith('/posts')
  })

  it('has no username/email field, only a masked password input', () => {
    render(<LoginPage />)
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Mật khẩu quản trị')).toHaveAttribute('type', 'password')
  })

  it('shows an error message and does not redirect on failed login', async () => {
    const { ApiError } = await import('../../lib/apiClient')
    login.mockRejectedValue(new ApiError('Sai mật khẩu', 401))
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Mật khẩu quản trị'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sai mật khẩu')
    expect(push).not.toHaveBeenCalled()
  })
})
