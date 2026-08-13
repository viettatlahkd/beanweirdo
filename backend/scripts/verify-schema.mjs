import pg from 'pg'

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const client = new pg.Client({ connectionString: DB_URL })
await client.connect()

let failed = false

async function assertTableExists(table) {
  const { rows } = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = $1`,
    [table],
  )
  const ok = rows.length === 1
  console.log(`${ok ? 'PASS' : 'FAIL'} — table "${table}" exists`)
  if (!ok) failed = true
}

for (const table of ['modules', 'posts', 'activity_kinds', 'hour_logs', 'notes']) {
  await assertTableExists(table)
}

async function assertColumnExists(table, column) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [table, column],
  )
  const ok = rows.length === 1
  console.log(`${ok ? 'PASS' : 'FAIL'} — column "${table}.${column}" exists`)
  if (!ok) failed = true
}

await assertTableExists('templates')
for (const col of ['status', 'template_id', 'hero_image_url', 'published_at', 'deleted_at', 'previous_status']) {
  await assertColumnExists('posts', col)
}

const { rows: templateRows } = await client.query('select name from templates order by name')
const gotNames = templateRows.map((r) => r.name).sort()
const wantNames = ['Band · Blush', 'Sequence · Apricot', 'Specimen · Leaf'].sort()
const namesOk = JSON.stringify(gotNames) === JSON.stringify(wantNames)
console.log(`${namesOk ? 'PASS' : 'FAIL'} — seeded templates: ${gotNames.join(', ')}`)
if (!namesOk) failed = true

const { rows: policyRows } = await client.query(
  `select qual from pg_policies where tablename = 'posts' and policyname = 'posts are publicly readable'`,
)
const policyOk = policyRows.length === 1 && /status\s*=\s*'published'/.test(policyRows[0].qual ?? '')
console.log(`${policyOk ? 'PASS' : 'FAIL'} — posts public-read policy scoped to status='published'`)
if (!policyOk) failed = true

await client.end()
if (failed) {
  console.error('\nverify-schema: FAILED')
  process.exit(1)
}
console.log('\nverify-schema: PASS')
