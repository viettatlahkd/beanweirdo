/**
 * The properties under a post's title (`PostHead`): which show, in what
 * order, under what label. Set in Hiển thị › Nhãn bài viết (owner,
 * 2026-10-17) and stored as `site_settings.data.postHead.fields`.
 *
 * Only what the owner set is stored; a key added here later joins the end of
 * the list, shown, so a new property never goes missing because an old order
 * did not know it.
 */

export type PostFieldKey = 'authors' | 'topic' | 'tags' | 'sites' | 'date' | 'read'

export type PostField = { key: PostFieldKey; label: string; shown: boolean }

/** What each property is called when the owner has not named it, in the order it was drawn before. */
export const POST_FIELDS: readonly { key: PostFieldKey; label: string }[] = [
  { key: 'authors', label: 'Tác giả' },
  { key: 'topic', label: 'Chủ đề' },
  { key: 'tags', label: 'Tag' },
  { key: 'sites', label: 'Hiện ở' },
  { key: 'date', label: 'Ngày' },
  { key: 'read', label: 'Đọc' },
]

export type StoredPostField = { key: string; label?: string; shown?: boolean }

/** The stored list read against the known properties: unknown keys dropped, missing ones added at the end. */
export function postFields(stored: readonly StoredPostField[] | undefined): PostField[] {
  const known = new Map(POST_FIELDS.map((f) => [f.key as string, f]))
  const out: PostField[] = []
  for (const s of stored ?? []) {
    const f = known.get(s.key)
    if (!f || out.some((o) => o.key === f.key)) continue
    out.push({ key: f.key, label: s.label?.trim() || f.label, shown: s.shown !== false })
  }
  for (const f of POST_FIELDS) if (!out.some((o) => o.key === f.key)) out.push({ ...f, shown: true })
  return out
}
