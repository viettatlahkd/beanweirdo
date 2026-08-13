# Admin Frontend — Screens (Track C-FE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `admin/` app's screens — login, dashboard, and the 3-step new/edit post wizard — approved via wireframe during brainstorming (`.superpowers/brainstorm/2212-1786598470/content/full-mockup.html`).

**Architecture:** Next.js App Router pages calling the API contract defined by Track C-BE through a typed `apiClient.ts`. Tasks C-FE-1 through C-FE-3 need only that contract (mockable, doesn't require C-BE's code to exist) and can run fully in parallel with Track C-BE's implementation. Task C-FE-4 (the editor step) additionally needs Track B's `PostRenderer` render-prop overrides (Task B3) — start it once that lands.

**Tech Stack:** Next.js (App Router), `@supabase/supabase-js` (browser client, anon key), Vitest + @testing-library/react, `post-renderer` (workspace package).

**Spec:** `docs/superpowers/specs/2026-08-13-post-authoring-admin-design.md`

## Global Constraints

- API contract (exact paths/payloads) is defined in `docs/superpowers/plans/2026-08-13-admin-backend.md`'s "Handoff to Track C-FE" table — copy it into `apiClient.ts` in Task C-FE-2 and treat it as fixed; if it turns out wrong, fix the contract doc first, then this code.
- `admin/` shares the root workspace and `admin/package.json`/`tsconfig.json`/`next.config.js` from Track C-BE Task C-BE-1 — if that task hasn't landed when you start, create those 3 files yourself first (copy from that plan's Task C-BE-1 Step 1) so `admin/` exists as a runnable Next.js app.
- Visual polish (exact spacing, colors) should match the approved wireframe at `.superpowers/brainstorm/2212-1786598470/content/full-mockup.html` and the color tokens in `frontend/src/design/tokens.ts` (Playfair Display + Be Vietnam Pro, `garden` palette) — these plans focus on wiring and correctness; lift the CSS values from that file rather than re-deriving them.

---

### Task C-FE-1: Login page + browser Supabase client + auth gate

**Files:**
- Create: `admin/lib/supabaseClient.ts`
- Create: `admin/app/login/page.tsx`
- Create: `admin/app/login/page.test.tsx`
- Create: `admin/components/AuthGate.tsx`

**Interfaces:**
- Produces: `supabase` (browser client, anon key) importable from `admin/lib/supabaseClient.ts`.
- Produces: `<AuthGate>{children}</AuthGate>` — renders children only when a Supabase session exists, otherwise redirects to `/login`. Every other page in this track wraps its content in this.

- [ ] **Step 1: Browser Supabase client**

```ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 2: Failing test for the login form**

`admin/app/login/page.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const signInWithOtp = vi.fn().mockResolvedValue({ error: null })
vi.mock('../../lib/supabaseClient', () => ({ supabase: { auth: { signInWithOtp } } }))

const { default: LoginPage } = await import('./page')

describe('LoginPage', () => {
  it('sends a magic link for the entered email', async () => {
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.com')
    await userEvent.click(screen.getByRole('button', { name: /gửi magic link/i }))
    expect(signInWithOtp).toHaveBeenCalledWith({ email: 'admin@example.com' })
    expect(await screen.findByText(/đã gửi/i)).toBeInTheDocument()
  })
})
```

Add `@testing-library/user-event` to `admin/package.json` devDependencies (`^14.5.2`), run `cd admin && npm install`.

- [ ] **Step 3: Run, confirm it fails**

Run: `cd admin && npx vitest run app/login/page.test.tsx` → FAIL, `./page` doesn't exist.

- [ ] **Step 4: Implement the login page**

```tsx
'use client'
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({ email })
    setSent(true)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 280, margin: '80px auto', textAlign: 'center' }}>
      <p>Nhập email của bạn</p>
      <input
        id="email"
        aria-label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 8 }}
      />
      <button type="submit" style={{ width: '100%', marginTop: 10, padding: 8 }}>Gửi magic link</button>
      {sent && <p>Đã gửi — kiểm tra email của bạn.</p>}
    </form>
  )
}
```

- [ ] **Step 5: Run, confirm PASS; add `AuthGate`; commit**

Run: `cd admin && npx vitest run app/login/page.test.tsx` → PASS.

`admin/components/AuthGate.tsx`:
```tsx
'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
```

```bash
git add admin/lib/supabaseClient.ts admin/app/login admin/components/AuthGate.tsx admin/package.json
git commit -m "feat(admin): login page and auth gate"
```

---

### Task C-FE-2: Typed API client + Dashboard (list, status tabs, row actions)

**Files:**
- Create: `admin/lib/apiClient.ts`
- Create: `admin/lib/apiClient.test.ts`
- Create: `admin/components/PostCard.tsx`
- Create: `admin/components/StatusBadge.tsx`
- Create: `admin/app/posts/page.tsx`
- Create: `admin/app/posts/page.test.tsx`

**Interfaces:**
- Consumes: the API contract table in Track C-BE's plan handoff section.
- Produces: `apiClient.listPosts(status)`, `apiClient.createPost(input)`, `apiClient.getPost(id)`, `apiClient.updatePost(id, patch)`, `apiClient.transitionStatus(id, action)`, `apiClient.listTemplates()`, `apiClient.createTemplate(input)`, `apiClient.uploadImage(file)` — every later task in this track imports these instead of calling `fetch` directly.

- [ ] **Step 1: Failing test for `apiClient.listPosts`**

`admin/lib/apiClient.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) } },
}))

const { listPosts, transitionStatus } = await import('./apiClient')

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 'p1', status: 'draft' }] })
})

describe('apiClient.listPosts', () => {
  it('GETs /api/posts with the status query param and Bearer token', async () => {
    const result = await listPosts('draft')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/posts?status=draft',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    )
    expect(result).toEqual([{ id: 'p1', status: 'draft' }])
  })
})

describe('apiClient.transitionStatus', () => {
  it('POSTs the action to /api/posts/:id/status', async () => {
    await transitionStatus('p1', 'publish')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/posts/p1/status',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'publish' }) }),
    )
  })
})
```

- [ ] **Step 2: Run, confirm it fails**

Run: `cd admin && npx vitest run lib/apiClient.test.ts` → FAIL, `./apiClient` doesn't exist.

- [ ] **Step 3: Implement `apiClient.ts`**

```ts
import type { SectionData, Template } from 'post-renderer'
import { supabase } from './supabaseClient'

export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'
export type PostSummary = { id: string; slug: string; en: string; vi: string; moduleId: string; kind: string; status: PostStatus; heroImageUrl: string | null; publishedAt: string | null; updatedAt: string }
export type PostDetail = { id: string; slug: string; en: string; vi: string; moduleId: string; kind: string; status: PostStatus; templateId: string | null; heroImageUrl: string | null; body: SectionData[] }
export type { Template }
export type StatusAction = 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'restore-trash' | 'permanently-delete'

async function authedFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  return res
}

export async function listPosts(status: PostStatus | 'all' = 'all'): Promise<PostSummary[]> {
  const res = await authedFetch(`/api/posts?status=${status}`)
  return res.json()
}

export async function createPost(input: { moduleId: string; kind: string; en: string; vi: string }): Promise<{ id: string }> {
  const res = await authedFetch('/api/posts', { method: 'POST', body: JSON.stringify(input) })
  return res.json()
}

export async function getPost(id: string): Promise<PostDetail> {
  const res = await authedFetch(`/api/posts/${id}`)
  return res.json()
}

export async function updatePost(id: string, patch: Partial<{ templateId: string; en: string; vi: string; body: unknown; heroImageUrl: string }>): Promise<{ id: string }> {
  const res = await authedFetch(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  return res.json()
}

export async function transitionStatus(id: string, action: StatusAction): Promise<{ id: string; status: PostStatus } | null> {
  const res = await authedFetch(`/api/posts/${id}/status`, { method: 'POST', body: JSON.stringify({ action }) })
  if (res.status === 204) return null
  return res.json()
}

export async function listTemplates(): Promise<Template[]> {
  const res = await authedFetch('/api/templates')
  return res.json()
}

export async function createTemplate(input: Omit<Template, 'id'>): Promise<Template> {
  const res = await authedFetch('/api/templates', { method: 'POST', body: JSON.stringify(input) })
  return res.json()
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.set('file', file)
  const { data } = await supabase.auth.getSession()
  const res = await fetch('/api/upload', { method: 'POST', body: form, headers: { Authorization: `Bearer ${data.session?.access_token}` } })
  return res.json()
}
```

- [ ] **Step 4: Run, confirm PASS**

Run: `cd admin && npx vitest run lib/apiClient.test.ts` → PASS.

- [ ] **Step 5: Dashboard page — failing test, then implementation**

`admin/app/posts/page.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../components/AuthGate', () => ({ AuthGate: ({ children }: { children: React.ReactNode }) => children }))
const transitionStatus = vi.fn().mockResolvedValue({ id: 'p1', status: 'published' })
vi.mock('../../lib/apiClient', () => ({
  listPosts: vi.fn().mockResolvedValue([
    { id: 'p1', slug: 'senses', en: 'Senses of Flavors', vi: 'mô tả', moduleId: 'sensory', kind: 'note', status: 'draft', heroImageUrl: null, publishedAt: null, updatedAt: '2026-06-01T00:00:00Z' },
  ]),
  transitionStatus,
}))

const { default: PostsPage } = await import('./page')

describe('PostsPage', () => {
  it('lists posts and publishes one on click', async () => {
    render(<PostsPage />)
    expect(await screen.findByText('Senses of Flavors')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(transitionStatus).toHaveBeenCalledWith('p1', 'publish')
  })
})
```

Run: `cd admin && npx vitest run app/posts/page.test.tsx` → FAIL (`./page` doesn't exist).

`admin/components/StatusBadge.tsx`:
```tsx
import type { PostStatus } from '../lib/apiClient'

const LABEL: Record<PostStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived', deleted: 'Deleted' }

export function StatusBadge({ status }: { status: PostStatus }) {
  return <span data-testid="status-badge">{LABEL[status]}</span>
}
```

`admin/components/PostCard.tsx` — actions per status, matching the spec's lifecycle table:
```tsx
import type { PostStatus, PostSummary, StatusAction } from '../lib/apiClient'
import { StatusBadge } from './StatusBadge'

const ACTIONS_BY_STATUS: Record<PostStatus, { label: string; action: StatusAction }[]> = {
  draft: [{ label: 'Publish', action: 'publish' }, { label: 'Xoá', action: 'delete' }],
  published: [{ label: 'Archive', action: 'archive' }, { label: 'Xoá', action: 'delete' }],
  archived: [{ label: 'Restore', action: 'restore' }, { label: 'Xoá', action: 'delete' }],
  deleted: [{ label: 'Restore', action: 'restore-trash' }, { label: 'Xoá vĩnh viễn', action: 'permanently-delete' }],
}

export function PostCard({ post, onAction }: { post: PostSummary; onAction: (id: string, action: StatusAction) => void }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 12, border: '1px solid #EBE5D3', borderRadius: 10 }}>
      <div style={{ width: 68, height: 68, background: '#F2A0A5', borderRadius: 8, flex: 'none' }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{post.en}</span>
          <StatusBadge status={post.status} />
        </div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{post.moduleId} · {post.kind} · {post.updatedAt}</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{post.vi}</div>
        <div style={{ marginTop: 8 }}>
          <a href={`/posts/${post.id}/edit`}>Sửa</a>
          {ACTIONS_BY_STATUS[post.status].map((a) => (
            <button key={a.action} onClick={() => onAction(post.id, a.action)} style={{ marginLeft: 10 }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

`admin/app/posts/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { AuthGate } from '../../components/AuthGate'
import { PostCard } from '../../components/PostCard'
import { listPosts, transitionStatus, type PostStatus, type PostSummary, type StatusAction } from '../../lib/apiClient'

const TABS: (PostStatus | 'all')[] = ['all', 'draft', 'published', 'archived', 'deleted']

export default function PostsPage() {
  const [tab, setTab] = useState<PostStatus | 'all'>('all')
  const [posts, setPosts] = useState<PostSummary[]>([])

  async function load() {
    setPosts(await listPosts(tab))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function handleAction(id: string, action: StatusAction) {
    await transitionStatus(id, action)
    load()
  }

  return (
    <AuthGate>
      <div style={{ padding: 32 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}>{t}</button>
          ))}
        </div>
        <a href="/posts/new">+ Bài mới</a>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onAction={handleAction} />
          ))}
        </div>
      </div>
    </AuthGate>
  )
}
```

- [ ] **Step 6: Run, confirm PASS; commit**

Run: `cd admin && npx vitest run app/posts/page.test.tsx` → PASS.

```bash
git add admin/lib/apiClient.ts admin/lib/apiClient.test.ts admin/components/PostCard.tsx admin/components/StatusBadge.tsx admin/app/posts/page.tsx admin/app/posts/page.test.tsx
git commit -m "feat(admin): apiClient and dashboard with status tabs and row actions"
```

---

### Task C-FE-3: New Post wizard — Step 1 Metadata + Step 2 Template picker

**Files:**
- Create: `admin/app/posts/new/page.tsx`
- Create: `admin/app/posts/new/MetadataStep.tsx`
- Create: `admin/app/posts/new/TemplateStep.tsx`
- Create: `admin/app/posts/new/MetadataStep.test.tsx`
- Create: `admin/app/posts/new/TemplateStep.test.tsx`

**Interfaces:**
- Consumes: `apiClient.createPost`, `apiClient.listTemplates`, `apiClient.createTemplate` (Task C-FE-2).
- Produces: wizard state shape `{ postId: string | null; moduleId: string; kind: string; en: string; vi: string; templateId: string | null }` passed down from `admin/app/posts/new/page.tsx` — Task C-FE-4's `EditorStep` receives `postId` and `templateId` from this same state object.

- [ ] **Step 1: Failing test for `MetadataStep`**

`admin/app/posts/new/MetadataStep.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MetadataStep } from './MetadataStep'

describe('MetadataStep', () => {
  it('calls onContinue with the entered metadata', async () => {
    const onContinue = vi.fn()
    render(<MetadataStep onContinue={onContinue} />)
    await userEvent.selectOptions(screen.getByLabelText('Module'), 'roasting')
    await userEvent.selectOptions(screen.getByLabelText('Loại bài'), 'essay')
    await userEvent.type(screen.getByLabelText('Tiêu đề (EN)'), 'Senses of Flavors')
    await userEvent.type(screen.getByLabelText('Mô tả (VI)'), 'mô tả')
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith({ moduleId: 'roasting', kind: 'essay', en: 'Senses of Flavors', vi: 'mô tả' })
  })
})
```

- [ ] **Step 2: Run, confirm it fails** (`./MetadataStep` doesn't exist).

- [ ] **Step 3: Implement `MetadataStep`**

```tsx
'use client'
import { useState } from 'react'

export type Metadata = { moduleId: string; kind: string; en: string; vi: string }
const MODULES = ['sensory', 'biochem', 'roasting']
const KINDS = ['note', 'essay', 'ref', 'log']

export function MetadataStep({ onContinue }: { onContinue: (m: Metadata) => void }) {
  const [moduleId, setModuleId] = useState(MODULES[0])
  const [kind, setKind] = useState(KINDS[0])
  const [en, setEn] = useState('')
  const [vi, setVi] = useState('')

  return (
    <div>
      <label htmlFor="module">Module</label>
      <select id="module" aria-label="Module" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
        {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      <label htmlFor="kind">Loại bài</label>
      <select id="kind" aria-label="Loại bài" value={kind} onChange={(e) => setKind(e.target.value)}>
        {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>

      <label htmlFor="en">Tiêu đề (EN)</label>
      <input id="en" aria-label="Tiêu đề (EN)" value={en} onChange={(e) => setEn(e.target.value)} />

      <label htmlFor="vi">Mô tả (VI)</label>
      <input id="vi" aria-label="Mô tả (VI)" value={vi} onChange={(e) => setVi(e.target.value)} />

      <button onClick={() => onContinue({ moduleId, kind, en, vi })}>Tiếp tục →</button>
    </div>
  )
}
```

- [ ] **Step 4: Run, confirm PASS. Then repeat steps 1–4 for `TemplateStep`**

Run: `cd admin && npx vitest run app/posts/new/MetadataStep.test.tsx` → PASS.

`admin/app/posts/new/TemplateStep.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TemplateStep } from './TemplateStep'

vi.mock('../../../lib/apiClient', () => ({
  listTemplates: vi.fn().mockResolvedValue([
    { id: 't1', name: 'Band · Blush', layout: 'band', accent: '#F2A0A5', onColor: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4' },
  ]),
}))

describe('TemplateStep', () => {
  it('lists templates and calls onContinue with the picked id', async () => {
    const onContinue = vi.fn()
    render(<TemplateStep onContinue={onContinue} />)
    await userEvent.click(await screen.findByText('Band · Blush'))
    await userEvent.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onContinue).toHaveBeenCalledWith('t1')
  })
})
```

Run, confirm FAIL, then implement:

`admin/app/posts/new/TemplateStep.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { listTemplates, type Template } from '../../../lib/apiClient'

const LAYOUT_LABEL: Record<Template['layout'], string> = {
  band: 'khối màu đầu trang · 1 ảnh ngang lớn · danh mục 2 cột',
  specimen: 'nửa trái khối màu · nửa phải lưới ảnh vuông',
  sequence: 'tiêu đề cực lớn trên khối màu · dải 4 ảnh chuyển màu',
}

export function TemplateStep({ onContinue }: { onContinue: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    listTemplates().then(setTemplates)
  }, [])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelected(t.id)}
            style={{ border: selected === t.id ? '2px solid #23211A' : '1px solid #EBE5D3', borderRadius: 10, cursor: 'pointer', padding: 8 }}
          >
            <div style={{ height: 64, background: t.accent, borderRadius: 6 }} />
            <div style={{ fontSize: 12, marginTop: 8 }}>{t.name}</div>
            <div style={{ fontSize: 10.5, opacity: 0.6 }}>{LAYOUT_LABEL[t.layout]}</div>
          </div>
        ))}
      </div>
      <button disabled={!selected} onClick={() => selected && onContinue(selected)} style={{ marginTop: 20 }}>
        Tiếp tục →
      </button>
    </div>
  )
}
```

Run: `cd admin && npx vitest run app/posts/new/TemplateStep.test.tsx` → PASS.

- [ ] **Step 5: Wire both steps into the wizard page + commit**

`admin/app/posts/new/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGate } from '../../../components/AuthGate'
import { createPost, updatePost } from '../../../lib/apiClient'
import { MetadataStep, type Metadata } from './MetadataStep'
import { TemplateStep } from './TemplateStep'

export default function NewPostPage() {
  const router = useRouter()
  const [step, setStep] = useState<'metadata' | 'template' | 'editor'>('metadata')
  const [postId, setPostId] = useState<string | null>(null)

  async function handleMetadata(m: Metadata) {
    const { id } = await createPost(m)
    setPostId(id)
    setStep('template')
  }

  async function handleTemplate(templateId: string) {
    if (!postId) return
    await updatePost(postId, { templateId })
    router.push(`/posts/${postId}/edit`)
  }

  return (
    <AuthGate>
      <div style={{ padding: 32 }}>
        {step === 'metadata' && <MetadataStep onContinue={handleMetadata} />}
        {step === 'template' && <TemplateStep onContinue={handleTemplate} />}
      </div>
    </AuthGate>
  )
}
```

```bash
git add admin/app/posts/new
git commit -m "feat(admin): new-post wizard steps 1-2 (metadata, template picker)"
```

---

### Task C-FE-4: Editor step (WYSIWYG) + Preview page

**Files:**
- Create: `admin/app/posts/[id]/edit/page.tsx`
- Create: `admin/app/posts/[id]/edit/EditorCanvas.tsx`
- Create: `admin/app/posts/[id]/edit/EditorCanvas.test.tsx`
- Create: `admin/app/posts/[id]/preview/page.tsx`

**Interfaces:**
- Consumes: `PostRenderer` with render-prop overrides from `post-renderer` (Track B Task B3 — **do not start this task until that lands**). Consumes `apiClient.getPost`, `apiClient.updatePost`, `apiClient.uploadImage`, `apiClient.transitionStatus`.

- [ ] **Step 1: Failing test — editing a section body calls `onSectionChange`**

`admin/app/posts/[id]/edit/EditorCanvas.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorCanvas } from './EditorCanvas'

const template = { id: 't1', name: 'Sequence · Apricot', layout: 'sequence' as const, accent: '#F0B45C', onColor: '#3B2E19', tint: '#F9EBD2', tint2: '#F3DCAE' }
const post = { title: 'Senses of Flavors', sections: [{ h: 'Nó là gì', p: 'nội dung cũ' }] }

describe('EditorCanvas', () => {
  it('renders inputs seeded with post data and reports edits', async () => {
    const onTitleChange = vi.fn()
    const onSectionBodyChange = vi.fn()
    render(
      <EditorCanvas
        template={template}
        post={post}
        onTitleChange={onTitleChange}
        onSectionBodyChange={onSectionBodyChange}
        onHeroDrop={vi.fn()}
      />,
    )
    const titleInput = screen.getByDisplayValue('Senses of Flavors')
    await userEvent.type(titleInput, '!')
    expect(onTitleChange).toHaveBeenCalled()

    const bodyInput = screen.getByDisplayValue('nội dung cũ')
    await userEvent.type(bodyInput, '!')
    expect(onSectionBodyChange).toHaveBeenCalledWith(0, expect.stringContaining('nội dung cũ'))
  })
})
```

- [ ] **Step 2: Run, confirm it fails** (`./EditorCanvas` doesn't exist).

- [ ] **Step 3: Implement `EditorCanvas` using `PostRenderer`'s overrides**

```tsx
'use client'
import { PostRenderer, type PostRenderData, type Template } from 'post-renderer'

type Props = {
  template: Template
  post: Pick<PostRenderData, 'title' | 'sections'>
  onTitleChange: (title: string) => void
  onSectionBodyChange: (index: number, p: string) => void
  onHeroDrop: (file: File) => void
}

export function EditorCanvas({ template, post, onTitleChange, onSectionBodyChange, onHeroDrop }: Props) {
  return (
    <PostRenderer
      template={template}
      post={post}
      renderTitle={(title) => (
        <input
          defaultValue={title}
          onChange={(e) => onTitleChange(e.target.value)}
          style={{ font: 'inherit', background: 'transparent', border: 'none', borderBottom: '1px dashed currentColor', width: '100%' }}
        />
      )}
      renderSectionBody={(p, i) => (
        <textarea
          defaultValue={p}
          onChange={(e) => onSectionBodyChange(i, e.target.value)}
          style={{ font: 'inherit', width: '100%', border: 'none', background: 'transparent' }}
        />
      )}
      renderHero={() => (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) onHeroDrop(file)
          }}
          style={{ height: 140, border: '2px dashed currentColor', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          kéo ảnh hero thả vào đây, hoặc bấm để chọn file
        </div>
      )}
    />
  )
}
```

- [ ] **Step 4: Run, confirm PASS**

Run: `cd admin && npx vitest run app/posts/[id]/edit/EditorCanvas.test.tsx` → PASS.

- [ ] **Step 5: Wire the edit page (fetch, autosave, upload, preview link, publish) and the read-only preview page; commit**

`admin/app/posts/[id]/edit/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGate } from '../../../../components/AuthGate'
import { getPost, updatePost, uploadImage, transitionStatus, type PostDetail, type Template, listTemplates } from '../../../../lib/apiClient'
import { EditorCanvas } from './EditorCanvas'

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)

  useEffect(() => {
    Promise.all([getPost(id), listTemplates()]).then(([p, templates]) => {
      setPost(p)
      setTemplate(templates.find((t) => t.id === p.templateId) ?? null)
    })
  }, [id])

  if (!post || !template) return <div style={{ padding: 32 }}>Đang tải...</div>

  const sections = post.body.map((s) => ({ h: s.h, p: s.p }))

  return (
    <AuthGate>
      <div style={{ padding: 32 }}>
        <a href={`/posts/${id}/preview`} target="_blank" rel="noreferrer">Xem trước ↗</a>
        <EditorCanvas
          template={template}
          post={{ title: post.en, sections }}
          onTitleChange={(en) => updatePost(id, { en })}
          onSectionBodyChange={(index, p) => {
            const nextBody = post.body.map((s, i) => (i === index ? { ...s, p } : s))
            setPost({ ...post, body: nextBody })
            updatePost(id, { body: nextBody })
          }}
          onHeroDrop={async (file) => {
            const { url } = await uploadImage(file)
            setPost({ ...post, heroImageUrl: url })
            updatePost(id, { heroImageUrl: url })
          }}
        />
        <div style={{ marginTop: 20 }}>
          <button onClick={() => router.push('/posts')}>Lưu nháp</button>
          <button onClick={async () => { await transitionStatus(id, 'publish'); router.push('/posts') }} style={{ marginLeft: 8 }}>
            Publish
          </button>
        </div>
      </div>
    </AuthGate>
  )
}
```

`admin/app/posts/[id]/preview/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PostRenderer, type Template } from 'post-renderer'
import { AuthGate } from '../../../../components/AuthGate'
import { getPost, listTemplates, type PostDetail } from '../../../../lib/apiClient'

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)

  useEffect(() => {
    Promise.all([getPost(id), listTemplates()]).then(([p, templates]) => {
      setPost(p)
      setTemplate(templates.find((t) => t.id === p.templateId) ?? null)
    })
  }, [id])

  if (!post || !template) return <div style={{ padding: 32 }}>Đang tải...</div>

  return (
    <AuthGate>
      <PostRenderer template={template} post={{ title: post.en, heroImageUrl: post.heroImageUrl, sections: post.body }} />
    </AuthGate>
  )
}
```

```bash
git add admin/app/posts/\[id\]
git commit -m "feat(admin): WYSIWYG editor step and public-style preview page"
```
