import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listPosts } from '../admin/lib/apiClient'
import { useAuth } from '../lib/auth'
import { slugsFor, uniqueSlug, type Addressable } from '../lib/postSlug'
import { supabase } from '../lib/supabaseClient'
import type { Area } from '../lib/area'

export type PostAddresses = {
  /** The address of a post — its id back, until the book has loaded. */
  slugOf(id: string): string
  /** The post an address names, or null while the book is still loading. */
  idOf(slug: string): string | null
  /** True when the address is one a post used to have and now forwards from. */
  forwards(slug: string): boolean
  /**
   * The address to fix a post at when it is published, or undefined when it
   * already has one. Worked out by the same rules as every derived address,
   * against every address in use or still forwarding.
   */
  slugToPublish(id: string): string | undefined
}

/** An address a post used to have (post_slugs, migration 0027). */
export type PastSlug = { slug: string; post_id: string }

/**
 * Slugs are worked out from columns the post already has (module, day made,
 * status — see `lib/postSlug.ts`), so a small book of every post is all the
 * translation between address and record needs.
 *
 * Both directions fall back to the id. A uuid is a working address too: it is
 * what the editor's preview link has always used, and it means a click during
 * the half-second before the book arrives still opens the right post — with a
 * plainer address than it deserves, rather than none at all.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function addressBook(rows: readonly Addressable[], past: readonly PastSlug[] = []): PostAddresses {
  const byId = slugsFor(rows)
  const bySlug = new Map<string, string>()
  for (const [id, slug] of byId) bySlug.set(slug, id)
  // A current address always wins over an old one that happens to match it.
  const forwarded = new Map(past.filter((p) => !bySlug.has(p.slug)).map((p) => [p.slug, p.post_id]))
  return {
    slugOf: (id) => byId.get(id) ?? id,
    // A slug the book does not know is a stale address and resolves to
    // nothing; a uuid resolves to itself, so the editor's preview link and any
    // click made before the book arrived still open their post. An address a
    // post used to have still reaches it.
    idOf: (slug) => bySlug.get(slug) ?? forwarded.get(slug) ?? (UUID.test(slug) ? slug : null),
    forwards: (slug) => forwarded.has(slug),
    slugToPublish: (id) => {
      const row = rows.find((r) => r.id === id)
      if (!row || (row.slug ?? '').trim()) return undefined
      const taken = new Set([...forwarded.keys(), ...[...byId].filter(([other]) => other !== id).map(([, s]) => s)])
      return uniqueSlug({ moduleId: row.module_id, createdAt: row.created_at, status: 'published' }, taken)
    },
  }
}

const Ctx = createContext<PostAddresses>(addressBook([]))

export const usePostAddresses = () => useContext(Ctx)

export function PostAddressProvider({ area, children }: { area: Area; children: ReactNode }) {
  const [rows, setRows] = useState<Addressable[]>([])
  const { authed } = useAuth()

  useEffect(() => {
    let cancelled = false
    const keep = (list: Addressable[]) => !cancelled && setRows(list)

    // The back office addresses drafts too, and only its own API can see them.
    if (area === 'admin') {
      if (!authed) return
      listPosts('all')
        // Bài trong thùng rác không có địa chỉ, nên cũng không giữ chỗ. Nếu nó
        // giữ chỗ thì bài cùng module cùng ngày phải mang thêm chữ cái vì một
        // bài không ai tới được, và xoá hẳn bài ấy sẽ đổi địa chỉ của bài kia.
        .then((posts) => keep(posts.filter((p) => p.status !== 'deleted')))
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }

    // A reader only ever links to a post that is on the site or in the
    // archive; a draft has no public address to resolve.
    supabase
      .from('posts')
      .select('id, module_id, created_at, status, slug')
      .in('status', ['published', 'archived'])
      .then(({ data }) => keep((data ?? []) as Addressable[]))

    return () => {
      cancelled = true
    }
  }, [area, authed])

  // Old addresses are the same in every area: a link someone saved before an
  // address changed should still arrive.
  const [past, setPast] = useState<PastSlug[]>([])
  useEffect(() => {
    let cancelled = false
    supabase
      .from('post_slugs')
      .select('slug, post_id')
      .then(({ data }) => !cancelled && setPast((data ?? []) as PastSlug[]))
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => addressBook(rows, past), [rows, past])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
