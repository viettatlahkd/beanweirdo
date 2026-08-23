#!/usr/bin/env node
/**
 * Run a .sql file against the journal's database.
 *
 * PostgREST — the thing the service key opens — only reads and writes rows; it
 * has no way to alter a table. That left DDL as the one job nobody here could
 * do, which is why every migration kept getting handed back to the site owner.
 *
 * A direct connection closes that gap without installing anything: `pg` is
 * already in node_modules. It needs SUPABASE_DB_URL in backend/.env.local —
 * Dashboard → Project Settings → Database → Connection string (URI).
 *
 *   node scripts/db-exec.mjs path/to/file.sql
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(here, '../backend/.env.local')

function readEnv(key) {
  const line = readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(key + '='))
  return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') : null
}

const url = process.env.SUPABASE_DB_URL || readEnv('SUPABASE_DB_URL')
if (!url) {
  console.error(
    'Thiếu SUPABASE_DB_URL trong backend/.env.local.\n' +
      'Lấy ở Dashboard → Project Settings → Database → Connection string (URI).',
  )
  process.exit(2)
}

const file = process.argv[2]
if (!file) {
  console.error('Cách dùng: node scripts/db-exec.mjs <file.sql>')
  process.exit(2)
}

const sql = readFileSync(resolve(process.cwd(), file), 'utf8')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  // One transaction: a migration that stops halfway is worse than one that
  // never ran, because nobody can tell from the outside which half landed.
  await client.query('begin')
  await client.query(sql)
  await client.query('commit')
  console.log('✓ đã chạy', file)
} catch (err) {
  await client.query('rollback').catch(() => {})
  console.error('✕ lỗi:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
