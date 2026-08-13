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
for (const col of ['status', 'template_id', 'hero_image_url', 'published_at', 'deleted_at', 'previous_status', 'updated_at']) {
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
// Postgres rewrites `status in ('published', 'archived')` into an ANY(ARRAY[...])
// form, e.g. (status = ANY (ARRAY['published'::text, 'archived'::text])) — assert
// on the two status literals actually being present rather than the original
// `in (...)` syntax.
const policyQual = policyRows[0]?.qual ?? ''
const policyOk =
  policyRows.length === 1 && policyQual.includes(`'published'`) && policyQual.includes(`'archived'`)
console.log(`${policyOk ? 'PASS' : 'FAIL'} — posts public-read policy covers status in ('published', 'archived'): ${policyQual}`)
if (!policyOk) failed = true

const { rows: bucketRows } = await client.query(
  `select public from storage.buckets where id = 'post-images'`,
)
const bucketOk = bucketRows.length === 1 && bucketRows[0].public === true
console.log(`${bucketOk ? 'PASS' : 'FAIL'} — storage bucket "post-images" exists and is public`)
if (!bucketOk) failed = true

// Behavioral regression guard: a draft post must be genuinely invisible to the
// anon role, not just "we never query for it". Insert a throwaway draft as the
// superuser connection (bypasses RLS), switch the session to anon inside the same
// transaction, confirm it doesn't come back, then roll back so nothing persists.
await client.query('begin')
try {
  const { rows: draftRows } = await client.query(
    `insert into posts (module_id, n, en, vi, kind, date_label, status)
     values ('sensory', '99', 'verify-schema throwaway draft', 'qa', 'note', '2026.08', 'draft')
     returning id`,
  )
  const draftId = draftRows[0].id
  await client.query('set local role anon')
  const { rows: anonRows } = await client.query('select id from posts where id = $1', [draftId])
  const draftHiddenOk = anonRows.length === 0
  console.log(`${draftHiddenOk ? 'PASS' : 'FAIL'} — draft post is invisible to the anon role`)
  if (!draftHiddenOk) failed = true
} finally {
  await client.query('rollback')
}

const { rows: storagePolicyRows } = await client.query(
  `select cmd from pg_policies where tablename = 'objects' and schemaname = 'storage'`,
)
const storagePolicyOk =
  storagePolicyRows.length > 0 && storagePolicyRows.every((r) => r.cmd === 'SELECT')
console.log(
  `${storagePolicyOk ? 'PASS' : 'FAIL'} — storage.objects has read-only public access (no INSERT/UPDATE/DELETE policy): ${storagePolicyRows.map((r) => r.cmd).join(', ')}`,
)
if (!storagePolicyOk) failed = true

await client.end()
if (failed) {
  console.error('\nverify-schema: FAILED')
  process.exit(1)
}
console.log('\nverify-schema: PASS')
