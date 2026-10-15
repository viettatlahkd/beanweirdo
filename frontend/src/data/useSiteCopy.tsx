import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { resolveSite, SITE_DEFAULTS, type SiteCopy, type SiteOverrides } from '../content/site'
import { supabase } from '../lib/supabaseClient'

type UseSiteCopyResult = {
  /** Defaults merged with whatever the CMS has overridden. Never null. */
  site: SiteCopy
  /** The raw overrides — what the CMS edits and PATCHes back. */
  overrides: SiteOverrides
  loading: boolean
  /**
   * True once the copy on screen is the owner's, not the shipped defaults:
   * either the fetch answered or this browser remembered the last answer.
   * A screen that would otherwise flash the defaults waits on this.
   */
  ready: boolean
  error: string | null
}

/** Last answer from `site_settings`, so the next visit starts on it. */
const CACHE_KEY = 'bw.siteCopy'

function readCache(): SiteOverrides | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as SiteOverrides) : null
  } catch {
    return null
  }
}

function writeCache(o: SiteOverrides) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(o))
  } catch {
    // Private mode or a full quota: the next visit simply waits on the fetch.
  }
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
  /*
   * Starting on `{}` drew the shipped headline first and swapped in the owner's
   * one when the fetch landed — the "old heading, then the new one" flash on
   * Trang chủ. Starting on the remembered answer makes a return visit correct
   * from the first frame; a first visit hides the text until `ready` instead.
   */
  const [cached] = useState(readCache)
  const [overrides, setOverrides] = useState<SiteOverrides>(cached ?? {})
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
        const next = ((data?.data ?? {}) as SiteOverrides) || {}
        setOverrides(next)
        writeCache(next)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<UseSiteCopyResult>(
    () => ({ site: resolveSite(overrides), overrides, loading, ready: !loading || cached !== null, error }),
    [overrides, loading, cached, error],
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
      ready: true,
      error: null,
    }
  )
}
