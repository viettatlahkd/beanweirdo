import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

/**
 * The only way this backend talks to Postgres: a service-role Supabase
 * client that bypasses RLS entirely. Never expose SUPABASE_SECRET_KEY to a
 * client; it only ever lives in this server process's env.
 */
// @supabase/supabase-js always constructs a RealtimeClient, which throws at
// construction time on Node <22 (no global WebSocket) even though this
// backend never opens a realtime channel. A no-op stand-in satisfies its
// `typeof WebSocket !== 'undefined'` capability check without being used.
function ensureWebSocketGlobalForRealtimeClientConstruction(): void {
  if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
    ;(globalThis as { WebSocket?: unknown }).WebSocket = class NoopWebSocket {} as unknown
  }
}

export function getSupabase(): SupabaseClient {
  if (cached) return cached
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY are not set')
  }
  ensureWebSocketGlobalForRealtimeClientConstruction()
  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}

/** Test-only: reset the cached client so mocks/env changes take effect. */
export function resetSupabaseClientForTests(): void {
  cached = null
}
