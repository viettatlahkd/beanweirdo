/**
 * Every page of every site, one shape — migration 0032.
 *
 *   GET    /api/tags?vocab=nodes[&site=…]   → NodeListResponse
 *   POST   /api/tags?vocab=nodes            NodeCreateRequest → NodeResponse (201)
 *   PUT    /api/tags?vocab=nodes            { order: id[] } — one level's new order
 *   PATCH  /api/tags?vocab=nodes&id=…       NodePatch → NodeResponse
 *   DELETE /api/tags?vocab=nodes&id=…       409 while posts or child nodes hang on it
 *
 * The owner asked (2026-10-13) for the blog's topic tree and the port's pages
 * to be one table and one code path, so a third site is a new `site` value
 * rather than a third set of tables, endpoints and editors.
 */

export type Site = 'blog' | 'port'

/** One set for both sites (owner's choice, 2026-10-13). Only `published` is public. */
export type NodeStatus = 'draft' | 'published' | 'archived'

export type Node = {
  id: string
  site: Site
  /** null = top level of its site (a subject on the blog). */
  parent_id: string | null
  /** The address word, unique within a site. */
  slug: string
  title: string
  intro: string
  /** Giao diện: a palette key from portfolio_design; null = the site's default. */
  look: string | null
  /** The page's own content, top to bottom. */
  blocks: unknown[]
  status: NodeStatus
  /** The child site this page is the home of (0035); at most one page each. */
  home_of: 'biz' | 'bean' | null
  sort_order: number
  accent: string | null
  on_color: string | null
  tint: string | null
  tint2: string | null
  image_url: string | null
  /** Posts filed on this node (trash excluded). */
  posts: number
  updated_at: string
}

export type NodeCreateRequest = {
  site: Site
  title: string
  parent_id?: string | null
  /** Default: made from the title. */
  slug?: string
  look?: string | null
  blocks?: unknown[]
  status?: NodeStatus
}

export type NodePatch = Partial<
  Pick<Node, 'title' | 'intro' | 'parent_id' | 'slug' | 'look' | 'blocks' | 'status' | 'accent' | 'on_color' | 'tint' | 'tint2' | 'image_url'>
>

export type NodeListResponse = { nodes: Node[] }
export type NodeResponse = { node: Node }
