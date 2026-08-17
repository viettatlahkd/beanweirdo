'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError, clearToken, getToken, listPosts } from '../lib/apiClient'

/**
 * Real auth gate: a token in localStorage isn't enough on its own — it
 * could be expired or forged, so we verify it with a lightweight
 * authenticated call before letting the page render. A 401 means the token
 * is genuinely invalid, so we clear it; any other failure (e.g. the network
 * being down) still sends the user to /login rather than rendering behind a
 * gate we couldn't actually verify.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const token = getToken()
      if (!token) {
        router.replace('/login')
        return
      }
      try {
        await listPosts('draft')
        if (!cancelled) setReady(true)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) clearToken()
        router.replace('/login')
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
