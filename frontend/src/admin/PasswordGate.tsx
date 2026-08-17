import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, clearToken, getToken, listPosts } from './lib/apiClient'
import { useAdminNav } from './lib/nav'

/**
 * Real auth gate: a token in localStorage isn't enough on its own — it
 * could be expired or forged, so we verify it with a lightweight
 * authenticated call before letting the screen render. A 401 means the
 * token is genuinely invalid, so we clear it; any other failure (e.g. the
 * network being down) still sends the user back to the login screen rather
 * than rendering behind a gate we couldn't actually verify.
 *
 * Port of the standalone admin app's AuthGate — same logic, adapted to this
 * app's plain-React conventions (no next/navigation; navigates by calling
 * the admin nav context's `goLogin()` instead of `router.replace('/login')`).
 */
export function PasswordGate({ children }: { children: ReactNode }) {
  const nav = useAdminNav()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const token = getToken()
      if (!token) {
        nav.goLogin()
        return
      }
      try {
        await listPosts('draft')
        if (!cancelled) setReady(true)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) clearToken()
        nav.goLogin()
      }
    }

    check()
    return () => {
      cancelled = true
    }
    // Runs once per screen mount, same as the original's per-route check —
    // `nav` is intentionally not a dependency (its identity changes on every
    // navigation, which would re-run this on every render otherwise).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) return null
  return <>{children}</>
}
