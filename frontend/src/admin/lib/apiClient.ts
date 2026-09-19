/**
 * Client for the standalone `admin-api` backend (a separate deployment, not
 * part of this Vite app — see backend/admin-api/). Every call is
 * a plain `fetch` against VITE_ADMIN_API_URL; auth is a bearer token
 * (opaque to this client) issued by POST /api/login and stored in
 * localStorage, sent back as `Authorization: Bearer <token>` on every
 * authenticated call.
 */
import type { SectionData } from 'post-renderer'
import { supabase } from '../../lib/supabaseClient'
import type { SiteOverrides } from '../../content/site'
import type { LogEntry } from '../../content/hours'

/** Kho ảnh của bài — cùng tên với migration 0004, và bucket ấy là public. */
const IMAGE_BUCKET = 'post-images'

/**
 * The post templates, kept in `content/templates.ts` with every other place
 * that names them. Re-exported because this module is what the admin screens
 * import their types from.
 */
import type { PostTemplate } from '../../content/templates'

export { POST_TEMPLATE_KEYS as TEMPLATES } from '../../content/templates'
export type { PostTemplate }

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
  /** Câu mở đầu bài — dòng preview dưới tiêu đề ở mọi danh sách. */
  lead: string | null
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
  created_at: string
  updated_at: string
  published_at: string | null
}

export type PostDetail = PostSummary & {
  slug: string
  body: SectionData[] | null
  hero_caption: string | null
  /**
   * Ảnh của các ô ảnh cố định do template đặt tên — migration 0027.
   *
   * Bắt buộc có mặt, dù có thể là `null`: `toPostDetail` bên backend trả
   * `row.plate_images ?? null`, kể cả khi database chưa chạy 0027 và cột vắng
   * hẳn. Khai tuỳ chọn thì bước hoàn tác của màn sửa dựng ra
   * `{ plate_images: undefined }`, mà `JSON.stringify` bỏ khoá ấy đi — PATCH
   * rỗng, và một lần Cmd+Z im lặng không làm gì.
   */
  plate_images: Record<string, string | null> | null
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
  /**
   * The module this one sits inside; null at the top level — migration 0025.
   *
   * Optional because a database that has not run 0025 answers without the
   * column at all. Read it through `lib/contentTree`, never directly.
   */
  parent_id?: string | null
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
  /** An existing tag's id. Bỏ qua khi có `kindLabel`. */
  kind?: string
  /**
   * Tag đúng như chủ site vừa gõ; máy chủ tự ghi nó xuống và tự tính `id`.
   *
   * Trước đây màn "bài mới" phải gọi `createTag` trước để lấy `id` rồi mới gọi
   * `createPost` — hai lượt nối tiếp, mỗi lượt một preflight, trước khi màn
   * soạn kịp mở.
   */
  kindLabel?: string
  en: string
  vi: string
  /** The stored template to start from; its body is copied into the new post. */
  templateId?: string
  /** An existing post to copy; its content comes across, its status does not. */
  fromPostId?: string
  /** Màu riêng; bỏ trống để bài đi theo màu module. */
  theme_color?: string | null
}): Promise<{ id: string }> {
  return request<{ id: string }>('/api/posts', { method: 'POST', body: JSON.stringify(input) })
}

export type Tag = { id: string; label: string }

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

/**
 * PATCH /api/posts/:id — partial update of editable fields.
 *
 * Trả về đúng những cột vừa vá, trừ `body`, chứ không phải cả bài — xem chú
 * thích trong backend/api/posts/[id]/index.ts. Mọi chỗ gọi hàm này đều đã cập
 * nhật state lạc quan trước rồi, không chỗ nào đọc giá trị trả về.
 */
export async function updatePost(
  id: string,
  patch: Partial<{
    en: string
    vi: string
    body: SectionData[]
    hero_image_url: string
    hero_caption: string
    /** Ảnh của các ô ảnh cố định do khuôn bài đặt tên — migration 0027. */
    plate_images: Record<string, string | null> | null
    lead: string
    pull_quote: string
    further_reading: string[]
    date_label: string
      /** Vị trí tự chọn; null trả bài về xếp theo ngày đăng. */
      sort_order: number | null
      pinned: boolean
  }>,
): Promise<Partial<PostDetail> & { id: string }> {
  const result = await request<{ post: Partial<PostDetail> & { id: string } }>(`/api/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return result.post
}

/**
 * POST /api/posts/:id/status — applies one lifecycle transition.
 *
 * Trả về đúng những cột lần đổi này ghi, cộng `id` — không phải cả bài. Ba chỗ
 * gọi (`PostsPanel`, `Editor`, `Cms.removeEntry`) đều bỏ qua giá trị trả về.
 * 'permanently-delete' xoá cứng và trả `{ deleted: true }`.
 */
export async function transitionStatus(
  id: string,
  action: StatusAction,
): Promise<(Partial<PostDetail> & { id: string }) | { deleted: true }> {
  const result = await request<{ post: Partial<PostDetail> & { id: string } } | { deleted: true }>(
    `/api/posts/${id}/status`,
    { method: 'POST', body: JSON.stringify({ action }) },
  )
  return 'deleted' in result ? result : result.post
}

/**
 * Tải một ảnh lên, bằng một lượt chứ không phải hai.
 *
 * Trước đây tệp đi qua serverless function: trình duyệt → Vercel → Supabase.
 * Người dùng chờ hết lượt đầu rồi mới bắt đầu lượt sau. Nay máy chủ chỉ ký một
 * vé — `POST /api/upload` không nhận byte nào — và tệp đi thẳng từ trình duyệt
 * lên Storage.
 *
 * Chữ ký của hàm này không đổi, nên bảy chỗ đang gọi nó không phải sửa gì.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const ticket = await request<{ path: string; token: string; url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  })

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file)

  // Vé ký được nhưng tệp không lên được là một lỗi khác hẳn, nên nó nói tên
  // mình ra chứ không đội lốt lỗi của `/api/upload`.
  if (error) throw new ApiError(`Không tải được ảnh lên kho: ${error.message}`, 502, error)

  return { url: ticket.url }
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

/**
 * POST /api/hours?resource=kinds — add a tag to one system.
 *
 * Trả về đúng tag vừa thêm, không phải cả hai danh sách. Máy chủ từng đọc lại
 * cả bảng `activity_kinds` để trả lời, mà `useHours` thì đã tự thêm vào danh
 * sách của nó trước khi gọi — nên lượt đọc ấy chỉ để ghi đè một giá trị y hệt.
 */
export async function addKind(
  name: string,
  system: 'task' | 'project' = 'task',
): Promise<{ name: string; system: 'task' | 'project' }> {
  return request<{ name: string; system: 'task' | 'project' }>('/api/hours?resource=kinds', {
    method: 'POST',
    body: JSON.stringify({ name, system }),
  })
}

/** Which activities a tag is being taken off, and what they get instead. */
export type TagMove = { to: string | null; ids: string[] }

/**
 * PATCH /api/hours?resource=kinds — rename a tag and everything filed under it.
 *
 * Trả về tên mới, không phải cả hai danh sách — cùng lý do với `addKind`.
 */
export async function renameKind(
  name: string,
  next: string,
  system: 'task' | 'project' = 'task',
): Promise<{ name: string; system: 'task' | 'project' }> {
  return request<{ name: string; system: 'task' | 'project' }>(
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
 * wore the tag — undo needs the ones older than the span on screen too, so it
 * is the one thing this route still reads the database to answer.
 */
export async function deleteKind(
  name: string,
  system: 'task' | 'project' = 'task',
  body: { moves?: TagMove[]; rest?: string | null } = {},
): Promise<{ affected: string[] }> {
  return request<{ affected: string[] }>(
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
