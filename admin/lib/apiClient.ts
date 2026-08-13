import type { SectionData, Template } from 'post-renderer'
import { supabase } from './supabaseClient'

export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'
export type PostSummary = { id: string; slug: string; en: string; vi: string; moduleId: string; kind: string; status: PostStatus; heroImageUrl: string | null; publishedAt: string | null; updatedAt: string }
export type PostDetail = { id: string; slug: string; en: string; vi: string; moduleId: string; kind: string; status: PostStatus; templateId: string | null; heroImageUrl: string | null; body: SectionData[] }
export type { Template }
export type StatusAction = 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'restore-trash' | 'permanently-delete'

async function authedFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  return res
}

export async function listPosts(status: PostStatus | 'all' = 'all'): Promise<PostSummary[]> {
  const res = await authedFetch(`/api/posts?status=${status}`)
  return res.json()
}

export async function createPost(input: { moduleId: string; kind: string; en: string; vi: string }): Promise<{ id: string }> {
  const res = await authedFetch('/api/posts', { method: 'POST', body: JSON.stringify(input) })
  return res.json()
}

export async function getPost(id: string): Promise<PostDetail> {
  const res = await authedFetch(`/api/posts/${id}`)
  return res.json()
}

export async function updatePost(id: string, patch: Partial<{ templateId: string; en: string; vi: string; body: unknown; heroImageUrl: string }>): Promise<{ id: string }> {
  const res = await authedFetch(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  return res.json()
}

export async function transitionStatus(id: string, action: StatusAction): Promise<{ id: string; status: PostStatus } | null> {
  const res = await authedFetch(`/api/posts/${id}/status`, { method: 'POST', body: JSON.stringify({ action }) })
  if (res.status === 204) return null
  return res.json()
}

export async function listTemplates(): Promise<Template[]> {
  const res = await authedFetch('/api/templates')
  return res.json()
}

export async function createTemplate(input: Omit<Template, 'id'>): Promise<Template> {
  const res = await authedFetch('/api/templates', { method: 'POST', body: JSON.stringify(input) })
  return res.json()
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.set('file', file)
  const { data } = await supabase.auth.getSession()
  const res = await fetch('/api/upload', { method: 'POST', body: form, headers: { Authorization: `Bearer ${data.session?.access_token}` } })
  return res.json()
}
