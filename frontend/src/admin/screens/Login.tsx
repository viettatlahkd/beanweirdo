import { useState, type FormEvent } from 'react'
import { ApiError, login } from '../lib/apiClient'
import { useAdminNav } from '../lib/nav'
import { garden, ink, paper, sans, serif } from '../../design/tokens'

export function Login() {
  const nav = useAdminNav()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(password)
      nav.goDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể đăng nhập. Vui lòng thử lại.')
      setPending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: paper.white }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 260, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 34 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: garden.blush, flex: 'none' }} />
          <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 21, letterSpacing: '-0.01em', color: ink.base }}>
            bean weirdo
          </span>
        </div>

        <label
          htmlFor="password"
          style={{
            display: 'block',
            fontSize: 10,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: ink.muted,
            marginBottom: 10,
          }}
        >
          Mật khẩu quản trị
        </label>
        <input
          id="password"
          aria-label="Mật khẩu quản trị"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{
            fontFamily: sans,
            fontWeight: 300,
            fontSize: 15,
            border: 'none',
            borderBottom: `1px solid ${paper.rule}`,
            background: 'transparent',
            width: '100%',
            textAlign: 'center',
            padding: '6px 0 10px',
            color: ink.base,
            outline: 'none',
          }}
        />

        <button
          type="submit"
          disabled={pending || password.length === 0}
          className="admin-btn"
          style={{
            marginTop: 26,
            width: '100%',
            fontSize: 11,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            padding: 13,
          }}
        >
          {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>

        {error && (
          <p role="alert" style={{ fontSize: 12, color: '#B3413E', marginTop: 14 }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: 16, fontSize: 11, color: ink.faint }}>admin.beanweirdo.app</div>
      </form>
    </div>
  )
}
