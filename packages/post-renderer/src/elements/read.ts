/**
 * Turning what is stored into elements the store knows.
 *
 * A body may hold three generations at once: elements named the way the store
 * names them, report's old short keys (`{t:'h'}`, `{m:[…]}`), and memo's old
 * per-section fields. Reading is one job, done here, so a template written
 * before any of this still opens.
 *
 * Anything unrecognisable is dropped rather than drawn empty — an empty row on
 * the page says "write here", which is a lie about content that exists and
 * cannot be read.
 */
import { getElement } from './registry'

export type StoredElement = { type: string; id?: string; [key: string]: unknown }

/** Report's first storage format: one-letter keys. */
type ShortKey = {
  t?: string
  v?: string
  m?: { k?: string; v?: string }[]
  c?: { l?: string; v?: number }[]
  th?: string[]
  tr?: string[][]
}

const SHORT_TYPE: Record<string, string> = {
  meta: 'meta',
  h: 'heading',
  p: 'paragraph',
  image: 'image',
}

function fromShortKey(b: ShortKey): StoredElement | null {
  if (Array.isArray(b.m)) return { type: 'metrics', items: b.m.map((x) => ({ label: x.k ?? '', value: x.v ?? '' })) }
  if (Array.isArray(b.c)) return { type: 'chart', points: b.c.map((x) => ({ label: x.l ?? '', heightPct: x.v ?? 0 })) }
  if (b.t === 'table') {
    return { type: 'table', table: { columns: b.th ?? [], rows: (b.tr ?? []).map((cells) => ({ cells })) } }
  }
  const type = b.t ? SHORT_TYPE[b.t] : undefined
  if (!type) return null
  return type === 'image' ? { type, caption: b.v ?? '', imageUrl: null } : { type, text: b.v ?? '' }
}

/** True when it already names an element the store has. */
function known(b: unknown): b is StoredElement {
  const type = (b as { type?: unknown })?.type
  return typeof type === 'string' && getElement(type) !== undefined
}

export function toElements(body: unknown): StoredElement[] {
  if (!Array.isArray(body)) return []
  return body.flatMap((b) => {
    if (known(b)) return [b]
    const out = fromShortKey(b as ShortKey)
    return out ? [out] : []
  })
}
