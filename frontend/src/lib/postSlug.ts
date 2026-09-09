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
export type SlugParts = {
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
  const used = new Set(taken)
  const wanted = buildSlug(parts, w)
  if (!used.has(wanted)) return wanted

  const suffix = parts.status === 'draft' ? `.${w.draftMark}` : ''
  const base = wanted.slice(0, wanted.length - suffix.length)
  for (let i = 1; i < 26; i++) {
    const candidate = `${base}-${String.fromCharCode(98 + i - 1)}${suffix}`
    if (!used.has(candidate)) return candidate
  }
  // Twenty-six posts in one module on one day is not a case worth a scheme.
  return `${base}-${Date.now().toString(36).slice(-4)}${suffix}`
}

/**
 * What a post's slug should be after a status change.
 *
 * Publishing drops `.draft` and nothing else moves: the day it was written
 * stays the day it was written. Returns null when nothing needs rewriting.
 */
export function slugAfterStatus(current: string, status: string, w: RouteWords = activeWords()): string | null {
  const mark = `.${w.draftMark}`
  const isDraft = current.endsWith(mark)
  if (status === 'draft') return isDraft ? null : `${current}${mark}`
  return isDraft ? current.slice(0, -mark.length) : null
}

/** A post as far as its address is concerned. */
export type Addressable = {
  id: string
  module_id: string
  created_at: string
  status?: string
  /** Set by hand in the CMS; wins over the generated one. */
  slug?: string | null
}

/**
 * Slugs for a whole list, in one pass.
 *
 * Worked out rather than stored. A slug is a function of three columns the post
 * already has, so deriving it means it can never drift from them — and nothing
 * has to be backfilled for the addresses to start working.
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
    const slug = uniqueSlug({ moduleId: p.module_id, createdAt: p.created_at, status: p.status }, taken, w)
    out.set(p.id, slug)
    taken.add(slug)
  }
  return out
}

/** The post an address points at, or null. */
export function findBySlug<T extends Addressable>(posts: readonly T[], slug: string): T | null {
  const slugs = slugsFor(posts)
  return posts.find((p) => slugs.get(p.id) === slug) ?? null
}
