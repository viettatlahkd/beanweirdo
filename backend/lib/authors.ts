import type { Author, AuthorCreateRequest, AuthorRef } from 'api-contract'
import { slug as slugOf } from './tags.js'

/** The columns `Author` is built from, plus the embedded post count. */
export const AUTHOR_COLUMNS = 'id, name, slug, avatar_url, bio, active, created_at, post_authors(count)'
export const AUTHOR_REF_COLUMNS = 'id, name, slug, avatar_url'

type AuthorRow = Omit<Author, 'post_count'> & { post_authors?: { count: number }[] | null }

export function toAuthor(row: AuthorRow): Author {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    avatar_url: row.avatar_url,
    bio: row.bio,
    active: row.active,
    created_at: row.created_at,
    post_count: row.post_authors?.[0]?.count ?? 0,
  }
}

export function toAuthorRef(row: AuthorRef): AuthorRef {
  return { id: row.id, name: row.name, slug: row.slug, avatar_url: row.avatar_url }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FIELDS = ['name', 'slug', 'avatar_url', 'bio', 'active'] as const satisfies readonly (keyof AuthorCreateRequest)[]

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

type Parsed<T> = { ok: true; value: T } | { ok: false; field: string; error: string }

/**
 * Check an author body field by field and return the row to write.
 *
 * Unknown keys are refused rather than dropped: a misspelt `avatarUrl` that is
 * silently ignored looks, from the form, exactly like a save that worked.
 */
export function parseAuthorInput(
  body: Record<string, unknown>,
  mode: 'create' | 'update',
): Parsed<Partial<Omit<Author, 'id' | 'created_at' | 'post_count'>>> {
  const unknown = Object.keys(body).find((key) => !(FIELDS as readonly string[]).includes(key))
  if (unknown) return { ok: false, field: unknown, error: `unknown field '${unknown}'` }

  const out: Partial<Omit<Author, 'id' | 'created_at' | 'post_count'>> = {}
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)

  if (has('name') || mode === 'create') {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return { ok: false, field: 'name', error: 'name is required' }
    if (name.length > 80) return { ok: false, field: 'name', error: 'name is longer than 80 characters' }
    out.name = name
  }

  if (has('slug')) {
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    if (!SLUG.test(slug) || slug.length > 60) {
      return { ok: false, field: 'slug', error: 'slug must be lowercase letters, digits and single dashes, at most 60' }
    }
    out.slug = slug
  } else if (mode === 'create') {
    // Same rule as tags, so "Nguyễn Đức" becomes `nguyen-duc` on both.
    const slug = slugOf(out.name ?? '').slice(0, 60).replace(/-$/, '')
    if (!slug) return { ok: false, field: 'slug', error: 'name must contain a letter or a number' }
    out.slug = slug
  }

  if (has('avatar_url')) {
    const url = body.avatar_url
    if (url === null || url === '') out.avatar_url = null
    else if (typeof url === 'string' && /^https?:\/\/\S+$/.test(url.trim())) out.avatar_url = url.trim()
    else return { ok: false, field: 'avatar_url', error: 'avatar_url must be an http(s) URL or null' }
  }

  if (has('bio')) {
    if (typeof body.bio !== 'string') return { ok: false, field: 'bio', error: 'bio must be a string' }
    if (body.bio.length > 1000) return { ok: false, field: 'bio', error: 'bio is longer than 1000 characters' }
    out.bio = body.bio.trim()
  }

  if (has('active')) {
    if (typeof body.active !== 'boolean') return { ok: false, field: 'active', error: 'active must be a boolean' }
    out.active = body.active
  }

  if (Object.keys(out).length === 0) return { ok: false, field: 'body', error: 'no fields to update' }
  return { ok: true, value: out }
}

/** `author_ids`: distinct uuids, in byline order. */
export function parseAuthorIds(body: Record<string, unknown>): Parsed<string[]> {
  const ids = body.author_ids
  if (!Array.isArray(ids) || !ids.every(isUuid)) {
    return { ok: false, field: 'author_ids', error: 'author_ids must be an array of author ids' }
  }
  if (new Set(ids).size !== ids.length) {
    return { ok: false, field: 'author_ids', error: 'author_ids lists the same author twice' }
  }
  return { ok: true, value: ids }
}

/** The unique-violation Postgres raises when a slug is taken. */
export function isDuplicate(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505'
}

/** Migration 0030 has not been run: reads may treat that as "no authors". */
export function isMissingAuthorTables(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === '42P01' || code === 'PGRST205' || code === 'PGRST200'
}
