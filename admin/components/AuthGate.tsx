'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

// TEMPORARY: magic-link email delivery isn't wired up for local dev yet, so
// auth is bypassed behind this flag while the FE is being built/reviewed.
// Set NEXT_PUBLIC_SKIP_AUTH=false (or remove it) to restore the real gate.
const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(SKIP_AUTH)

  useEffect(() => {
    if (SKIP_AUTH) return
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
