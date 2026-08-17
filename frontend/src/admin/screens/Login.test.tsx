import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const goDashboard = vi.fn()
vi.mock('../lib/nav', () => ({
  useAdminNav: () => ({
    screen: 'login',
    postId: null,
    goLogin: vi.fn(),
    goDashboard,
    goNew: vi.fn(),
    goEdit: vi.fn(),
    goPreview: vi.fn(),
  }),
}))

const login = vi.fn()
vi.mock('../lib/apiClient', () => ({
  login: (...args: unknown[]) => login(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

const { Login } = await import('./Login')

beforeEach(() => {
  goDashboard.mockClear()
  login.mockReset()
})

describe('Login', () => {
  it('logs in with the entered password and navigates to the dashboard', async () => {
    login.mockResolvedValue({ token: 'tok' })
    render(<Login />)
    await userEvent.type(screen.getByLabelText('Mật khẩu quản trị'), 'B1bibob0bAkERY')
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))
    expect(login).toHaveBeenCalledWith('B1bibob0bAkERY')
    expect(goDashboard).toHaveBeenCalled()
  })

  it('has no username/email field, only a masked password input', () => {
    render(<Login />)
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Mật khẩu quản trị')).toHaveAttribute('type', 'password')
  })

  it('shows an error message and does not navigate on failed login', async () => {
    const { ApiError } = await import('../lib/apiClient')
    login.mockRejectedValue(new ApiError('Sai mật khẩu', 401))
    render(<Login />)
    await userEvent.type(screen.getByLabelText('Mật khẩu quản trị'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sai mật khẩu')
    expect(goDashboard).not.toHaveBeenCalled()
  })
})
