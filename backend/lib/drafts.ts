// Pending edits of a published post — see migration 0028.
//
// A published post keeps two versions: the `posts` row is what the site shows,
// and a `post_drafts` row holds the fields edited since, under the same column
// names. The editor's autosave writes there; Publish copies them across.

import type { getSupabase } from './supabase.js'

type Supabase = ReturnType<typeof getSupabase>

/**
 * The fields that are the post's content — what a reader would see change.
 *
 * Everything else a PATCH can carry is filing, not content: `module_id` (moved
 * from the list's menu), `sort_order` (a drag in the list), `pinned`. Those
 * still apply at once, because holding a drag back until the next Publish
 * would look to the owner like the drag had failed.
 */
const DRAFT_FIELDS = [
  'en',
  'vi',
  'body',
  'theme_color',
  'hero_image_url',
  'hero_caption',
  'plate_images',
  'lead',
  'pull_quote',
  'further_reading',
  'date_label',
] as const

export function splitDraftPatch(patch: Record<string, unknown>): {
  content: Record<string, unknown>
  rest: Record<string, unknown>
} {
  const content: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if ((DRAFT_FIELDS as readonly string[]).includes(key)) content[key] = value
    else rest[key] = value
  }
  return { content, rest }
}

/**
 * `post_drafts` cannot be read: the table is missing (0028 not run) or the API
 * has no grant on it (0028 without 0029).
 *
 * Only reads may shrug this off, as "no pending edits". A write never does:
 * the first version of this file treated a refused draft write as "no table
 * yet" and wrote the edit to `posts` instead, which is exactly how edits to a
 * published post kept going live after 0028 — the grant was missing.
 */
export function isDraftTableUnreadable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === '42P01' || code === 'PGRST205' || code === '42501'
}

/** The RPC from migration 0029 does not exist yet. */
function isMissingFunction(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'PGRST202' || code === '42883'
}

function asFields(value: unknown): Record<string, unknown> | null {
  const data = (value as { data?: unknown } | null)?.data
  return data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0
    ? (data as Record<string, unknown>)
    : null
}

/** The pending edits of a post, or null when it has none (or they cannot be read). */
export async function readDraft(
  supabase: Supabase,
  id: string,
): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
  const { data, error } = await supabase.from('post_drafts').select('data').eq('post_id', id).maybeSingle()
  if (error) return { data: null, error: isDraftTableUnreadable(error) ? null : error }
  return { data: asFields(data), error: null }
}

/**
 * Hold `content` back as pending edits if the post is published.
 *
 * One call (`stage_post_draft`, migration 0029): it reads the status and merges
 * into the draft in the database, where the API used to spend three trips
 * between Vercel in the US and Supabase in Tokyo on the same thing.
 *
 * `status` is the post's status (null: no such post). Anything but
 * 'published' means nothing was staged and the caller writes `posts` itself.
 */
export async function stageDraft(
  supabase: Supabase,
  id: string,
  content: Record<string, unknown>,
  nowIso: string,
): Promise<{ status: string | null; error: unknown }> {
  const { data, error } = await supabase.rpc('stage_post_draft', { p_id: id, p_content: content, p_now: nowIso })
  if (!error) return { status: (data as string | null) ?? null, error: null }
  if (!isMissingFunction(error)) return { status: null, error }

  // 0029 not run yet. A post that is not published can still be written
  // straight through; a published one cannot be held back, so refuse rather
  // than put the edit on the site.
  const { data: row, error: rowError } = await supabase.from('posts').select('status').eq('id', id).maybeSingle()
  if (rowError) return { status: null, error: rowError }
  const status = (row as { status?: string } | null)?.status ?? null
  if (status === 'published') {
    return { status, error: { message: 'Chưa lưu được nháp: cần chạy migration 0029 trên database' } }
  }
  return { status, error: null }
}

/**
 * Copy a post's pending edits into `posts` and drop them — what Publish does.
 *
 * One call (`fold_post_draft`, migration 0029), which also returns the post's
 * status so Publish on an already-published post needs nothing else.
 * `status` null means no such post. Without 0029 no draft can have been
 * staged (see `stageDraft`), so there is nothing to fold.
 */
export async function foldDraft(
  supabase: Supabase,
  id: string,
  nowIso: string,
): Promise<{ status: string | null; applied: boolean; error: unknown; known: boolean }> {
  const { data, error } = await supabase.rpc('fold_post_draft', { p_id: id, p_now: nowIso })
  if (error) {
    if (isMissingFunction(error)) return { status: null, applied: false, error: null, known: false }
    return { status: null, applied: false, error, known: false }
  }
  const result = data as { status?: string; applied?: boolean } | null
  return { status: result?.status ?? null, applied: Boolean(result?.applied), error: null, known: true }
}
