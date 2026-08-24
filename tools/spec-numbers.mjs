#!/usr/bin/env node
/**
 * The numbers docs/SPEC.html quotes, counted from the things themselves.
 *
 * SPEC gives figures — how many migrations, how many rules, how many groups —
 * and every one of them goes stale the moment someone adds a file. The docs
 * lane has now reported the same two wrong numbers three times, which is a fair
 * sign that a person re-counting by hand is not a plan.
 *
 * So: count here, and quote the output. Same idea as tools/design-audit.mjs —
 * read only what is committed, print what is true, decide nothing.
 *
 *   node tools/spec-numbers.mjs           số thật
 *   node tools/spec-numbers.mjs --check   thoát 1 nếu SPEC.html ghi khác
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

/** Every migration file, whatever its number — two have shared 0017 since August. */
const migrations = readdirSync(join(root, 'backend/supabase/migrations')).filter((f) =>
  f.endsWith('.sql'),
)

const logic = read('frontend/src/content/logic.ts')
/*
 * A rule is `{ s: <scope>, r: <rule>, e: <example> }`. Matching on `{ s: '`
 * alone also catches the three SCOPE_KEY entries, which is how the count came
 * out as 67 once — the `r:` is what tells a rule from a legend entry.
 */
const rules = logic.match(/\{ s: '[^']*', r: '/g) ?? []
const groups = logic.match(/n: '\d+', g: '/g) ?? []
const parts = logic.match(/p: '[A-Z]', part:/g) ?? []

const tables = [
  ...new Set((read('docs/SPEC.html').match(/\b(posts|modules|notes|hour_logs|activity_kinds|site_settings|templates)\b/g) ?? [])),
]

const counted = {
  migration: migrations.length,
  luật: rules.length,
  nhóm: groups.length,
  phần: parts.length,
  bảng: tables.length,
}

for (const [k, v] of Object.entries(counted)) console.log(`${String(v).padStart(4)}  ${k}`)

if (!process.argv.includes('--check')) process.exit(0)

/*
 * SPEC writes some figures as digits and some as Vietnamese words, so both are
 * checked. A mismatch is reported, never fixed: the wording around a number is
 * the writer's, and a script that rewrote prose would be guessing at it.
 */
/*
 * The changelog records what the numbers *were* — "Bộ quy tắc 64 → 68 luật" is
 * history and stays wrong on purpose. Only the prose that claims a present
 * figure is checked, so the table rows come out first.
 */
const spec = read('docs/SPEC.html').replace(/<tr>[\s\S]*?<\/tr>/g, '')
const WORDS = {
  7: 'bảy', 14: 'mười bốn', 15: 'mười lăm', 20: 'hai mươi', 21: 'hai mươi mốt',
  64: 'sáu mươi tư', 68: 'sáu mươi tám', 82: 'tám mươi hai',
}
const stale = []

function checkWord(key, v) {
  for (const [n, w] of Object.entries(WORDS)) {
    if (Number(n) === v) continue
    if (new RegExp(`${w}\\s+${key}`, 'i').test(spec)) stale.push(`${key}: SPEC ghi "${w}", thật là ${v}`)
  }
  for (const m of spec.matchAll(new RegExp(`(\\d+)\\s*(?:</span>\\s*<span[^>]*>)?\\s*${key}`, 'gi'))) {
    if (Number(m[1]) !== v) stale.push(`${key}: SPEC ghi ${m[1]}, thật là ${v}`)
  }
}
/** SPEC says "quy tắc" where logic.ts says "luật"; both name the same thing. */
const ALIASES = { luật: ['luật', 'quy tắc'] }

for (const [k, v] of Object.entries(counted)) {
  for (const k2 of ALIASES[k] ?? [k]) checkWord(k2, v)
  const digits = [...spec.matchAll(new RegExp(`(\\d+)\\s*(?:</span>\\s*<span[^>]*>)?\\s*${k}`, 'gi'))]
  for (const m of digits) if (Number(m[1]) !== v) stale.push(`${k}: SPEC ghi ${m[1]}, thật là ${v}`)
  for (const [n, w] of Object.entries(WORDS)) {
    if (Number(n) === v) continue
    const re = new RegExp(`${w}\\s+${k}`, 'i')
    if (re.test(spec)) stale.push(`${k}: SPEC ghi "${w}", thật là ${v}`)
  }
}

if (stale.length === 0) {
  console.log('\nSPEC.html khớp.')
  process.exit(0)
}
console.log('\nSPEC.html lệch:')
for (const s of [...new Set(stale)]) console.log('  ' + s)
process.exit(1)
