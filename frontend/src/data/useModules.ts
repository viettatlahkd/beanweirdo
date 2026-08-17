import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type ModuleLayout = 'band' | 'specimen' | 'sequence'

/** A row from the public `modules` table — see backend/supabase/migrations/0001. */
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
  sort_order: number
}

export type UseModulesResult = {
  data: ModuleRow[]
  loading: boolean
  error: string | null
}

/**
 * Every module, ordered the way they're meant to read — sensory, biochem,
 * roasting. Public/anon-readable, no status filtering needed (unlike posts).
 */
export function useModules(): UseModulesResult {
  const [data, setData] = useState<ModuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  return { data, loading, error }
}
