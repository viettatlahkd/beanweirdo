import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MODULE_LAYOUTS as ON_THE_SERVER } from '../../../backend/lib/modules'
import { MODULE_LAYOUTS, MODULE_LAYOUT_KEYS, layoutSpec, pageSlotCountOf } from './layouts'

/**
 * One set of module layouts, named in two places that cannot import each
 * other: this registry and the backend's `MODULE_LAYOUTS`, which the API
 * validates `PATCH /api/modules/:id` against.
 *
 * Frontend and backend are separate Vercel deployments with separate
 * dependency trees, so the backend importing `frontend/src` would mean its
 * build reaching outside its own folder. `moduleTree.contract.test.ts` makes
 * the same call for the same reason, and so does
 * `packages/post-renderer/src/templateContract.test.ts`, which exists because
 * the template list drifted in exactly this way and spent months answering
 * `400` in production.
 *
 * So: two lists, one test that reads both.
 */

const ROOT = join(__dirname, '../../..')

/**
 * Layout values the migrations still constrain, by table.
 *
 * Migration 0026 drops both `check` constraints, so the expected answer here
 * is "none" — a layout is a row in this file, and adding one should not need
 * DDL on the live database. The test keeps reading the SQL anyway: if someone
 * adds the constraint back, the registry quietly stops being the only place
 * that decides, and this says so.
 */
function layoutsConstrainedByDatabase(): Record<string, string[]> {
  const dir = join(ROOT, 'backend/supabase/migrations')
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const out: Record<string, string[]> = {}
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8')
    for (const m of sql.matchAll(/(modules|templates)_layout_check/g)) {
      const table = m[1]
      // A `drop constraint` line names it too, and that is the line that
      // takes it away — hence reading the statement, not just the name.
      const stmt = sql.slice(Math.max(0, m.index - 120), m.index + 200)
      if (/drop constraint/.test(stmt)) delete out[table]
    }
    for (const m of sql.matchAll(
      /create table[^;]*?\b(modules|templates)\b[\s\S]*?layout\s+text[^,]*?check \(layout in \(([^)]*)\)\)/g,
    )) {
      out[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])
    }
  }
  return out
}

describe('the module layout list agrees everywhere', () => {
  it('the frontend registry and the backend name the same layouts', () => {
    expect([...MODULE_LAYOUT_KEYS].sort()).toEqual([...ON_THE_SERVER].sort())
  })

  it('no migration constrains which layouts may be stored', () => {
    // Adding a layout is one row in `content/layouts.ts` plus the backend
    // list. It must not also be a migration the site owner runs by hand.
    expect(layoutsConstrainedByDatabase()).toEqual({})
  })
})

describe('the registry answers about itself', () => {
  it('gives every layout a label and at least one photo cell', () => {
    for (const l of MODULE_LAYOUTS) {
      expect(l.label).not.toBe('')
      expect(l.pageImageNames.length).toBeGreaterThan(0)
    }
  })

  it('counts photo cells by naming them, so the two cannot disagree', () => {
    for (const l of MODULE_LAYOUTS) {
      expect(pageSlotCountOf(l.key)).toBe(l.pageImageNames.length)
    }
  })

  it('falls back to the first layout for a value stored before this list knew it', () => {
    // A module row arrives from the database; `layout` is whatever is there.
    expect(layoutSpec('mosaic')).toBe(MODULE_LAYOUTS[0])
    expect(pageSlotCountOf('')).toBe(MODULE_LAYOUTS[0].pageImageNames.length)
  })
})
