import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { groupPosts, resolveRule, toRule, type ListingRule, type PostGroup, type RuleTopic } from '../lib/listingRule'
import type { PostRow } from './usePublishedPosts'
import { TAG_PAGE } from '../lib/routes'

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
  /**
   * Ảnh trên chính trang module. Rỗng thì lấy theo `img1..3` của Trang chủ.
   * Số ô dùng tới tuỳ dàn trang: band 1, specimen 3, sequence 4.
   */
  page_img1: string | null
  page_img2: string | null
  page_img3: string | null
  page_img4: string | null
  page_shot1: string
  page_shot2: string
  page_shot3: string
  page_shot4: string
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


/**
 * A page the site can show: a module as the screens have always drawn it, now
 * built from the feature layer (migration 0028) — a tier template or a curated
 * page, its listing rule, and its place in the navigation.
 *
 * The screens keep reading the same shape (`ModuleRow`), so moving them onto
 * rules changes where a page's posts come from, not how a page is drawn.
 */
export type PageRow = ModuleRow & {
  /** Earlier addresses that still open this page — a module id, a module's URL name. */
  aliases: string[]
  /** A page with a screen of its own instead of the module screen. */
  screen?: 'notes' | 'hours'
  /** Where the page comes from. `module` = a module not yet moved onto rules. */
  source: 'curated' | 'topic' | 'keyword' | 'module'
  /** The tree node or tag a tier page stands for. */
  node: string | null
  rule: ListingRule | null
  inSidebar: boolean
  onHome: boolean
}

export type UseModulesResult = {
  /** Every page: the navigation's, and every tier page whether listed or not. */
  data: PageRow[]
  loading: boolean
  error: string | null
  /** The posts a page lists, in its rule's order. */
  postsOf: (pageId: string) => PostRow[]
  /**
   * The page's posts as its rule groups them; one unnamed group when it does
   * not group.
   */
  groupsOf: (pageId: string) => PostGroup<PostRow>[]
  /** Read everything again — after the CMS changes a rule or a page. */
  reload: () => void
}

type Override = { node_type: 'topic' | 'keyword'; node_id: string; rule_id: string | null; presentation: Record<string, unknown>; aliases: string[] }
type PageRecord = {
  id: string
  kind: 'curated' | 'template_subject' | 'template_topic' | 'template_keyword' | 'nav'
  title: string
  presentation: Record<string, unknown>
  blocks: string[]
  aliases: string[]
  visibility: 'public' | 'private'
}
type NavItem = { ref: string; sidebar?: boolean; home?: boolean }
type TopicRecord = RuleTopic & { intro: string; accent: string | null; on_color: string | null; tint: string | null; tint2: string | null; visibility: string }
type KeywordRecord = { id: string; label: string }

export type Store = {
  modules: ModuleRow[]
  topics: TopicRecord[]
  keywords: KeywordRecord[]
  pages: PageRecord[]
  overrides: Override[]
  rules: Map<string, ListingRule>
  postKeywords: Map<string, string[]>
  posts: PostRow[]
}

export const EMPTY: Store = { modules: [], topics: [], keywords: [], pages: [], overrides: [], rules: new Map(), postKeywords: new Map(), posts: [] }

/** A page record's rows, ready to draw: blank strings rather than nulls where the screens expect text. */
const BLANK: Omit<ModuleRow, 'id' | 'title'> = {
  accent: '#8C8674',
  on_color: '#23211A',
  tint: '',
  tint2: '',
  layout: 'band',
  concept: '',
  blurb: '',
  long_desc: '',
  treatment: '',
  layout_note: '',
  shot1: '',
  shot2: '',
  shot3: '',
  img1: null,
  img2: null,
  img3: null,
  feature_cells: [],
  page_img1: null,
  page_img2: null,
  page_img3: null,
  page_img4: null,
  page_shot1: '',
  page_shot2: '',
  page_shot3: '',
  page_shot4: '',
  sort_order: 0,
  kind: 'normal',
  visibility: 'public',
}

/**
 * How a page looks: the template's defaults, then what its node says about
 * itself, then a linked module's live row (while the CMS still edits modules),
 * then the page's own settings.
 */
function present(
  base: Partial<ModuleRow>,
  layers: (Record<string, unknown> | undefined)[],
  modules: ModuleRow[],
): Omit<ModuleRow, 'id'> & { screen?: 'notes' | 'hours' } {
  let out: Record<string, unknown> = { ...BLANK, ...base }
  for (const layer of layers) {
    if (!layer) continue
    const { module: linked, ...own } = layer as { module?: string }
    const row = linked ? modules.find((m) => m.id === linked) : undefined
    if (row) {
      const { id: _id, sort_order: _o, kind: _k, visibility: _v, ...looks } = row
      out = { ...out, ...looks }
    }
    out = { ...out, ...Object.fromEntries(Object.entries(own).filter(([, v]) => v !== null && v !== undefined)) }
  }
  return out as Omit<ModuleRow, 'id'>
}

/** Builds every page from the store. Exported for tests. */
export function buildPages(store: Store): PageRow[] {
  const { modules, topics, keywords, pages, overrides, rules } = store
  const ruleOf = (id: string | null | undefined) => (id ? rules.get(id) ?? null : null)
  const template = (kind: PageRecord['kind']) => pages.find((p) => p.kind === kind)
  const override = (type: Override['node_type'], id: string) => overrides.find((o) => o.node_type === type && o.node_id === id)
  const out: PageRow[] = []

  // Until the feature layer is set up, the modules are the pages, exactly as
  // they were — so the site cannot shift between running the migration and
  // filling it in.
  if (pages.length === 0) {
    return arrange(
      modules.map((m) => ({ ...m, aliases: [], source: 'module' as const, node: null, rule: null, inSidebar: false, onHome: false })),
      undefined,
      topics,
      modules,
    ).map(withScreen)
  }

  for (const t of topics) {
    const tpl = template(t.parent_id === null ? 'template_subject' : 'template_topic')
    const own = override('topic', t.id)
    const parent = t.parent_id ? topics.find((p) => p.id === t.parent_id) : undefined
    const look = present(
      {
        title: t.title,
        blurb: t.intro,
        // A topic with no colour of its own wears its subject's.
        accent: t.accent ?? parent?.accent ?? BLANK.accent,
        on_color: t.on_color ?? parent?.on_color ?? BLANK.on_color,
        tint: t.tint ?? parent?.tint ?? '',
        tint2: t.tint2 ?? parent?.tint2 ?? '',
      },
      [tpl?.presentation, own?.presentation],
      modules,
    )
    out.push({
      ...look,
      id: t.id,
      visibility: t.visibility === 'private' ? 'private' : 'public',
      aliases: own?.aliases ?? [],
      source: 'topic',
      node: t.id,
      rule: ruleOf(own?.rule_id) ?? ruleOf(tpl?.blocks[0]),
      inSidebar: false,
      onHome: false,
    })
  }

  for (const k of keywords) {
    const tpl = template('template_keyword')
    const own = override('keyword', k.id)
    out.push({
      ...present({ title: k.label }, [tpl?.presentation, own?.presentation], modules),
      id: `${TAG_PAGE}${k.id}`,
      aliases: own?.aliases ?? [],
      source: 'keyword',
      node: k.id,
      rule: ruleOf(own?.rule_id) ?? ruleOf(tpl?.blocks[0]),
      inSidebar: false,
      onHome: false,
    })
  }

  for (const p of pages.filter((x) => x.kind === 'curated')) {
    const look = present({ title: p.title }, [p.presentation], modules)
    out.push({
      ...look,
      id: p.id,
      visibility: p.visibility,
      aliases: p.aliases,
      source: 'curated',
      node: null,
      rule: ruleOf(p.blocks[0]),
      inSidebar: false,
      onHome: false,
    })
  }

  // A module no page or tier page has taken over yet is still a page of its
  // own, listing its posts the way it always did — Ghi 02 is one.
  const taken = new Set(out.flatMap((p) => [p.id, ...p.aliases]))
  for (const m of modules) {
    if (taken.has(m.id)) continue
    out.push({ ...m, aliases: [], source: 'module', node: null, rule: null, inSidebar: false, onHome: false })
  }

  return arrange(out.map(withScreen), pages.find((p) => p.kind === 'nav'), topics, modules)
}

/** Ghi 01 and Ghi 02 keep the screens written for them. */
function withScreen(p: PageRow): PageRow {
  if (p.screen) return p
  if (p.id === 'ghi01' || p.aliases.includes('ghi01')) return { ...p, screen: 'notes' }
  if (p.id === 'ghi02' || p.aliases.includes('ghi02')) return { ...p, screen: 'hours' }
  return p
}

/**
 * The navigation as a rule: every subject in tree order is listed unless the
 * owner placed or hid it, and the owner's list comes first. With no navigation
 * stored yet, the modules' own order and flags stand in for it.
 */
function arrange(pages: PageRow[], nav: PageRecord | undefined, topics: TopicRecord[], modules: ModuleRow[]): PageRow[] {
  const byRef = (ref: string) => {
    const [type, id] = ref.split(':')
    return pages.find((p) => (type === 'tag' ? p.id === `${TAG_PAGE}${id}` : p.id === id))
  }

  if (!nav) {
    // Reading modules before journals, each band in the CMS order (rule 05).
    const ordered = [...modules].sort(
      (a, b) => Number(a.kind === 'special') - Number(b.kind === 'special') || a.sort_order - b.sort_order,
    )
    for (const p of pages) {
      const m = modules.find((x) => x.id === p.id || p.aliases.includes(x.id))
      if (!m) continue
      p.sort_order = ordered.indexOf(m) + 1
      p.inSidebar = m.visibility !== 'private'
      p.onHome = m.kind !== 'special' && m.visibility !== 'private'
    }
    return pages
  }

  const items = ((nav.presentation.items ?? []) as NavItem[]).filter((i) => byRef(i.ref))
  const listed = new Set(items.map((i) => i.ref))
  const subjects = [...topics].filter((t) => t.parent_id === null).sort((a, b) => a.sort_order - b.sort_order)
  const auto = subjects.filter((s) => !listed.has(`topic:${s.id}`)).map((s) => ({ ref: `topic:${s.id}`, sidebar: true, home: true }))
  ;[...items, ...auto].forEach((item, i) => {
    const page = byRef(item.ref)!
    page.sort_order = i + 1
    page.inSidebar = item.sidebar !== false && page.visibility !== 'private'
    page.onHome = item.home !== false && page.visibility !== 'private'
  })
  return pages
}

/** A page by its id, or by an address it used to have. */
export function findPage<T extends { id: string; aliases?: string[] }>(pages: readonly T[], idOrAlias: string | null | undefined): T | undefined {
  if (!idOrAlias) return undefined
  return pages.find((p) => p.id === idOrAlias) ?? pages.find((p) => p.aliases?.includes(idOrAlias))
}

/** The posts a page lists. Exported for tests. */
export function pagePosts(page: PageRow | undefined, store: Pick<Store, 'posts' | 'topics' | 'postKeywords'>): PostRow[] {
  if (!page) return []
  if (!page.rule) {
    // Not on rules yet: the module's posts in the posts table's order.
    return resolveRule(toRule({ sort: 'manual' }), store.posts.filter((p) => p.module_id === page.id), { topics: store.topics }).posts
  }
  return resolveRule(page.rule, store.posts, {
    topics: store.topics,
    keywordsOf: (id) => store.postKeywords.get(id) ?? [],
    node: page.node,
  }).posts
}

const ModulesContext = createContext<UseModulesResult | null>(null)

async function loadStore(): Promise<Store> {
  // Modules and posts are what the site cannot draw without; the feature
  // layer's tables may simply not exist yet (before migration 0028), and the
  // site then draws from the modules as it always did.
  const all = <T,>(q: PromiseLike<{ data: unknown; error: unknown }>, required = false) =>
    Promise.resolve(q).then(({ data, error }) => {
      if (error && required) throw new Error((error as { message?: string }).message ?? 'query failed')
      return (data ?? []) as T[]
    })
  const [modules, topics, keywords, pages, overrides, rules, postKeywords, posts] = await Promise.all([
    all<ModuleRow>(supabase.from('modules').select('*').order('sort_order', { ascending: true }), true),
    all<TopicRecord>(supabase.from('topics').select('*')),
    all<KeywordRecord>(supabase.from('keywords').select('id, label')),
    all<PageRecord>(supabase.from('pages').select('*')),
    all<Override>(supabase.from('page_overrides').select('*')),
    all<ListingRule>(supabase.from('listing_rules').select('*')),
    all<{ post_id: string; keyword_id: string }>(supabase.from('post_keywords').select('post_id, keyword_id')),
    all<PostRow>(supabase.from('posts').select('*').eq('status', 'published'), true),
  ])
  const worn = new Map<string, string[]>()
  for (const { post_id, keyword_id } of postKeywords) worn.set(post_id, [...(worn.get(post_id) ?? []), keyword_id])
  return {
    modules,
    topics,
    keywords,
    pages,
    overrides,
    rules: new Map(rules.map((r) => [r.id!, toRule(r)])),
    postKeywords: worn,
    posts,
  }
}

function useModulesQuery(enabled: boolean): UseModulesResult {
  const [store, setStore] = useState<Store>(EMPTY)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    // Only the first load shows as loading; a reload keeps the page drawn.
    if (round === 0) setLoading(true)
    loadStore()
      .then((s) => {
        if (cancelled) return
        setStore(s)
        setError(null)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [enabled, round])

  return useMemo(() => {
    const data = buildPages(store)
    const cache = new Map<string, PostRow[]>()
    const postsOf = (pageId: string) => {
      const page = findPage(data, pageId)
      const key = page?.id ?? pageId
      if (!cache.has(key)) cache.set(key, pagePosts(page, store))
      return cache.get(key)!
    }
    const groupsOf = (pageId: string) => {
      const page = findPage(data, pageId)
      const posts = postsOf(pageId)
      if (!page?.rule) return [{ key: '', label: '', posts }]
      return groupPosts(page.rule, posts, {
        topics: store.topics,
        keywordsOf: (id) => store.postKeywords.get(id) ?? [],
        labelOf: (_g, key) => store.keywords.find((k) => k.id === key)?.label ?? key,
      })
    }
    return { data, loading, error, postsOf, groupsOf, reload: () => setRound((r) => r + 1) }
  }, [store, loading, error])
}

export function ModulesProvider({ children }: { children: ReactNode }) {
  const value = useModulesQuery(true)
  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
}

export function useModules(): UseModulesResult {
  const shared = useContext(ModulesContext)
  const own = useModulesQuery(shared === null)
  return shared ?? own
}

/** A page's posts, in its rule's order; empty while loading. */
export function usePagePosts(pageId: string | null | undefined): { data: PostRow[]; loading: boolean } {
  const { postsOf, loading } = useModules()
  return useMemo(() => ({ data: pageId ? postsOf(pageId) : [], loading }), [postsOf, pageId, loading])
}

/*
 * Which pages each surface lists. The navigation decides — its order, and its
 * two flags: on the sidebar, on the homepage.
 */
type Listable = ModuleRow & Partial<Pick<PageRow, 'inSidebar' | 'onHome'>>

// A bare module row (no navigation flags) is placed the way modules always
// were: reading modules before journals, private ones nowhere. Rule 05.
const isPublic = (m: Listable) => m.visibility !== 'private'
const legacyOrder = (a: Listable, b: Listable) =>
  Number(a.kind === 'special') - Number(b.kind === 'special') || a.sort_order - b.sort_order
const byNav = (a: Listable, b: Listable) => (a.inSidebar === undefined ? legacyOrder(a, b) : a.sort_order - b.sort_order)

export const landingModules = <T extends Listable>(pages: T[]): T[] =>
  pages.filter((p) => (p.onHome === undefined ? p.kind !== 'special' && isPublic(p) : p.onHome)).sort(byNav)

export const indexModules = <T extends Listable>(pages: T[]): T[] =>
  pages.filter((p) => (p.inSidebar === undefined ? isPublic(p) : p.inSidebar)).sort(byNav)

export const sidebarModules = indexModules

/** @deprecated Old name for {@link landingModules}. */
export const readingModules = landingModules
