/**
 * Chạy thật hai file migration của `hour_logs` lên một Postgres trống.
 *
 * Không cần server và không chạm cơ sở dữ liệu thật: pglite là Postgres biên
 * dịch sang WASM. Cài bằng `npm i --no-save @electric-sql/pglite` rồi
 * `node backend/scripts/check-migrations.mjs`.
 *
 * Có script này vì đọc một file .sql không chứng minh được nó chạy: cú pháp
 * đúng mà thiếu `if not exists` thì lần chạy thứ hai sẽ vỡ, và một khoá ngoại
 * viết đúng vẫn có thể quên mất `on delete cascade` — thứ mà cả tính năng dựa
 * vào. Ở đây cả hai đều được thử bằng hành vi.
 *
 * Bảng được dựng theo đúng hình dạng `hour_logs` đang có trên production —
 * 0001 tạo nó, 0008 bỏ `user_id`, 0009 thêm `project` — rồi 0018 và 0019 chạy
 * lên trên. Không chạm vào cơ sở dữ liệu thật.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const M = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations')
const db = await new PGlite()

const ok = []
const fail = []
const step = async (label, sql) => {
  try {
    await db.exec(sql)
    ok.push(label)
  } catch (e) {
    fail.push(`${label}: ${e.message}`)
  }
}

// Hình dạng bảng như hiện tại, sau 0001 + 0008 + 0009.
await step(
  'dựng hour_logs như production',
  `create table hour_logs (
     id uuid primary key default gen_random_uuid(),
     date date not null,
     name text not null default '',
     kind text not null,
     mins int not null check (mins > 0),
     at time not null,
     done boolean not null default true,
     project text,
     created_at timestamptz not null default now()
   );`,
)

await step('0018 — note', readFileSync(`${M}/0018_hour_log_note.sql`, 'utf8'))
await step('0019 — parent_id', readFileSync(`${M}/0019_hour_log_parent.sql`, 'utf8'))

// Chạy lại: `if not exists` phải khiến cả hai thành không-làm-gì.
await step('0018 lần hai', readFileSync(`${M}/0018_hour_log_note.sql`, 'utf8'))
await step('0019 lần hai', readFileSync(`${M}/0019_hour_log_parent.sql`, 'utf8'))

const cols = await db.query(`
  select column_name, data_type, is_nullable
  from information_schema.columns
  where table_name = 'hour_logs' and column_name in ('note','parent_id')
  order by column_name`)

const fk = await db.query(`
  select rc.delete_rule, kcu.column_name
  from information_schema.referential_constraints rc
  join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name
  where kcu.table_name = 'hour_logs'`)

const idx = await db.query(`select indexname from pg_indexes where tablename = 'hour_logs'`)

// Cascade là lý do dùng khoá ngoại — chứng minh bằng hành vi, không bằng lời.
await db.exec(`
  insert into hour_logs (id, date, kind, mins, at, name)
  values ('11111111-1111-1111-1111-111111111111', '2026-08-23', 'khác', 30, '09:00', 'cha');
  insert into hour_logs (date, kind, mins, at, parent_id)
  values ('2026-08-23', 'khác', 90, '09:00', '11111111-1111-1111-1111-111111111111'),
         ('2026-08-23', 'khác', 45, '14:00', '11111111-1111-1111-1111-111111111111');`)
const truoc = (await db.query('select count(*)::int n from hour_logs')).rows[0].n
await db.exec(`delete from hour_logs where id = '11111111-1111-1111-1111-111111111111'`)
const sau = (await db.query('select count(*)::int n from hour_logs')).rows[0].n

console.log('CHẠY:', ok.join(' · '))
console.log('LỖI :', fail.length ? fail.join(' | ') : 'không có')
console.log('CỘT :', cols.rows.map((r) => `${r.column_name}=${r.data_type}/null:${r.is_nullable}`).join(' · '))
console.log('FK  :', fk.rows.map((r) => `${r.column_name} on delete ${r.delete_rule}`).join(' · ') || 'không có')
console.log('INDEX:', idx.rows.map((r) => r.indexname).join(' · '))
console.log(`CASCADE: ${truoc} hàng → xoá cha → ${sau} hàng`)
