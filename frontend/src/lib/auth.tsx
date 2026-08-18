import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError, clearToken, getToken, listPosts } from '../admin/lib/apiClient'
import { Login } from '../admin/screens/Login'

export type AuthState = {
  /** True until the stored token has been checked against the API. */
  checking: boolean
  authed: boolean
  signedIn(): void
  signOut(): void
}

const AuthContext = createContext<AuthState>({
  checking: false,
  authed: false,
  signedIn() {},
  signOut() {},
})

export const useAuth = () => useContext(AuthContext)

/**
 * One login for both private areas.
 *
 * A token sitting in localStorage proves nothing on its own — it could be
 * expired or forged — so it is verified with a cheap authenticated call before
 * anything private renders. With no token at all we skip the call entirely:
 * the public journal must not pay a round trip for a login the visitor doesn't
 * have.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(() => Boolean(getToken()))
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (!getToken()) return
    let cancelled = false

    listPosts('draft')
      .then(() => {
        if (!cancelled) setAuthed(true)
      })
      .catch((err) => {
        if (cancelled) return
        // A 401 means the token is genuinely dead — drop it. Anything else
        // (network down) leaves it alone but still keeps the gate shut.
        if (err instanceof ApiError && err.status === 401) clearToken()
        setAuthed(false)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signedIn = useCallback(() => {
    setAuthed(true)
    setChecking(false)
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setAuthed(false)
  }, [])

  return (
    <AuthContext.Provider value={{ checking, authed, signedIn, signOut }}>{children}</AuthContext.Provider>
  )
}

/**
 * Wraps a private area. Shows the password form in place of the area's content
 * until the visitor is through — no redirect, so signing in leaves them exactly
 * where they meant to be.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { checking, authed, signedIn } = useAuth()
  if (checking) return null
  if (!authed) return <Login onSuccess={signedIn} />
  return <>{children}</>
}
