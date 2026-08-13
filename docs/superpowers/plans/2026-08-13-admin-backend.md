# Admin Backend — API Routes (Track C-BE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `admin/` Next.js app's API routes — auth check, posts CRUD, status transitions, templates CRUD, image upload — all using the `service_role` Supabase key server-side, never exposed to the browser.

**Architecture:** Next.js App Router route handlers (`app/api/**/route.ts`) are plain `(req: Request) => Promise<Response>` functions — testable directly with Vitest by constructing a `Request` and calling the handler, no server needed to run the tests. Every route starts by calling a shared `requireAdmin(req)` helper that verifies the caller's Supabase session JWT.

**Tech Stack:** Next.js (App Router) API routes, `@supabase/supabase-js` (service_role client), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-13-post-authoring-admin-design.md`

## Global Constraints

- Depends on Track A's schema (table/column names below match that plan's "Produces" exactly — if Track A renamed anything, update here first).
- Depends on Track B **only** for the `Template`/`SectionData` types re-exported from the `post-renderer` package (Task B1 — the very first, fastest task in that track). Does **not** wait for the rest of Track B.
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in any file under `admin/app/` that isn't a `route.ts`, and never in anything prefixed `NEXT_PUBLIC_`. Every task's tests mock the Supabase client — no task needs a real database to pass, but running against Track A's local Supabase (`cd backend && npm run db:start && npm run db:reset`) is how you sanity-check by hand.
- This track defines the HTTP contract Track C-FE codes against (see each task's "Produces"). If you change a request/response shape after telling C-FE it's stable, tell them.
- **Out of scope for this plan:** automatic hard-deletion of Trash after 30 days (a cron job — Supabase `pg_cron` or Vercel Cron). The spec calls for it, but the safety-critical path — irreversible deletion — is already covered by the manual "Xoá vĩnh viễn" action in Task C-BE-5 (`permanently-delete`), which requires explicit user action. Auto-cleanup is a convenience follow-up, not a blocker for the feature to work end-to-end; add it as a separate small plan once this track ships.

---

### Task C-BE-1: Scaffold `admin/`, `requireAdmin` auth helper, service_role client

**Files:**
- Create: `admin/package.json`
- Create: `admin/next.config.js`
- Create: `admin/tsconfig.json`
- Create: `admin/lib/supabaseAdmin.ts`
- Create: `admin/lib/auth.ts`
- Create: `admin/lib/auth.test.ts`
- Create: `admin/app/api/health/route.ts`

**Interfaces:**
- Produces: `requireAdmin(req: Request): Promise<{ ok: true; userId: string } | { ok: false; response: Response }>`. Every other route in this track calls this first and returns `result.response` immediately if `!result.ok`.
- Produces: `supabaseAdmin` — a `SupabaseClient` constructed with the service_role key, importable only from server code.

- [ ] **Step 1: `admin/package.json` and config**

```json
{
  "name": "beanweirdo-admin",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.112.3"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/react": "^18.3.12",
    "@types/node": "^22.10.2",
    "vitest": "^2.1.8"
  }
}
```

`admin/next.config.js`:
```js
/** @type {import('next').NextConfig} */
export default {}
```

`admin/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

Run: `cd admin && npm install`, then add `"admin"` is already in the root `package.json` workspaces array from Track B Task B1 — if that task hasn't landed yet, add it yourself to the root `package.json`'s `workspaces` array now.

- [ ] **Step 2: `supabaseAdmin.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set — see backend plan for local values')
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

- [ ] **Step 3: Write the failing test for `requireAdmin`**

`admin/lib/auth.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabaseAdmin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'valid-token') return { data: { user: { id: 'admin-user-id' } }, error: null }
        return { data: { user: null }, error: { message: 'invalid token' } }
      }),
    },
  },
}))

const { requireAdmin } = await import('./auth')

describe('requireAdmin', () => {
  it('rejects a request with no Authorization header', async () => {
    const result = await requireAdmin(new Request('http://x', {}))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('rejects a request with an invalid token', async () => {
    const result = await requireAdmin(new Request('http://x', { headers: { Authorization: 'Bearer bad-token' } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('accepts a request with a valid token and returns the user id', async () => {
    const result = await requireAdmin(new Request('http://x', { headers: { Authorization: 'Bearer valid-token' } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.userId).toBe('admin-user-id')
  })
})
```

- [ ] **Step 4: Run, confirm it fails**

Run: `cd admin && npx vitest run lib/auth.test.ts` → FAIL, `./auth` doesn't exist.

- [ ] **Step 5: Implement `auth.ts`, run again, confirm PASS**

```ts
import { supabaseAdmin } from './supabaseAdmin'

export type AuthResult = { ok: true; userId: string } | { ok: false; response: Response }

export async function requireAdmin(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!token) {
    return { ok: false, response: Response.json({ error: 'missing bearer token' }, { status: 401 }) }
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    return { ok: false, response: Response.json({ error: 'invalid token' }, { status: 401 }) }
  }
  return { ok: true, userId: data.user.id }
}
```

Run: `cd admin && npx vitest run lib/auth.test.ts` → all 3 PASS.

- [ ] **Step 6: Health route + commit**

`admin/app/api/health/route.ts`:
```ts
import { requireAdmin } from '../../../lib/auth'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  return Response.json({ ok: true, userId: auth.userId })
}
```

```bash
git add admin/package.json admin/next.config.js admin/tsconfig.json admin/lib admin/app
git commit -m "feat(admin): scaffold Next.js admin app with requireAdmin auth helper"
```

---

### Task C-BE-2: Templates API — list + create

**Files:**
- Create: `admin/app/api/templates/route.ts`
- Create: `admin/app/api/templates/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (C-BE-1), `Template` type (from `post-renderer`, Track B Task B1).
- Produces: `GET /api/templates` → `200 Template[]`. `POST /api/templates` with JSON body `{ name: string; layout: 'band'|'specimen'|'sequence'; accent: string; onColor: string; tint: string; tint2: string }` → `201 Template` on success, `400` if `layout` isn't one of the 3 values.

- [ ] **Step 1: Failing tests**

`admin/app/api/templates/route.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/auth', () => ({ requireAdmin: vi.fn(async () => ({ ok: true, userId: 'u1' })) }))

const selectResult = { data: [{ id: 't1', name: 'Band · Blush', layout: 'band', accent: '#F2A0A5', on_color: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4' }], error: null }
const insertResult = { data: { id: 't4', name: 'New', layout: 'band', accent: '#000', on_color: '#fff', tint: '#eee', tint2: '#ddd' }, error: null }

vi.mock('../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ order: async () => selectResult }),
      insert: () => ({ select: () => ({ single: async () => insertResult }) }),
    }),
  },
}))

const { GET, POST } = await import('./route')

describe('GET /api/templates', () => {
  it('returns the template list mapped to camelCase', async () => {
    const res = await GET(new Request('http://x', { headers: { Authorization: 'Bearer t' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([{ id: 't1', name: 'Band · Blush', layout: 'band', accent: '#F2A0A5', onColor: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4' }])
  })
})

describe('POST /api/templates', () => {
  it('creates a template and returns 201', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New', layout: 'band', accent: '#000', onColor: '#fff', tint: '#eee', tint2: '#ddd' }),
    }))
    expect(res.status).toBe(201)
  })

  it('rejects an invalid layout with 400', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New', layout: 'not-a-layout', accent: '#000', onColor: '#fff', tint: '#eee', tint2: '#ddd' }),
    }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd admin && npx vitest run app/api/templates/route.test.ts` → FAIL, `./route` doesn't exist.

- [ ] **Step 3: Implement the route**

```ts
import { requireAdmin } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const LAYOUTS = ['band', 'specimen', 'sequence'] as const

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin.from('templates').select('id, name, layout, accent, on_color, tint, tint2').order('name')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(
    data.map((t) => ({ id: t.id, name: t.name, layout: t.layout, accent: t.accent, onColor: t.on_color, tint: t.tint, tint2: t.tint2 })),
  )
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json()
  if (!LAYOUTS.includes(body.layout)) {
    return Response.json({ error: `layout must be one of ${LAYOUTS.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('templates')
    .insert({ name: body.name, layout: body.layout, accent: body.accent, on_color: body.onColor, tint: body.tint, tint2: body.tint2 })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(
    { id: data.id, name: data.name, layout: data.layout, accent: data.accent, onColor: data.on_color, tint: data.tint, tint2: data.tint2 },
    { status: 201 },
  )
}
```

- [ ] **Step 4: Run, confirm all PASS**

Run: `cd admin && npx vitest run app/api/templates/route.test.ts` → 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add admin/app/api/templates
git commit -m "feat(admin): templates list + create API routes"
```

---

### Task C-BE-3: Posts API — list, get one, create

**Files:**
- Create: `admin/app/api/posts/route.ts`
- Create: `admin/app/api/posts/route.test.ts`
- Create: `admin/app/api/posts/[id]/route.ts`
- Create: `admin/app/api/posts/[id]/route.test.ts`

**Interfaces:**
- Produces: `GET /api/posts?status=draft|published|archived|deleted|all` → `200 PostSummary[]` where `PostSummary = { id, slug, en, vi, moduleId, kind, status, heroImageUrl, publishedAt, updatedAt }`.
- Produces: `POST /api/posts` with `{ moduleId: string; kind: 'note'|'essay'|'ref'|'log'; en: string; vi: string }` → `201 { id: string }`, always created with `status: 'draft'`.
- Produces: `GET /api/posts/:id` → `200 PostDetail` (full row incl. `body`, `templateId`) or `404`.

- [ ] **Step 1: Failing test for list + create**

`admin/app/api/posts/route.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/auth', () => ({ requireAdmin: vi.fn(async () => ({ ok: true, userId: 'u1' })) }))

const listResult = {
  data: [{ id: 'p1', slug: 'senses', en: 'Senses', vi: 'mô tả', module_id: 'sensory', kind: 'note', status: 'draft', hero_image_url: null, published_at: null, updated_at: '2026-06-01T00:00:00Z' }],
  error: null,
}
const insertResult = { data: { id: 'p2' }, error: null }

vi.mock('../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ order: async () => listResult }), order: async () => listResult }),
      insert: () => ({ select: () => ({ single: async () => insertResult }) }),
    }),
  },
}))

const { GET, POST } = await import('./route')

describe('GET /api/posts', () => {
  it('lists posts filtered by status', async () => {
    const res = await GET(new Request('http://x/api/posts?status=draft', { headers: { Authorization: 'Bearer t' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0]).toMatchObject({ id: 'p1', slug: 'senses', status: 'draft' })
  })
})

describe('POST /api/posts', () => {
  it('creates a draft post', async () => {
    const res = await POST(new Request('http://x/api/posts', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'sensory', kind: 'note', en: 'New post', vi: 'mô tả' }),
    }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'p2' })
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** (module doesn't exist)

- [ ] **Step 3: Implement `admin/app/api/posts/route.ts`**

```ts
import { requireAdmin } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const VALID_STATUSES = ['draft', 'published', 'archived', 'deleted']

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const status = new URL(req.url).searchParams.get('status') ?? 'all'
  let query = supabaseAdmin
    .from('posts')
    .select('id, slug, en, vi, module_id, kind, status, hero_image_url, published_at, updated_at')
  if (status !== 'all') {
    if (!VALID_STATUSES.includes(status)) return Response.json({ error: 'invalid status filter' }, { status: 400 })
    query = query.eq('status', status)
  }
  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(
    data.map((p) => ({
      id: p.id, slug: p.slug, en: p.en, vi: p.vi, moduleId: p.module_id, kind: p.kind,
      status: p.status, heroImageUrl: p.hero_image_url, publishedAt: p.published_at, updatedAt: p.updated_at,
    })),
  )
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({ module_id: body.moduleId, kind: body.kind, en: body.en, vi: body.vi, status: 'draft', n: '00', date_label: '' })
    .select('id')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ id: data.id }, { status: 201 })
}
```

Note: `n` and `date_label` are `not null` columns from the original schema with no sensible default for a brand-new draft — they're set to placeholder values here and are expected to be edited later; if Track A's schema owner wants to relax those constraints instead (make them nullable, since a draft may not have a display index/date yet), that's a 1-line migration follow-up, not blocking this task.

- [ ] **Step 4: `GET /api/posts/:id`**

`admin/app/api/posts/[id]/route.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../lib/auth', () => ({ requireAdmin: vi.fn(async () => ({ ok: true, userId: 'u1' })) }))

const found = { id: 'p1', slug: 'senses', en: 'Senses', vi: 'mô tả', module_id: 'sensory', kind: 'note', status: 'draft', template_id: 't1', hero_image_url: null, body: [{ h: 'a', p: 'b' }] }

vi.mock('../../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: found, error: null }) }) }),
    }),
  },
}))

const { GET } = await import('./route')

describe('GET /api/posts/:id', () => {
  it('returns the full post detail', async () => {
    const res = await GET(new Request('http://x', { headers: { Authorization: 'Bearer t' } }), { params: Promise.resolve({ id: 'p1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ id: 'p1', templateId: 't1', body: [{ h: 'a', p: 'b' }] })
  })
})
```

`admin/app/api/posts/[id]/route.ts` (GET only for this task — PATCH added in C-BE-4):
```ts
import { requireAdmin } from '../../../../lib/auth'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, slug, en, vi, module_id, kind, status, template_id, hero_image_url, body')
    .eq('id', id)
    .single()
  if (error || !data) return Response.json({ error: 'not found' }, { status: 404 })

  return Response.json({
    id: data.id, slug: data.slug, en: data.en, vi: data.vi, moduleId: data.module_id,
    kind: data.kind, status: data.status, templateId: data.template_id,
    heroImageUrl: data.hero_image_url, body: data.body,
  })
}
```

- [ ] **Step 5: Run both test files, confirm all PASS**

Run: `cd admin && npx vitest run app/api/posts/route.test.ts app/api/posts/[id]/route.test.ts` → all PASS.

- [ ] **Step 6: Commit**

```bash
git add admin/app/api/posts
git commit -m "feat(admin): posts list/create/get API routes"
```

---

### Task C-BE-4: Posts API — update (PATCH)

**Files:**
- Modify: `admin/app/api/posts/[id]/route.ts`
- Modify: `admin/app/api/posts/[id]/route.test.ts`

**Interfaces:**
- Produces: `PATCH /api/posts/:id` with any subset of `{ templateId, en, vi, body, heroImageUrl }` → `200 { id }` on success, `404` if the post doesn't exist.

- [ ] **Step 1: Failing test**

Append to `route.test.ts`, add an `update`/`eq` mock branch and a new `describe`:
```ts
vi.mock('../../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: found, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'p1' }, error: null }) }) }) }),
    }),
  },
}))

const { GET, PATCH } = await import('./route')

describe('PATCH /api/posts/:id', () => {
  it('updates the given fields', async () => {
    const res = await PATCH(
      new Request('http://x', { method: 'PATCH', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify({ en: 'New title' }) }),
      { params: Promise.resolve({ id: 'p1' }) },
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'p1' })
  })
})
```
(Replace the earlier single-mock `vi.mock('../../../../lib/supabaseAdmin', ...)` block with this combined one — one mock per module per file.)

- [ ] **Step 2: Run, confirm FAIL** (`PATCH` not exported).

- [ ] **Step 3: Add `PATCH` to the route file**

Append to `admin/app/api/posts/[id]/route.ts`:
```ts
const PATCHABLE_FIELDS: Record<string, string> = {
  templateId: 'template_id',
  en: 'en',
  vi: 'vi',
  body: 'body',
  heroImageUrl: 'hero_image_url',
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const payload = await req.json()
  const update: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(PATCHABLE_FIELDS)) {
    if (key in payload) update[column] = payload[key]
  }

  const { data, error } = await supabaseAdmin.from('posts').update(update).eq('id', id).select('id').single()
  if (error || !data) return Response.json({ error: error?.message ?? 'not found' }, { status: 404 })

  return Response.json({ id: data.id })
}
```

- [ ] **Step 4: Run, confirm all PASS**

Run: `cd admin && npx vitest run app/api/posts/[id]/route.test.ts` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add admin/app/api/posts/[id]/route.ts admin/app/api/posts/[id]/route.test.ts
git commit -m "feat(admin): posts PATCH (update) API route"
```

---

### Task C-BE-5: Status transition API

**Files:**
- Create: `admin/app/api/posts/[id]/status/route.ts`
- Create: `admin/app/api/posts/[id]/status/route.test.ts`

**Interfaces:**
- Produces: `POST /api/posts/:id/status` with `{ action: 'publish'|'unpublish'|'archive'|'restore'|'delete'|'restore-trash'|'permanently-delete' }` → `200 { id, status }` (or `204` with no body for `permanently-delete`), `400` if the action isn't valid for the post's current status. This is the exact transition table from the spec — implement it as data, not a chain of `if`s, so it's easy to audit against that table.

- [ ] **Step 1: Failing tests covering every transition + one invalid one**

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../lib/auth', () => ({ requireAdmin: vi.fn(async () => ({ ok: true, userId: 'u1' })) }))

let currentPost = { id: 'p1', status: 'draft', previous_status: null }

vi.mock('../../../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: currentPost, error: null }) }) }),
      update: (patch: Record<string, unknown>) => ({
        eq: () => ({
          select: () => ({
            single: async () => {
              currentPost = { ...currentPost, ...patch } as typeof currentPost
              return { data: { id: currentPost.id, status: currentPost.status }, error: null }
            },
          }),
        }),
      }),
    }),
  },
}))

const { POST } = await import('./route')

function call(action: string) {
  return POST(
    new Request('http://x', { method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }),
    { params: Promise.resolve({ id: 'p1' }) },
  )
}

describe('POST /api/posts/:id/status', () => {
  it('draft -> published via publish', async () => {
    currentPost = { id: 'p1', status: 'draft', previous_status: null }
    const res = await call('publish')
    expect((await res.json()).status).toBe('published')
  })

  it('published -> draft via unpublish', async () => {
    currentPost = { id: 'p1', status: 'published', previous_status: null }
    const res = await call('unpublish')
    expect((await res.json()).status).toBe('draft')
  })

  it('published -> archived via archive', async () => {
    currentPost = { id: 'p1', status: 'published', previous_status: null }
    const res = await call('archive')
    expect((await res.json()).status).toBe('archived')
  })

  it('archived -> published via restore', async () => {
    currentPost = { id: 'p1', status: 'archived', previous_status: null }
    const res = await call('restore')
    expect((await res.json()).status).toBe('published')
  })

  it('any status -> deleted via delete, remembering previous_status', async () => {
    currentPost = { id: 'p1', status: 'published', previous_status: null }
    const res = await call('delete')
    expect((await res.json()).status).toBe('deleted')
    expect(currentPost.previous_status).toBe('published')
  })

  it('deleted -> previous_status via restore-trash', async () => {
    currentPost = { id: 'p1', status: 'deleted', previous_status: 'archived' }
    const res = await call('restore-trash')
    expect((await res.json()).status).toBe('archived')
  })

  it('deleted -> gone via permanently-delete, returns 204', async () => {
    currentPost = { id: 'p1', status: 'deleted', previous_status: 'draft' }
    const res = await call('permanently-delete')
    expect(res.status).toBe(204)
  })

  it('rejects publish on an already-published post with 400', async () => {
    currentPost = { id: 'p1', status: 'published', previous_status: null }
    const res = await call('publish')
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** (route doesn't exist).

- [ ] **Step 3: Implement as a transition table**

```ts
import { requireAdmin } from '../../../../../lib/auth'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'

type Params = { params: Promise<{ id: string }> }
type Status = 'draft' | 'published' | 'archived' | 'deleted'

const TRANSITIONS: Record<string, { from: Status[]; apply: (current: { status: Status; previous_status: Status | null }) => Record<string, unknown> }> = {
  publish: { from: ['draft'], apply: () => ({ status: 'published', published_at: new Date().toISOString() }) },
  unpublish: { from: ['published'], apply: () => ({ status: 'draft' }) },
  archive: { from: ['published'], apply: () => ({ status: 'archived' }) },
  restore: { from: ['archived'], apply: () => ({ status: 'published' }) },
  delete: { from: ['draft', 'published', 'archived'], apply: (c) => ({ status: 'deleted', deleted_at: new Date().toISOString(), previous_status: c.status }) },
  'restore-trash': { from: ['deleted'], apply: (c) => ({ status: c.previous_status ?? 'draft', deleted_at: null, previous_status: null }) },
  'permanently-delete': { from: ['deleted'], apply: () => ({}) },
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { action } = await req.json()
  const transition = TRANSITIONS[action]
  if (!transition) return Response.json({ error: `unknown action "${action}"` }, { status: 400 })

  const { data: current, error: fetchErr } = await supabaseAdmin.from('posts').select('status, previous_status').eq('id', id).single()
  if (fetchErr || !current) return Response.json({ error: 'not found' }, { status: 404 })
  if (!transition.from.includes(current.status as Status)) {
    return Response.json({ error: `cannot ${action} a post with status "${current.status}"` }, { status: 400 })
  }

  if (action === 'permanently-delete') {
    const { error } = await supabaseAdmin.from('posts').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return new Response(null, { status: 204 })
  }

  const patch = transition.apply(current as { status: Status; previous_status: Status | null })
  const { data, error } = await supabaseAdmin.from('posts').update(patch).eq('id', id).select('id, status').single()
  if (error || !data) return Response.json({ error: error?.message ?? 'update failed' }, { status: 500 })

  return Response.json({ id: data.id, status: data.status })
}
```

- [ ] **Step 4: Run, confirm all 8 tests PASS**

Run: `cd admin && npx vitest run app/api/posts/[id]/status/route.test.ts`

- [ ] **Step 5: Commit**

```bash
git add admin/app/api/posts/[id]/status
git commit -m "feat(admin): post status transition API with explicit transition table"
```

---

### Task C-BE-6: Image upload API

**Files:**
- Create: `admin/app/api/upload/route.ts`
- Create: `admin/app/api/upload/route.test.ts`

**Interfaces:**
- Produces: `POST /api/upload` with `multipart/form-data` field `file` → `200 { url: string }` on success; `400` if the file is missing, not an image, or over 8MB.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/auth', () => ({ requireAdmin: vi.fn(async () => ({ ok: true, userId: 'u1' })) }))

vi.mock('../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn(async (path: string) => ({ data: { path }, error: null })),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/post-images/${path}` } }),
      }),
    },
  },
}))

const { POST } = await import('./route')

function formDataRequest(file: File | null) {
  const form = new FormData()
  if (file) form.set('file', file)
  return new Request('http://x', { method: 'POST', headers: { Authorization: 'Bearer t' }, body: form })
}

describe('POST /api/upload', () => {
  it('rejects a request with no file', async () => {
    const res = await formDataRequest(null)
    const response = await POST(res)
    expect(response.status).toBe(400)
  })

  it('rejects a non-image file', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    const response = await POST(formDataRequest(file))
    expect(response.status).toBe(400)
  })

  it('rejects a file over 8MB', async () => {
    const big = new Uint8Array(8 * 1024 * 1024 + 1)
    const file = new File([big], 'huge.jpg', { type: 'image/jpeg' })
    const response = await POST(formDataRequest(file))
    expect(response.status).toBe(400)
  })

  it('uploads a valid image and returns its public URL', async () => {
    const file = new File(['fake-bytes'], 'hero.jpg', { type: 'image/jpeg' })
    const response = await POST(formDataRequest(file))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.url).toMatch(/^https:\/\/cdn\.example\/post-images\//)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** (route doesn't exist).

- [ ] **Step 3: Implement**

```ts
import { requireAdmin } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return Response.json({ error: 'missing file' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return Response.json({ error: 'file must be jpeg, png, or webp' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'file exceeds 8MB' }, { status: 400 })

  const ext = file.type.split('/')[1]
  const path = `${auth.userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabaseAdmin.storage.from('post-images').upload(path, file)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('post-images').getPublicUrl(path)
  return Response.json({ url: data.publicUrl })
}
```

- [ ] **Step 4: Run, confirm all 4 PASS**

Run: `cd admin && npx vitest run app/api/upload/route.test.ts`

- [ ] **Step 5: Commit**

```bash
git add admin/app/api/upload
git commit -m "feat(admin): image upload API route"
```

---

## Handoff to Track C-FE

Full contract, for `admin/lib/apiClient.ts`:

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/posts?status=…` | — | `PostSummary[]` |
| POST | `/api/posts` | `{moduleId,kind,en,vi}` | `201 {id}` |
| GET | `/api/posts/:id` | — | `PostDetail` or `404` |
| PATCH | `/api/posts/:id` | subset of `{templateId,en,vi,body,heroImageUrl}` | `200 {id}` |
| POST | `/api/posts/:id/status` | `{action}` | `200 {id,status}` or `204` |
| GET | `/api/templates` | — | `Template[]` |
| POST | `/api/templates` | `{name,layout,accent,onColor,tint,tint2}` | `201 Template` |
| POST | `/api/upload` | `FormData{file}` | `200 {url}` |

All routes require `Authorization: Bearer <supabase access_token>`.
