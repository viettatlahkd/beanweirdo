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
import type { Note } from '../../content/notes'

/** The 3 real post templates (the old `templates` table is gone). */
export const TEMPLATES = ['article', 'cards', 'report', 'longform', 'memo'] as const
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
  moduleId: string
  n: number
  en: string
  vi: string
  kind: PostKind
  dateLabel: string
  status: PostStatus
  template: PostTemplate | null
  heroImageUrl: string | null
  /** Cover if the post has one, otherwise the first image inside it. */
  thumbnailUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export type PostDetail = PostSummary & {
  slug: string
  body: SectionData[] | null
  heroCaption: string | null
  lead: string | null
  pullQuote: string | null
  furtherReading: string[] | null
  deletedAt: string | null
  previousStatus: PostStatus | null
}

export type Module = {
  id: string
  title: string
  accent: string
  onColor: string
  tint: string
  tint2: string
  layout: string
  concept: string
  blurb: string
  longDesc: string
  treatment: string
  layoutNote: string
  shot1: string | null
  shot2: string | null
  shot3: string | null
  /** Uploaded photo for each shot slot — null until one is uploaded. */
  img1: string | null
  img2: string | null
  img3: string | null
  sortOrder: number
  /** 'normal' = reading module; 'special' = a journal a post can be filed under. */
  kind: 'normal' | 'special'
}

const DEFAULT_API_BASE = 'http://localhost:3001'
const API_BASE = ((import.meta.env.VITE_ADMIN_API_URL as string | undefined) ?? DEFAULT_API_BASE).replace(/\/$/, '')

/** localStorage key holding the bearer token issued by POST /api/login. */
export const TOKEN_KEY = 'admin_token'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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
    throw new ApiError(message, res.status)
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

/** POST /api/posts — create a draft. Server derives n and dateLabel; status defaults to 'draft'. */
export async function createPost(input: {
  moduleId: string
  kind: PostKind
  en: string
  vi: string
  template?: PostTemplate
}): Promise<{ id: string }> {
  return request<{ id: string }>('/api/posts', { method: 'POST', body: JSON.stringify(input) })
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
    heroImageUrl: string
    heroCaption: string
    lead: string
    pullQuote: string
    furtherReading: string[]
    n: string
    dateLabel: string
    sortOrder: number
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
): Promise<PostDetail | { deleted: true }> {
  const result = await request<{ post: PostDetail } | { deleted: true }>(`/api/posts/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ action }),
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
export async function reorderPosts(moduleId: string, order: string[]): Promise<PostSummary[]> {
  const result = await request<{ posts: PostSummary[] }>('/api/posts', {
    method: 'PUT',
    body: JSON.stringify({ moduleId, order }),
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
export async function updateModule(id: string, patch: Partial<Omit<Module, 'id' | 'sortOrder'>>): Promise<Module> {
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

// ── Ghi 01 — loose notes ────────────────────────────────────────────────────

/** POST /api/notes — a blank note, dated today, ready to be typed into. */
export async function createNote(partial: Partial<Omit<Note, 'id'>> = {}): Promise<Note> {
  const result = await request<{ note: Note }>('/api/notes', {
    method: 'POST',
    body: JSON.stringify(partial),
  })
  return result.note
}

/** PATCH /api/notes?id= */
export async function patchNote(id: string, patch: Partial<Omit<Note, 'id'>>): Promise<Note> {
  const result = await request<{ note: Note }>(`/api/notes?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return result.note
}

/** DELETE /api/notes?id= */
export async function deleteNote(id: string): Promise<void> {
  await request<Record<string, never>>(`/api/notes?id=${id}`, { method: 'DELETE' })
}
