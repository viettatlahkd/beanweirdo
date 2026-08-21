import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { POST_TEMPLATES } from '../../../backend/lib/posts'

/**
 * One set of templates, named in three places that cannot import each other:
 * the database's check constraint, the backend's list, and the renderer's
 * dispatcher. Nothing makes them agree, so this compares them.
 *
 * They drifted once already. Migration 0010 added `longform` and `memo`, the
 * backend list was not updated, and for months creating either through the
 * admin answered `400 template must be one of: article, cards, report` — while
 * two such posts sat published on the live site, put there by other means.
 *
 * A new template means touching all three. This test says so out loud instead
 * of letting the next person find out in production.
 */

const ROOT = join(__dirname, '../../..')

/** The values the newest migration to touch the constraint allows. */
function templatesAllowedByDatabase(): string[] {
  const dir = join(ROOT, 'backend/supabase/migrations')
  // `notes` has a `template` column too, so match the constraint by its name
  // rather than by the column — otherwise the note kinds win the last match.
  const named = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .flatMap((sql) => [
      ...sql.matchAll(/posts_template_check[\s\S]{0,120}?check \(template in \(([^)]*)\)\)/g),
    ])

  const last = named.at(-1)
  if (!last) throw new Error('No migration defines the posts_template_check constraint')
  return [...last[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** The templates the dispatcher actually routes. */
function templatesTheRendererHandles(): string[] {
  const src = readFileSync(join(__dirname, 'PostRenderer.tsx'), 'utf8')
  return [...src.matchAll(/template:\s*'([a-z]+)'/g)].map((m) => m[1])
}

describe('the template list agrees everywhere', () => {
  it('database and backend name the same templates', () => {
    expect([...POST_TEMPLATES].sort()).toEqual(templatesAllowedByDatabase().sort())
  })

  it('the renderer can draw every template the backend accepts', () => {
    const handled = new Set(templatesTheRendererHandles())
    for (const t of POST_TEMPLATES) expect(handled).toContain(t)
  })

  it('the renderer draws nothing the backend would reject', () => {
    const accepted = new Set<string>(POST_TEMPLATES)
    for (const t of templatesTheRendererHandles()) expect(accepted).toContain(t)
  })
})
