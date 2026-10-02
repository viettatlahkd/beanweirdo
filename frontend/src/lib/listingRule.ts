/**
 * A listing rule (migration 0028): what a page or a block pulls from the
 * content layer, and in what order.
 *
 *   pull (tier + nodes) → extra filters → sort → group → limit
 *
 * One function for every place posts are listed — the site's pages, the
 * sidebar counts, portfolio blocks — so a rule means the same thing wherever
 * it is used. Pure: the caller hands in posts already readable by the viewer
 * (published, visible), and the topic tree.
 */

export type RuleTier = 'topic' | 'keyword' | 'kind' | 'template' | 'pick' | 'all'
export type RuleSort = 'newest' | 'oldest' | 'manual' | 'tree'
/** `subject` groups a post under the subject at the root of its topic. */
export type RuleGroup = 'none' | 'subject' | 'topic' | 'keyword' | 'kind' | 'year'

export type ListingRule = {
  id?: string
  tier: RuleTier
  nodes: string[]
  /** Take the node from the page being shown instead of `nodes`. */
  from_page: boolean
  include_children: boolean
  match: 'any' | 'all'
  exclude: string[]
  kinds: string[]
  templates: string[]
  group_by: RuleGroup
  sort: RuleSort
  /** With `manual`: posts not yet placed go before the placed ones. */
  new_first: boolean
  manual_order: string[]
  pinned: string[]
  limit_n: number | null
  display: Record<string, unknown>
}

export const DEFAULT_RULE: ListingRule = {
  tier: 'all',
  nodes: [],
  from_page: false,
  include_children: true,
  match: 'any',
  exclude: [],
  kinds: [],
  templates: [],
  group_by: 'none',
  sort: 'newest',
  new_first: true,
  manual_order: [],
  pinned: [],
  limit_n: null,
  display: {},
}

/** Fills whatever a stored row left out, so callers never meet a half rule. */
export function toRule(row: Partial<ListingRule> | null | undefined): ListingRule {
  return { ...DEFAULT_RULE, ...(row ?? {}) }
}

/** The post fields a rule reads. */
export type RulePost = {
  id: string
  topic_id: string | null
  kind: string
  template: string
  published_at: string | null
  date_label: string
  /**
   * The order the posts table used to carry. Kept as the order of posts a
   * manual rule has not placed yet, so the CMS's drag and pin keep working
   * until the CMS writes rules itself (step 3c). Gone with the columns.
   */
  pinned?: boolean
  sort_order?: number | null
}

export type RuleTopic = { id: string; parent_id: string | null; sort_order: number; title: string }

export type RuleContext = {
  topics: readonly RuleTopic[]
  /** Theme tags a post wears. */
  keywordsOf?: (postId: string) => readonly string[]
  /** The node of the page being shown, for `from_page` rules. */
  node?: string | null
  /** Display names for groups that are not topics (tags, dạng bài). */
  labelOf?: (group: RuleGroup, key: string) => string
}

export type PostGroup<P> = { key: string; label: string; posts: P[] }

/** Subjects in order, each followed by its topics: the tree read top to bottom. */
export function treeOrder(topics: readonly RuleTopic[]): string[] {
  const sorted = [...topics].sort((a, b) => a.sort_order - b.sort_order)
  return sorted
    .filter((t) => t.parent_id === null)
    .flatMap((s) => [s.id, ...sorted.filter((t) => t.parent_id === s.id).map((t) => t.id)])
}

/** A node and, when asked, every topic under it. */
function withChildren(ids: readonly string[], topics: readonly RuleTopic[], children: boolean): Set<string> {
  const out = new Set(ids)
  if (children) for (const t of topics) if (t.parent_id && out.has(t.parent_id)) out.add(t.id)
  return out
}

function matches<P extends RulePost>(tier: RuleTier, ids: readonly string[], rule: ListingRule, ctx: RuleContext) {
  if (tier === 'all') return () => true
  if (tier === 'pick') {
    const set = new Set(ids)
    return (p: P) => set.has(p.id)
  }
  if (tier === 'topic') {
    const set = withChildren(ids, ctx.topics, rule.include_children)
    return (p: P) => p.topic_id !== null && set.has(p.topic_id)
  }
  if (tier === 'keyword') {
    return (p: P) => {
      const worn = ctx.keywordsOf?.(p.id) ?? []
      return rule.match === 'all' ? ids.length > 0 && ids.every((k) => worn.includes(k)) : ids.some((k) => worn.includes(k))
    }
  }
  const set = new Set(ids)
  return tier === 'kind' ? (p: P) => set.has(p.kind) : (p: P) => set.has(p.template)
}

/** What the rule pulls, before any ordering. */
export function selectPosts<P extends RulePost>(rule: ListingRule, posts: readonly P[], ctx: RuleContext): P[] {
  const nodes = rule.from_page ? (ctx.node ? [ctx.node] : []) : rule.nodes
  // A rule that takes its node from the page pulls nothing until there is one.
  if (rule.from_page && nodes.length === 0) return []
  const keep = matches<P>(rule.tier, nodes, rule, ctx)
  const drop = rule.exclude.length > 0 ? matches<P>(rule.tier, rule.exclude, { ...rule, match: 'any' }, ctx) : () => false
  return posts.filter(
    (p) =>
      keep(p) &&
      !drop(p) &&
      (rule.kinds.length === 0 || rule.kinds.includes(p.kind)) &&
      (rule.templates.length === 0 || rule.templates.includes(p.template)),
  )
}

const stamp = (p: RulePost) => p.published_at ?? ''
/*
 * Newest by the date the reader sees on the post (`date_label`, YYYY.MM), then
 * by when it went up. Posts imported in one batch share a publish time that has
 * nothing to do with when they were written, so the publish time alone put
 * 2025.11 ahead of 2026.01.
 */
const newest = (a: RulePost, b: RulePost) =>
  b.date_label.localeCompare(a.date_label) || stamp(b).localeCompare(stamp(a))

/**
 * The posts table's own order, exactly as its query sorted: pinned, placed by
 * hand, then publish time, then the date on the post. Kept as it was so a page
 * nobody has ordered yet does not reshuffle under its readers.
 */
const legacy = (a: RulePost, b: RulePost) =>
  Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
  (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
  stamp(b).localeCompare(stamp(a)) ||
  b.date_label.localeCompare(a.date_label)

export function sortPosts<P extends RulePost>(rule: ListingRule, posts: readonly P[], ctx: RuleContext): P[] {
  const list = [...posts]
  if (rule.sort === 'newest') list.sort(newest)
  else if (rule.sort === 'oldest') list.sort((a, b) => newest(b, a))
  else if (rule.sort === 'tree') {
    const at = new Map(treeOrder(ctx.topics).map((id, i) => [id, i]))
    const pos = (p: RulePost) => (p.topic_id !== null ? at.get(p.topic_id) ?? Infinity : Infinity)
    list.sort((a, b) => pos(a) - pos(b) || newest(a, b))
  } else {
    const at = new Map(rule.manual_order.map((id, i) => [id, i]))
    const placed = list.filter((p) => at.has(p.id)).sort((a, b) => at.get(a.id)! - at.get(b.id)!)
    const fresh = list.filter((p) => !at.has(p.id)).sort(legacy)
    list.splice(0, list.length, ...(rule.new_first ? [...fresh, ...placed] : [...placed, ...fresh]))
  }
  // Pinned posts lead whatever the order, in the order they were pinned.
  if (rule.pinned.length === 0) return list
  const pin = new Map(rule.pinned.map((id, i) => [id, i]))
  return [...list.filter((p) => pin.has(p.id)).sort((a, b) => pin.get(a.id)! - pin.get(b.id)!), ...list.filter((p) => !pin.has(p.id))]
}

/** Groups keep the posts' order inside them; groups themselves follow the tree, or newest year first. */
export function groupPosts<P extends RulePost>(rule: ListingRule, posts: readonly P[], ctx: RuleContext): PostGroup<P>[] {
  if (rule.group_by === 'none') return [{ key: '', label: '', posts: [...posts] }]
  const groups = new Map<string, P[]>()
  const put = (key: string, p: P) => groups.set(key, [...(groups.get(key) ?? []), p])
  const subjectOf = (id: string | null) => {
    const t = id ? ctx.topics.find((x) => x.id === id) : undefined
    return t ? t.parent_id ?? t.id : ''
  }
  for (const p of posts) {
    if (rule.group_by === 'topic') put(p.topic_id ?? '', p)
    else if (rule.group_by === 'subject') put(subjectOf(p.topic_id), p)
    else if (rule.group_by === 'kind') put(p.kind, p)
    else if (rule.group_by === 'year') put((p.published_at ?? p.date_label).slice(0, 4), p)
    else for (const k of ctx.keywordsOf?.(p.id) ?? []) put(k, p)
  }
  const keys = [...groups.keys()]
  if (rule.group_by === 'topic' || rule.group_by === 'subject') {
    const at = new Map(treeOrder(ctx.topics).map((id, i) => [id, i]))
    keys.sort((a, b) => (at.get(a) ?? Infinity) - (at.get(b) ?? Infinity))
  } else if (rule.group_by === 'year') keys.sort((a, b) => b.localeCompare(a))
  const title = (key: string) =>
    rule.group_by === 'topic' || rule.group_by === 'subject'
      ? ctx.topics.find((t) => t.id === key)?.title ?? key
      : ctx.labelOf?.(rule.group_by, key) ?? key
  return keys.map((key) => ({ key, label: title(key), posts: groups.get(key)! }))
}

export function resolveRule<P extends RulePost>(
  rule: ListingRule,
  posts: readonly P[],
  ctx: RuleContext,
): { posts: P[]; groups: PostGroup<P>[] } {
  const sorted = sortPosts(rule, selectPosts(rule, posts, ctx), ctx)
  const limited = rule.limit_n ? sorted.slice(0, rule.limit_n) : sorted
  return { posts: limited, groups: groupPosts(rule, limited, ctx) }
}
