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

await client.end()
if (failed) {
  console.error('\nverify-schema: FAILED')
  process.exit(1)
}
console.log('\nverify-schema: PASS')
