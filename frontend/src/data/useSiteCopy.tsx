import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { resolveSite, SITE_DEFAULTS, type SiteCopy, type SiteOverrides } from '../content/site'
import { supabase } from '../lib/supabaseClient'

export type UseSiteCopyResult = {
  /** Defaults merged with whatever the CMS has overridden. Never null. */
  site: SiteCopy
  /** The raw overrides — what the CMS edits and PATCHes back. */
  overrides: SiteOverrides
  loading: boolean
  error: string | null
}

const SiteCopyContext = createContext<UseSiteCopyResult | null>(null)

/**
 * The single `site_settings` row — see backend/supabase/migrations/0007.
 * One row, one JSON blob: the copy the Content-management screen edits is a
 * flat bag of strings, not a schema worth normalising.
 *
 * Fetched once here rather than per consumer: the sidebar, the breadcrumb bar
 * and the screen underneath all want the same copy on every screen, and each
 * `useSiteCopy()` used to mean its own request.
 */
export function SiteCopyProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<SiteOverrides>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('site_settings')
      .select('data')
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) {
          setError(error.message)
          return
        }
        setError(null)
        setOverrides(((data?.data ?? {}) as SiteOverrides) || {})
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<UseSiteCopyResult>(
    () => ({ site: resolveSite(overrides), overrides, loading, error }),
    [overrides, loading, error],
  )

  return <SiteCopyContext.Provider value={value}>{children}</SiteCopyContext.Provider>
}

/**
 * Site copy for the public screens. Renders defaults immediately and swaps in
 * the stored overrides when they arrive, so a slow or failed fetch shows the
 * shipped copy rather than an empty masthead.
 *
 * Outside a provider (unit tests that mount one screen) it falls back to the
 * defaults rather than throwing — a screen's copy is never the thing under test.
 */
export function useSiteCopy(): UseSiteCopyResult {
  return (
    useContext(SiteCopyContext) ?? {
      site: SITE_DEFAULTS,
      overrides: {},
      loading: false,
      error: null,
    }
  )
}
