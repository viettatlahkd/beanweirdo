// Row/JSON mapping for `templates` — see migration 0014.
//
// A template is stored content you keep so the next similar post starts from
// it. It is not a post: no status, never published or archived, never in a
// listing. `renderer` says which component draws it, and several templates may
// share one — the id is the template, not the shape.

import type { PostTemplate } from './posts.js'

export interface TemplateRow {
  id: string
  name: string
  description: string
  renderer: PostTemplate
  body: unknown | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  name: string
  description: string
  renderer: PostTemplate
  body: unknown | null
  sort_order: number
}

export function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    renderer: row.renderer,
    body: row.body,
    sort_order: row.sort_order,
  }
}

/** Listing the choices doesn't need every template's whole body. */
export const TEMPLATE_SUMMARY_COLUMNS = 'id, name, description, renderer, sort_order'

export const TEMPLATE_PATCHABLE: Array<{ jsonKey: string; column: keyof TemplateRow }> = [
  { jsonKey: 'name', column: 'name' },
  { jsonKey: 'description', column: 'description' },
  { jsonKey: 'body', column: 'body' },
  { jsonKey: 'sort_order', column: 'sort_order' },
]
