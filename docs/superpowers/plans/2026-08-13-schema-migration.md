# Schema Migration (Track A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `backend/` from "paste raw SQL by hand" to a Supabase-CLI-managed local project, and add the `templates` table, post status/lifecycle columns, the public-read RLS policy for status, and the `post-images` storage bucket.

**Architecture:** Supabase CLI (`supabase` npm package) drives a local Postgres via Docker. Existing `schema.sql` becomes migration `0001`; new work lands as migrations `0002`–`0004`. A small Node script (`backend/scripts/verify-schema.mjs`) connects to the local DB with `pg` and asserts the shape we expect — this is the "test" for SQL that has no framework of its own.

**Tech Stack:** Supabase CLI, Postgres (local via Docker), Node.js (`pg` driver) for verification scripts.

**Spec:** `docs/superpowers/specs/2026-08-13-post-authoring-admin-design.md`

## Global Constraints

- Docker must be running locally for `supabase start` / `supabase db reset` to work — every task's test step depends on this.
- This track produces no application code — only SQL migrations, seed data, and a verification script. Tracks B and C read this plan's "Produces" sections to know exact table/column names; do not rename anything after another track has started without telling them.
- Blocks Track B and Track C entirely — both need the schema below to exist locally before their own tests can pass.

---

### Task 1: Supabase CLI local dev + move existing schema into migration 0001

**Files:**
- Create: `backend/package.json`
- Create: `backend/supabase/config.toml` (via `supabase init`)
- Create: `backend/supabase/migrations/0001_initial_schema.sql`
- Delete: `backend/supabase/schema.sql` (content moves into the migration above, verbatim)
- Create: `backend/scripts/verify-schema.mjs`
- Modify: `backend/README.md`

**Interfaces:**
- Produces: local Postgres reachable at the URL printed by `supabase status` (`DB URL`), default `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Tracks B/C's `.env.local` files point here for local dev.
- Produces: `node scripts/verify-schema.mjs` — exits 0 and prints `PASS` lines per assertion, exits 1 and prints `FAIL` on any mismatch. Later tasks in this track append assertions to it.

- [ ] **Step 1: Add `backend/package.json` with the Supabase CLI and `pg`**

```json
{
  "name": "beanweirdo-backend",
  "private": true,
  "type": "module",
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "test": "node scripts/verify-schema.mjs"
  },
  "devDependencies": {
    "supabase": "^1.226.4",
    "pg": "^8.13.1"
  }
}
```

Run: `cd backend && npm install`

- [ ] **Step 2: Init the Supabase CLI project**

Run: `cd backend && npx supabase init`

This creates `supabase/config.toml` and an empty `supabase/migrations/` directory. It does not touch the existing `supabase/schema.sql` or `supabase/seed.sql`.

- [ ] **Step 3: Move `schema.sql` into migration `0001`, write the verify script**

```bash
mkdir -p backend/supabase/migrations
git mv backend/supabase/schema.sql backend/supabase/migrations/0001_initial_schema.sql
```

Create `backend/scripts/verify-schema.mjs`:

```js
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
```

Later tasks in this track append more `assert*` helpers and calls to this same file, always before the `await client.end()` line.

- [ ] **Step 4: Start the local DB and run the script — expect PASS**

No code changes this step — just running what Step 3 wrote.

Run:
```bash
cd backend
npx supabase start
npx supabase db reset
npm test
```
Expected: every line prints `PASS`, script exits with `verify-schema: PASS`.

- [ ] **Step 5: Update `backend/README.md`, commit**

Replace the "Set up your project" section's steps 3–4 (paste `schema.sql`/`seed.sql` into the SQL Editor) with:

```markdown
## Local development

This project uses the [Supabase CLI](https://supabase.com/docs/guides/cli) for
migrations instead of pasting SQL into the dashboard by hand.

```bash
cd backend
npm install
npm run db:start   # starts local Postgres + Studio via Docker
npm run db:reset   # applies every migration in supabase/migrations/, then supabase/seed.sql
npm test           # verifies the schema landed correctly
```

To push migrations to your hosted Supabase project: `npx supabase link --project-ref <ref>`,
then `npx supabase db push`.
```

```bash
git add backend/package.json backend/supabase backend/scripts backend/README.md
git commit -m "chore: move backend to Supabase-CLI-managed migrations"
```

---

### Task 2: `templates` table + `posts` status/template columns + seed data

**Files:**
- Create: `backend/supabase/migrations/0002_templates_and_post_status.sql`
- Modify: `backend/scripts/verify-schema.mjs`
- Modify: `backend/supabase/seed.sql`

**Interfaces:**
- Produces table `templates(id uuid, name text, layout text, accent text, on_color text, tint text, tint2 text, created_at timestamptz)`.
- Produces columns on `posts`: `status text` (`draft`|`published`|`archived`|`deleted`, default `draft`), `template_id uuid references templates(id)`, `hero_image_url text`, `published_at timestamptz`, `deleted_at timestamptz`, `previous_status text`.
- Seed produces 3 templates named `Band · Blush`, `Specimen · Leaf`, `Sequence · Apricot` — Track C-BE's seed-dependent tests and Track C-FE's template-step mockery can rely on these names existing in local dev.

- [ ] **Step 1: Extend the verify script with the new assertions (must fail first — migration doesn't exist yet)**

Append to `backend/scripts/verify-schema.mjs`, before the `await client.end()` line:

```js
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
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `cd backend && npm test`
Expected: `FAIL — table "templates" exists` and related FAIL lines (migration 0002 doesn't exist yet, so `db reset` hasn't created any of this — run `npx supabase db reset` first if you want a clean baseline, then `npm test`).

- [ ] **Step 3: Write migration `0002`**

```sql
-- 0002: templates library + post status lifecycle

create table templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  layout      text not null check (layout in ('band', 'specimen', 'sequence')),
  accent      text not null,
  on_color    text not null,
  tint        text not null,
  tint2       text not null,
  created_at  timestamptz not null default now()
);

alter table posts
  add column status          text not null default 'draft'
                              check (status in ('draft', 'published', 'archived', 'deleted')),
  add column template_id     uuid references templates(id),
  add column hero_image_url  text,
  add column published_at    timestamptz,
  add column deleted_at      timestamptz,
  add column previous_status text;

alter table templates enable row level security;
create policy "templates are publicly readable" on templates
  for select using (true);
```

- [ ] **Step 4: Seed the 3 default templates and backfill existing posts, run migration + test**

Append to `backend/supabase/seed.sql` (after the `modules` insert, before the `posts` insert — posts will reference these via a subquery):

```sql
insert into templates (name, layout, accent, on_color, tint, tint2)
values
  ('Band · Blush', 'band', '#F2A0A5', '#3B2A2B', '#FBE7E5', '#F6D2D4'),
  ('Specimen · Leaf', 'specimen', '#7FB87E', '#1F3323', '#E4F0DF', '#CFE6C8'),
  ('Sequence · Apricot', 'sequence', '#F0B45C', '#3B2E19', '#F9EBD2', '#F3DCAE')
on conflict do nothing;
```

At the end of `backend/supabase/seed.sql`, backfill status + template on the posts already seeded (so local dev isn't empty of published content):

```sql
update posts set
  status = 'published',
  published_at = created_at,
  template_id = (select id from templates where name = 'Sequence · Apricot')
where template_id is null;
```

Run:
```bash
cd backend
npx supabase db reset
npm test
```
Expected: all lines `PASS`, `verify-schema: PASS`.

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/migrations/0002_templates_and_post_status.sql backend/supabase/seed.sql backend/scripts/verify-schema.mjs
git commit -m "feat(schema): add templates table and post status lifecycle columns"
```

---

### Task 3: RLS — public read limited to `status = 'published'`

**Files:**
- Create: `backend/supabase/migrations/0003_posts_public_read_published_only.sql`
- Modify: `backend/scripts/verify-schema.mjs`

**Interfaces:**
- Produces: the `posts` public-read policy's definition now requires `status = 'published'`. Track B's `usePost`/`usePublishedPosts` hooks rely on this — they use the anon key and expect Postgres itself to filter out drafts, not just the query's `.eq('status', 'published')` (defense in depth).

- [ ] **Step 1: Add the assertion (failing — old policy still allows all rows)**

Append to `backend/scripts/verify-schema.mjs` before `await client.end()`:

```js
const { rows: policyRows } = await client.query(
  `select qual from pg_policies where tablename = 'posts' and policyname = 'posts are publicly readable'`,
)
const policyOk = policyRows.length === 1 && /status\s*=\s*'published'/.test(policyRows[0].qual ?? '')
console.log(`${policyOk ? 'PASS' : 'FAIL'} — posts public-read policy scoped to status='published'`)
if (!policyOk) failed = true
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd backend && npm test` → expect `FAIL — posts public-read policy scoped to status='published'`.

- [ ] **Step 3: Write migration `0003`**

```sql
-- 0003: restrict public read of posts to published rows only.
-- draft/archived/deleted reads go through the admin app's service_role API instead.

drop policy "posts are publicly readable" on posts;

create policy "posts are publicly readable" on posts
  for select using (status = 'published');
```

- [ ] **Step 4: Reset + test, expect PASS**

Run: `cd backend && npx supabase db reset && npm test`
Expected: all `PASS`.

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/migrations/0003_posts_public_read_published_only.sql backend/scripts/verify-schema.mjs
git commit -m "feat(schema): scope public posts read policy to published status"
```

---

### Task 4: `post-images` storage bucket

**Files:**
- Create: `backend/supabase/migrations/0004_post_images_bucket.sql`
- Modify: `backend/scripts/verify-schema.mjs`

**Interfaces:**
- Produces: Supabase Storage bucket `post-images`, public-read, writable only via `service_role` (no anon/authenticated insert policy — matches the "upload goes through the admin API" decision in the spec).

- [ ] **Step 1: Add the assertion (failing)**

Append before `await client.end()`:

```js
const { rows: bucketRows } = await client.query(
  `select public from storage.buckets where id = 'post-images'`,
)
const bucketOk = bucketRows.length === 1 && bucketRows[0].public === true
console.log(`${bucketOk ? 'PASS' : 'FAIL'} — storage bucket "post-images" exists and is public`)
if (!bucketOk) failed = true
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd backend && npm test` → expect `FAIL — storage bucket "post-images" exists and is public`.

- [ ] **Step 3: Write migration `0004`**

```sql
-- 0004: storage bucket for post hero + inline images.
-- Public read (site needs to display images to signed-out visitors).
-- No insert/update/delete policy for anon or authenticated — uploads go through
-- the admin app's API routes using the service_role key, same pattern as posts writes.

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "post images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-images');
```

- [ ] **Step 4: Reset + test, expect PASS**

Run: `cd backend && npx supabase db reset && npm test`
Expected: all `PASS`, including the new bucket line.

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/migrations/0004_post_images_bucket.sql backend/scripts/verify-schema.mjs
git commit -m "feat(schema): add public post-images storage bucket"
```

---

## Handoff to Track B / Track C

Both tracks need, in their own `.env.local`:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321        # frontend (Vite prefix)
VITE_SUPABASE_ANON_KEY=<from `supabase status`>
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  # admin (Next.js prefix)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`, admin/ server-side only, never NEXT_PUBLIC_>
```
Get the actual values by running `cd backend && npx supabase status` after `db:start`.
