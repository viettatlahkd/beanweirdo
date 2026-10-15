import { moduleToUrl } from './routes'
import { activeWords, type DateOrder, type RouteWords } from './routeWords'

/**
 * The address of a post: which module it belongs to, the day it was made, and
 * whether it has been published yet.
 *
 *   ghi-p260824.draft     một bài nháp trong Ghi 01, tạo ngày 24.08.26
 *   biochemistry-p260817  bài đã lên trang
 *
 * No position in it. An order is a fact about a page and changes when anything
 * is pinned, dragged or published; an address has to outlive all of that, so
 * the two cannot be the same number.
 *
 * `.draft` is the only suffix. A post that has been on the page — published or
 * later archived — keeps the plain address it earned, because archive is a
 * place readers still reach it through.
 */
type SlugParts = {
  moduleId: string
  /** ISO timestamp from the database. */
  createdAt: string
  status?: string
}

/**
 * Giờ Việt Nam. Không dùng múi giờ của máy đang chạy.
 *
 * The database stores UTC, and a post written at half past midnight in Hanoi is
 * still the previous afternoon in UTC. The owner writes from one place and
 * reads the date as that place's date, so the address has to say the same —
 * and it has to say it identically whether the slug is built in a browser, on
 * a server, or in a test on a laptop set to another zone.
 */
const HANOI_OFFSET_MINUTES = 7 * 60

/** `2026-08-24T…` → `260824`, read in Hanoi, in whichever order the owner set. */
export function stamp(createdAt: string, order: DateOrder = activeWords().dateOrder): string {
  const local = new Date(new Date(createdAt).getTime() + HANOI_OFFSET_MINUTES * 60_000)
  const p = (n: number) => String(n).padStart(2, '0')
  const yy = p(local.getUTCFullYear() % 100)
  const mm = p(local.getUTCMonth() + 1)
  const dd = p(local.getUTCDate())
  if (order === 'mmddyy') return `${mm}${dd}${yy}`
  if (order === 'ddmmyy') return `${dd}${mm}${yy}`
  return `${yy}${mm}${dd}`
}

export function buildSlug({ moduleId, createdAt, status }: SlugParts, w: RouteWords = activeWords()): string {
  const base = `${moduleToUrl(moduleId, w)}-${w.postMark}${stamp(createdAt, w.dateOrder)}`
  return status === 'draft' ? `${base}.${w.draftMark}` : base
}

/**
 * The same slug, made unique against slugs already in use.
 *
 * Two posts written into one module on one day would otherwise share an
 * address. The second gets a letter — `…-b`, `…-c` — appended to the part
 * before the suffix, so the day and the status still read straight off.
 */
export function uniqueSlug(parts: SlugParts, taken: Iterable<string>, w: RouteWords = activeWords()): string {
  return dedupe(buildSlug(parts, w), parts.status === 'draft' ? `.${w.draftMark}` : '', new Set(taken))
}

function dedupe(wanted: string, suffix: string, used: ReadonlySet<string>): string {
  if (!used.has(wanted)) return wanted
  const base = wanted.slice(0, wanted.length - suffix.length)
  for (let i = 1; i < 26; i++) {
    const candidate = `${base}-${String.fromCharCode(98 + i - 1)}${suffix}`
    if (!used.has(candidate)) return candidate
  }
  // Twenty-six posts in one module on one day is not a case worth a scheme.
  return `${base}-${Date.now().toString(36).slice(-4)}${suffix}`
}

/**
 * An address word from a title: accents off, đ as d, anything else a hyphen —
 * "Cà phê đặc" → `ca-phe-dac`. Empty when the title has no letter or digit.
 */
export function titleSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** `base`, or `base-2`, `base-3`… — the first one nobody holds. Port pages' rule. */
export function freeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

/** A post as far as its address is concerned. */
export type Addressable = {
  id: string
  module_id: string
  created_at: string
  status?: string
  /** The title, which the address is made from. */
  en?: string
  /** Set by hand in the CMS; wins over the generated one. */
  slug?: string | null
}

/**
 * Slugs for a whole list, in one pass.
 *
 * Worked out rather than stored: the title made into an address word
 * (`ca-phe-dac`, a draft `ca-phe-dac.draft`), so renaming a post moves its
 * address with it. Owner (2026-10-15): the address follows the name, and an
 * old address no post answers to is simply gone, not forwarded. A title with
 * no letter or digit falls back to module and day (`ghi-p260824`).
 *
 * The pass is ordered by creation so the letters that break ties land the same
 * way every time: the older post keeps the plain address, the newer one takes
 * `-b`. Sorting by anything that moves — position on the page, for one — would
 * hand a reader's bookmark to a different post.
 *
 * A slug typed by hand in the CMS is used as-is and also reserves its name, so
 * a generated one never lands on top of it.
 */
export function slugsFor(posts: readonly Addressable[], w: RouteWords = activeWords()): Map<string, string> {
  const byAge = [...posts].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const out = new Map<string, string>()
  const taken = new Set<string>()

  for (const p of byAge) {
    const own = (p.slug ?? '').trim()
    if (own) {
      out.set(p.id, own)
      taken.add(own)
    }
  }
  for (const p of byAge) {
    if (out.has(p.id)) continue
    const named = titleSlug(p.en ?? '')
    const suffix = p.status === 'draft' ? `.${w.draftMark}` : ''
    const slug = named ? dedupe(named + suffix, suffix, taken) : uniqueSlug({ moduleId: p.module_id, createdAt: p.created_at, status: p.status }, taken, w)
    out.set(p.id, slug)
    taken.add(slug)
  }
  return out
}
