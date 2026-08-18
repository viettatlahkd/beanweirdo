import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'

export type ModuleLayout = 'band' | 'specimen' | 'sequence'

/** A row from the public `modules` table — see backend/supabase/migrations/0001 and 0007. */
export type ModuleRow = {
  id: string
  title: string
  accent: string
  on_color: string
  tint: string
  tint2: string
  layout: ModuleLayout
  concept: string
  blurb: string
  long_desc: string
  treatment: string
  layout_note: string
  shot1: string
  shot2: string
  shot3: string
  /** Uploaded photo per shot slot — null until the CMS gets one. */
  img1: string | null
  img2: string | null
  img3: string | null
  sort_order: number
  /**
   * 'normal' — a reading module, listed on the landing page and the index.
   * 'special' — a journal that already has its own page. A valid place to file
   * a post, never listed as a module. See migration 0012.
   */
  kind: 'normal' | 'special'
}

export type UseModulesResult = {
  data: ModuleRow[]
  loading: boolean
  error: string | null
}

const ModulesContext = createContext<UseModulesResult | null>(null)

/** The actual query. `enabled` is false for consumers already covered by a provider. */
function useModulesQuery(enabled: boolean): UseModulesResult {
  const [data, setData] = useState<ModuleRow[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)

    supabase
      .from('modules')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) {
          setError(error.message)
          setData([])
          return
        }
        setError(null)
        setData((data ?? []) as ModuleRow[])
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { data, loading, error }
}

/**
 * Fetched once for the whole app. The sidebar, the breadcrumb bar and the
 * screen underneath all want the same module list on every screen — without
 * this each `useModules()` was its own request.
 */
export function ModulesProvider({ children }: { children: ReactNode }) {
  const value = useModulesQuery(true)
  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
}

/**
 * Every module, ordered the way they're meant to read. Public/anon-readable,
 * no status filtering needed (unlike posts).
 *
 * Uses the provider's copy when there is one, and falls back to fetching its
 * own so a screen mounted on its own (unit tests) still works.
 */
export function useModules(): UseModulesResult {
  const shared = useContext(ModulesContext)
  const own = useModulesQuery(shared === null)
  return shared ?? own
}

/**
 * The modules the reader is shown.
 *
 * Everything written points at a module, but the journals have pages of their
 * own — listing them again beside the reading modules would introduce them
 * twice under different names.
 */
export const readingModules = (modules: ModuleRow[]) =>
  modules.filter((m) => m.kind !== 'special')
