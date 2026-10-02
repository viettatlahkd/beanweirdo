/**
 * Client for the standalone `admin-api` backend (a separate deployment, not
 * part of this Vite app — see backend/admin-api/). Every call is
 * a plain `fetch` against VITE_ADMIN_API_URL; auth is a bearer token
 * (opaque to this client) issued by POST /api/login and stored in
 * localStorage, sent back as `Authorization: Bearer <token>` on every
 * authenticated call.
 */
import type { SectionData } from 'post-renderer'
import type { SiteOverrides } from '../../content/site'
import type { LogEntry } from '../../content/hours'
import type { ListingRule } from '../../lib/listingRule'

/** The 3 real post templates (the old `templates` table is gone). */
export const TEMPLATES = ['article', 'cards', 'report', 'longform', 'memo', 'bitesize'] as const
export type PostTemplate = (typeof TEMPLATES)[number]

export type PostKind = 'note' | 'essay' | 'ref' | 'log'
export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'
export type StatusAction =
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'restore-trash'
  | 'permanently-delete'

export type PostSummary = {
  id: string
  module_id: string
  en: string
  vi: string
  kind: PostKind
  date_label: string
  status: PostStatus
  template: PostTemplate | null
  hero_image_url: string | null
  /** Màu riêng của bài; rỗng nghĩa là theo màu module — xem migration 0021. */
  theme_color: string | null
  /** Cover if the post has one, otherwise the first image inside it. */
  thumbnail_url: string | null
  /** Vị trí tự chọn; rỗng nghĩa là chưa ai chọn. */
  sort_order: number | null
  /** Bài ghim dẫn đầu module của nó. */
  pinned: boolean
  /** Chỗ trên cây chủ đề (migration 0027); null khi chưa xếp. */
  topic_id: string | null
  /** Tag theme ids; only the list endpoint fills it (GET /api/posts). */
  keywords?: string[]
  visibility: PostVisibility
  /** Địa chỉ đã cố định; null với bài nháp, vốn được gọi bằng địa chỉ suy ra. */
  slug: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export type PostVisibility = 'public' | 'private'

export type PostDetail = PostSummary & {
  /** Tag theme (post_keywords). */
  keywords: string[]
  /** Địa chỉ cũ vẫn chuyển tiếp về bài (post_slugs). */
  old_slugs?: string[]
  body: SectionData[] | null
  hero_caption: string | null
  lead: string | null
  pull_quote: string | null
  further_reading: string[] | null
  deleted_at: string | null
  previous_status: PostStatus | null
}

export type Module = {
  id: string
  title: string
  accent: string
  on_color: string
  tint: string
  tint2: string
  layout: string
  concept: string
  blurb: string
  long_desc: string
  treatment: string
  layout_note: string
  shot1: string | null
  shot2: string | null
  shot3: string | null
  /** Uploaded photo for each shot slot — null until one is uploaded. */
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
  /** 'normal' = reading module; 'special' = a journal a post can be filed under. */
  kind: 'normal' | 'special'
}

const DEFAULT_API_BASE = 'http://localhost:3001'
const API_BASE = ((import.meta.env.VITE_ADMIN_API_URL as string | undefined) ?? DEFAULT_API_BASE).replace(/\/$/, '')

/** localStorage key holding the bearer token issued by POST /api/login. */
export const TOKEN_KEY = 'admin_token'

export class ApiError extends Error {
  status: number
  /**
   * Thân phản hồi lúc máy chủ từ chối.
   *
   * Có lúc lời từ chối mang theo dữ liệu người gọi cần: xoá một tag còn thứ
   * đang đeo thì máy chủ trả về `wearing` — danh sách bài và ghi chép ấy — để
   * khung sửa hỏi lại "chuyển sang đâu". Ném đi chỉ mỗi câu chữ thì lời hỏi ấy
   * không hỏi được.
   */
  payload: unknown
  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (init.body != null && !isFormData) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`
    throw new ApiError(message, res.status, data)
  }
  return data as T
}

/** POST /api/login — static-password login (no username). Stores the token on success. */
export async function login(password: string): Promise<{ token: string }> {
  const result = await request<{ token: string }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setToken(result.token)
  return result
}

/** GET /api/posts?status=... — defaults to 'all'. */
export async function listPosts(status: PostStatus | 'all' = 'all'): Promise<PostSummary[]> {
  const result = await request<{ posts: PostSummary[] }>(`/api/posts?status=${status}`)
  return result.posts
}

/** POST /api/posts — create a draft. Server derives n and date_label; status defaults to 'draft'. */
export async function createPost(input: {
  module_id: string
  /** The tag, free text since migration 0020 — see backend/api/tags.ts. */
  kind: string
  en: string
  vi: string
  /** The stored template to start from; its body is copied into the new post. */
  templateId?: string
  /** An existing post to copy; its content comes across, its status does not. */
  fromPostId?: string
  /** Màu riêng; bỏ trống để bài đi theo màu module. */
  theme_color?: string | null
  /** Chỗ trên cây chủ đề. */
  topic_id?: string | null
}): Promise<{ id: string }> {
  return request<{ id: string }>('/api/posts', { method: 'POST', body: JSON.stringify(input) })
}

/** A dạng bài. `posts`: how many posts wear it (not in every response). */
export type Tag = { id: string; label: string; posts?: number }

/** GET /api/tags — every tag the owner has written, oldest first. */
export async function listTags(): Promise<Tag[]> {
  const result = await request<{ tags: Tag[] }>('/api/tags')
  return result.tags
}

/** POST /api/tags — add one, or get back the one that already says this. */
export async function createTag(label: string): Promise<Tag> {
  return request<Tag>('/api/tags', { method: 'POST', body: JSON.stringify({ label }) })
}

/** PATCH /api/tags?id= — đổi tên hiển thị; `id` giữ nguyên nên bài không mất chỗ dựa. */
export async function renameTag(id: string, label: string): Promise<Tag> {
  return request<Tag>(`/api/tags?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  })
}

/**
 * DELETE /api/tags?id= — xoá một tag.
 *
 * `to` là tag thay thế cho những gì đang đeo nó; `null` là cố ý bỏ trống.
 * Không truyền gì thì máy chủ từ chối và trả về danh sách đang đeo — xoá lặng
 * lẽ là để lại bài trỏ vào một tag không còn tồn tại.
 */
export async function deleteTag(
  id: string,
  to?: string | null,
): Promise<{ deleted: string; moved: { posts: string[]; notes: string[] } }> {
  return request(`/api/tags?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify(to === undefined ? {} : { to }),
  })
}

/** GET /api/posts/:id — full post detail. */
export async function getPost(id: string): Promise<PostDetail> {
  const result = await request<{ post: PostDetail }>(`/api/posts/${id}`)
  return result.post
}

/** PATCH /api/posts/:id — partial update of editable fields; returns the full updated detail. */
export async function updatePost(
  id: string,
  patch: Partial<{
    en: string
    vi: string
    body: SectionData[]
    hero_image_url: string
    hero_caption: string
    lead: string
    pull_quote: string
    further_reading: string[]
    date_label: string
      /** Vị trí tự chọn; null trả bài về xếp theo ngày đăng. */
      sort_order: number | null
      pinned: boolean
      topic_id: string | null
      visibility: PostVisibility
      template: PostTemplate
      module_id: string
      /** Dạng bài. */
      kind: string
      /** Địa chỉ mới; địa chỉ cũ được giữ để chuyển tiếp. */
      slug: string
      /** Thay cả bộ tag theme. */
      keywords: string[]
      /** Thôi chuyển tiếp các địa chỉ cũ này. */
      forget_slugs: string[]
  }>,
): Promise<PostDetail> {
  const result = await request<{ post: PostDetail }>(`/api/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return result.post
}

/**
 * POST /api/posts/:id/status — applies one lifecycle transition. Returns the
 * full updated detail, except for 'permanently-delete' which hard-deletes
 * the row and returns `{ deleted: true }` instead.
 */
export async function transitionStatus(
  id: string,
  action: StatusAction,
  /** Với 'publish': địa chỉ cố định cho bài chưa có — xem usePostAddresses.slugToPublish. */
  slug?: string,
): Promise<PostDetail | { deleted: true }> {
  const result = await request<{ post: PostDetail } | { deleted: true }>(`/api/posts/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(slug ? { action, slug } : { action }),
  })
  return 'deleted' in result ? result : result.post
}

/** POST /api/upload — multipart upload, field name 'file'. */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.set('file', file)
  return request<{ url: string }>('/api/upload', { method: 'POST', body: form })
}

/** GET /api/modules — for the admin's module-select dropdown. */
export async function listModules(): Promise<Module[]> {
  const result = await request<{ modules: Module[] }>('/api/modules')
  return result.modules
}

/** PUT /api/posts — reorder one module's posts; also renumbers their `n`. */
export async function reorderPosts(module_id: string, order: string[]): Promise<PostSummary[]> {
  const result = await request<{ posts: PostSummary[] }>('/api/posts', {
    method: 'PUT',
    body: JSON.stringify({ module_id, order }),
  })
  return result.posts
}

/** POST /api/modules — the CMS's "+ module mới"; server fills in placeholders. */
export async function createModule(id?: string): Promise<Module> {
  const result = await request<{ module: Module }>('/api/modules', {
    method: 'POST',
    body: JSON.stringify(id ? { id } : {}),
  })
  return result.module
}

/** PATCH /api/modules/:id — partial update of one module. */
export async function updateModule(id: string, patch: Partial<Omit<Module, 'id' | 'sort_order'>>): Promise<Module> {
  const result = await request<{ module: Module }>(`/api/modules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return result.module
}

/** DELETE /api/modules/:id — removes the module and (by cascade) its posts. */
export async function deleteModule(id: string): Promise<void> {
  await request<Record<string, never>>(`/api/modules/${id}`, { method: 'DELETE' })
}

/** PUT /api/modules — reorder every module by id. */
export async function reorderModules(order: string[]): Promise<Module[]> {
  const result = await request<{ modules: Module[] }>('/api/modules', {
    method: 'PUT',
    body: JSON.stringify({ order }),
  })
  return result.modules
}

/** GET /api/site — the stored site-copy overrides (`{}` on a fresh install). */
export async function getSite(): Promise<SiteOverrides> {
  const result = await request<{ site: SiteOverrides }>('/api/site')
  return result.site
}

/**
 * PATCH /api/site — shallow-merges the given fields into the stored copy.
 * Passing '' for a field drops it, which restores that field's default.
 */
export async function updateSite(patch: SiteOverrides): Promise<SiteOverrides> {
  const result = await request<{ site: SiteOverrides }>('/api/site', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return result.site
}

// ── Ghi 02 — practice log ───────────────────────────────────────────────────

/** GET /api/hours — the span's logs plus every kind, in one round trip. */
export async function listHours(
  from?: string,
): Promise<{ logs: LogEntry[]; kinds: string[]; projects: string[] }> {
  const query = from ? `?from=${encodeURIComponent(from)}` : ''
  return request<{ logs: LogEntry[]; kinds: string[]; projects: string[] }>(`/api/hours${query}`)
}

/** POST /api/hours — add one activity. */
export async function createLog(entry: Omit<LogEntry, 'id'>): Promise<LogEntry> {
  const result = await request<{ log: LogEntry }>('/api/hours', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
  return result.log
}

/** PATCH /api/hours?id= — edit one field or several. */
export async function patchLog(id: string, patch: Partial<Omit<LogEntry, 'id'>>): Promise<LogEntry> {
  const result = await request<{ log: LogEntry }>(`/api/hours?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return result.log
}

/** DELETE /api/hours?id= */
export async function deleteLog(id: string): Promise<void> {
  await request<Record<string, never>>(`/api/hours?id=${id}`, { method: 'DELETE' })
}

/** POST /api/hours?resource=kinds — add a tag to one system; both lists come back. */
export async function addKind(
  name: string,
  system: 'task' | 'project' = 'task',
): Promise<{ kinds: string[]; projects: string[] }> {
  return request<{ kinds: string[]; projects: string[] }>('/api/hours?resource=kinds', {
    method: 'POST',
    body: JSON.stringify({ name, system }),
  })
}

/** Which activities a tag is being taken off, and what they get instead. */
export type TagMove = { to: string | null; ids: string[] }

/** PATCH /api/hours?resource=kinds — rename a tag and everything filed under it. */
export async function renameKind(
  name: string,
  next: string,
  system: 'task' | 'project' = 'task',
): Promise<{ kinds: string[]; projects: string[] }> {
  return request<{ kinds: string[]; projects: string[] }>(
    `/api/hours?resource=kinds&name=${encodeURIComponent(name)}&system=${system}`,
    { method: 'PATCH', body: JSON.stringify({ name: next }) },
  )
}

/**
 * DELETE /api/hours?resource=kinds — remove a tag.
 *
 * `moves` are the reassignments chosen for the activities wearing it; `rest`
 * catches whatever those did not cover. Leaving `rest` undefined files the
 * remainder as unclassified. `affected` comes back holding every activity that
 * wore the tag — undo needs the ones older than the span on screen too.
 */
export async function deleteKind(
  name: string,
  system: 'task' | 'project' = 'task',
  body: { moves?: TagMove[]; rest?: string | null } = {},
): Promise<{ kinds: string[]; projects: string[]; affected: string[] }> {
  return request<{ kinds: string[]; projects: string[]; affected: string[] }>(
    `/api/hours?resource=kinds&name=${encodeURIComponent(name)}&system=${system}`,
    { method: 'DELETE', body: JSON.stringify(body) },
  )
}

/** PATCH /api/hours?resource=assign — move activities between tags, tags untouched. */
export async function assignTags(
  system: 'task' | 'project',
  moves: TagMove[],
): Promise<{ moved: number }> {
  return request<{ moved: number }>('/api/hours?resource=assign', {
    method: 'PATCH',
    body: JSON.stringify({ system, moves }),
  })
}

// ── Ghi 01 — loose notes ────────────────────────────────────────────────────


/** A stored blueprint a post can start from — see migration 0014. */
export type TemplateSummary = {
  id: string
  name: string
  description: string
  renderer: PostTemplate
  sort_order: number
}

export type StoredTemplate = TemplateSummary & { body: unknown | null }

/** GET /api/templates — the choices, without their bodies. */
export async function listTemplates(): Promise<TemplateSummary[]> {
  const result = await request<{ templates: TemplateSummary[] }>('/api/templates')
  return result.templates
}

/** GET /api/templates?id=… — one template, body included. */
export async function getTemplate(id: string): Promise<StoredTemplate> {
  const result = await request<{ template: StoredTemplate }>(`/api/templates?id=${encodeURIComponent(id)}`)
  return result.template
}

/** PATCH /api/templates?id=… — save an edited template back. */
export async function updateTemplate(
  id: string,
  patch: Partial<Pick<StoredTemplate, 'name' | 'description' | 'body' | 'sort_order'>>,
): Promise<StoredTemplate> {
  const result = await request<{ template: StoredTemplate }>(`/api/templates?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return result.template
}

// ── Portfolio ───────────────────────────────────────────────────────────────

/** Portfolio page lifecycle — see migrations 0025 and 0026. */
export type PortStatus = 'draft' | 'published' | 'archived'

export type PortPageInput = {
  slug: string
  title: string
  intro?: string
  palette?: string
  blocks?: unknown[]
  status?: PortStatus
  sortOrder?: number
}

export type PortPageRecord = Required<PortPageInput> & { id: string; updatedAt: string }

/** GET /api/portfolio — every port page (drafts included) and the saved design tokens. */
export async function getPortfolio(): Promise<{ pages: PortPageRecord[]; design: Record<string, unknown> }> {
  return request<{ pages: PortPageRecord[]; design: Record<string, unknown> }>('/api/portfolio')
}

export async function createPortPage(input: PortPageInput): Promise<PortPageRecord> {
  const r = await request<{ page: PortPageRecord }>('/api/portfolio', { method: 'POST', body: JSON.stringify(input) })
  return r.page
}

export async function updatePortPage(id: string, patch: Partial<PortPageInput>): Promise<PortPageRecord> {
  const r = await request<{ page: PortPageRecord }>(`/api/portfolio?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return r.page
}

export async function deletePortPage(id: string): Promise<void> {
  await request(`/api/portfolio?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** PATCH /api/portfolio?part=design — merges one level deep; `null` resets a key to its default. */
export async function updatePortDesign(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await request<{ design: Record<string, unknown> }>('/api/portfolio?part=design', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return r.design
}

// ── Tầng nội dung: cây chủ đề và tag theme (migration 0027) ──────────────────

export type Topic = {
  id: string
  /** null = subject; còn lại là topic con của subject đó. */
  parent_id: string | null
  title: string
  intro: string
  accent: string | null
  on_color: string | null
  tint: string | null
  tint2: string | null
  image_url: string | null
  sort_order: number
  visibility: PostVisibility
  /** Số bài (trừ thùng rác) đang nằm ở nút này. */
  posts: number
}

export type Keyword = { id: string; label: string; posts: number }

export async function listTopics(): Promise<Topic[]> {
  return (await request<{ topics: Topic[] }>('/api/tags?vocab=topics')).topics
}

export async function createTopic(title: string, parent_id: string | null): Promise<Topic> {
  const r = await request<{ topic: Topic }>('/api/tags?vocab=topics', { method: 'POST', body: JSON.stringify({ title, parent_id }) })
  return r.topic
}

export async function updateTopic(
  id: string,
  patch: Partial<Pick<Topic, 'title' | 'intro' | 'parent_id' | 'visibility' | 'accent' | 'on_color' | 'tint' | 'tint2' | 'image_url'>>,
): Promise<Topic> {
  const r = await request<{ topic: Topic }>(`/api/tags?vocab=topics&id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return r.topic
}

/** Thứ tự mới của một tầng: các id theo thứ tự. */
export async function reorderTopics(order: string[]): Promise<void> {
  await request('/api/tags?vocab=topics', { method: 'PUT', body: JSON.stringify({ order }) })
}

/** Máy chủ từ chối (409) khi nút còn bài hoặc còn topic con. */
export async function deleteTopic(id: string): Promise<void> {
  await request(`/api/tags?vocab=topics&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listKeywords(): Promise<Keyword[]> {
  return (await request<{ keywords: Keyword[] }>('/api/tags?vocab=keywords')).keywords
}

export async function createKeyword(label: string): Promise<Keyword> {
  const k = await request<{ id: string; label: string }>('/api/tags?vocab=keywords', { method: 'POST', body: JSON.stringify({ label }) })
  return { ...k, posts: 0 }
}

export async function renameKeyword(id: string, label: string): Promise<void> {
  await request(`/api/tags?vocab=keywords&id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ label }) })
}

/** `to`: merge into that tag — its posts wear `to` before this one goes. */
export async function deleteKeyword(id: string, to?: string): Promise<void> {
  await request(`/api/tags?vocab=keywords&id=${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify(to ? { to } : {}) })
}

// ── Tầng feature: trang, quy chế, cài đặt đè (migration 0028) ────────────────


export type LayoutPage = {
  id: string
  kind: 'curated' | 'template_subject' | 'template_topic' | 'template_keyword' | 'nav'
  title: string
  copy: Record<string, unknown>
  presentation: Record<string, unknown>
  blocks: string[]
  aliases: string[]
  visibility: PostVisibility
}
export type LayoutOverride = {
  node_type: 'topic' | 'keyword'
  node_id: string
  rule_id: string | null
  presentation: Record<string, unknown>
  aliases: string[]
}
export type StoredRule = ListingRule & { id: string }

export async function getLayout(): Promise<{ pages: LayoutPage[]; overrides: LayoutOverride[]; rules: StoredRule[] }> {
  return request('/api/tags?vocab=layout')
}

export async function createRule(rule: Partial<ListingRule>): Promise<StoredRule> {
  return (await request<{ rule: StoredRule }>('/api/tags?vocab=rules', { method: 'POST', body: JSON.stringify(rule) })).rule
}

export async function updateRule(id: string, patch: Partial<ListingRule>): Promise<StoredRule> {
  const r = await request<{ rule: StoredRule }>(`/api/tags?vocab=rules&id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
  return r.rule
}

export async function createPage(id: string, title: string): Promise<{ page: LayoutPage; rule: { id: string } }> {
  return request('/api/tags?vocab=pages', { method: 'POST', body: JSON.stringify({ id, title }) })
}

export async function updatePage(id: string, patch: Partial<Omit<LayoutPage, 'id' | 'kind'>>): Promise<LayoutPage> {
  const r = await request<{ page: LayoutPage }>(`/api/tags?vocab=pages&id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
  return r.page
}

export async function deletePage(id: string): Promise<void> {
  await request(`/api/tags?vocab=pages&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function saveOverride(row: Pick<LayoutOverride, 'node_type' | 'node_id'> & Partial<LayoutOverride>): Promise<LayoutOverride> {
  return (await request<{ override: LayoutOverride }>('/api/tags?vocab=overrides', { method: 'PUT', body: JSON.stringify(row) })).override
}

export async function deleteOverride(type: string, node: string): Promise<void> {
  await request(`/api/tags?vocab=overrides&type=${encodeURIComponent(type)}&node=${encodeURIComponent(node)}`, { method: 'DELETE' })
}
