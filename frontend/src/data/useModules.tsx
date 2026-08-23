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
  /** Ghi 01's between-post cells: `{ n, img, t }[]`. Empty elsewhere. */
  feature_cells: unknown
  sort_order: number
  /**
   * 'normal' — a reading module, one of the gallery on the homepage.
   * 'special' — extended content that already has a page of its own (Ghi 01,
   * Ghi 02). Still a module, and still listed — see `visibility` for what
   * hides a module. See migrations 0012 and 0015.
   */
  kind: 'normal' | 'special'
  /**
   * 'public' — listed wherever its kind allows.
   * 'private' — never listed outside a signed-in area.
   */
  visibility: 'public' | 'private'
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
/**
 * Which modules each surface lists.
 *
 * Two classifications, deliberately kept apart: `kind` says what a module is,
 * `visibility` says whether it may be listed at all. Collapsing them is the
 * bug these three functions exist to prevent — a special module is still a
 * module, and only a private one disappears.
 */

/** Anything a signed-out reader may see listed. */
const isPublic = (m: ModuleRow) => m.visibility !== 'private'

/**
 * Normal modules always sort above special ones; inside each band the order is
 * whatever the CMS set. Sorting on `sort_order` alone would let a renumbered
 * reading module fall below the journals.
 */
const byBandThenOrder = (a: ModuleRow, b: ModuleRow) => {
  const band = Number(a.kind === 'special') - Number(b.kind === 'special')
  return band !== 0 ? band : a.sort_order - b.sort_order
}

/**
 * Trang chủ — the gallery of reading modules, one full-bleed colour block
 * each. Special modules are left out because they are not reading modules,
 * not because they are hidden.
 */
export const landingModules = (modules: ModuleRow[]) =>
  modules.filter((m) => m.kind !== 'special' && isPublic(m)).sort(byBandThenOrder)

/** Mục lục — everything public, the journals included, in sidebar order. */
export const indexModules = (modules: ModuleRow[]) =>
  modules.filter(isPublic).sort(byBandThenOrder)

/** The sidebar lists exactly what the index does. */
export const sidebarModules = indexModules

/**
 * @deprecated Names a distinction that no longer exists — say which surface
 * you mean. Kept so nothing breaks mid-migration.
 */
export const readingModules = landingModules
