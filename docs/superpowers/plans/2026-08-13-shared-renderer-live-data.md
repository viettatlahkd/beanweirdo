# Shared Post Renderer & Live Data (Track B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `post-renderer` package that draws a post's hero + body for all 3 layouts (band/specimen/sequence) from data instead of hardcoded content, and wire the public `frontend/` app to read modules/posts live from Supabase instead of `src/content/*.ts`.

**Architecture:** New npm workspace `packages/post-renderer` holds pure, presentational React components parameterized by `(template, post)`, with optional render-prop overrides so the admin app (Track C) can inject editable inputs into the exact same layout later — that's what makes the admin editor a true WYSIWYG instead of a lookalike. `frontend/` gets small Supabase-backed data hooks and its screens are rewired to use them; `Article.tsx` is rewritten around `PostRenderer`.

**Tech Stack:** npm workspaces, Vitest + @testing-library/react (new — nothing in this repo has tests yet), existing Supabase JS client.

**Spec:** `docs/superpowers/specs/2026-08-13-post-authoring-admin-design.md`

## Global Constraints

- Track A must be complete and its local Supabase running (`cd backend && npm run db:start && npm run db:reset`) before Task B4 — B4's tests hit the real local Postgres through the anon key.
- Tasks B1–B3 (the `post-renderer` package itself) have **no dependency on Track A** and can start immediately in parallel with it — they're pure component code with mocked data.
- Track C-FE's editor step depends on Task B3 specifically (the render-prop overrides). Tell that track's implementer when B3 lands.
- `frontend/src/content/modules.ts` describes layout this way — keep it as the mental model for the 3 layout treatments, but note it currently drives the *module index page* (`ModuleScreen.tsx`), not individual posts. `PostRenderer` is new: 3 analogous but distinct hero treatments for a *single article*, not a reuse of `ModuleScreen.tsx`'s components (those keep rendering module listings, unchanged, out of scope here).

---

### Task B1: npm workspaces + Vitest + `PostRenderer` (band layout, read-only)

**Files:**
- Create: `package.json` (repo root — doesn't exist yet)
- Create: `vitest.config.ts` (repo root)
- Create: `packages/post-renderer/package.json`
- Create: `packages/post-renderer/tsconfig.json`
- Create: `packages/post-renderer/src/types.ts`
- Create: `packages/post-renderer/src/PostRenderer.tsx`
- Create: `packages/post-renderer/src/PostRenderer.test.tsx`
- Create: `packages/post-renderer/src/index.ts`
- Modify: `frontend/package.json` (add workspace dependency, remove nothing yet)

**Interfaces:**
- Produces: `Layout = 'band' | 'specimen' | 'sequence'`, `Template = { id: string; name: string; layout: Layout; accent: string; onColor: string; tint: string; tint2: string }`, `FigureData = { h: string; w: string; margin: string; caption: string; label: string; note: string; imageUrl?: string | null }`, `SectionData = { h: string; p: string; fig?: FigureData }`, `PostRenderData = { title: string; lead?: string; heroImageUrl?: string | null; heroCaption?: string; sections: SectionData[] }` — exported from `post-renderer`.
- Produces: `<PostRenderer template={Template} post={PostRenderData} />` — every later task in this file and all of Track C-FE's editor task import this.

- [ ] **Step 1: Root workspace + Vitest config**

`package.json` (repo root):
```json
{
  "name": "beanweirdo",
  "private": true,
  "workspaces": ["frontend", "admin", "packages/*"],
  "devDependencies": {
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "jsdom": "^25.0.1",
    "@vitejs/plugin-react": "^4.3.4"
  },
  "scripts": {
    "test": "vitest run"
  }
}
```

`vitest.config.ts` (repo root):
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['frontend/src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Create `vitest.setup.ts` (repo root):
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: `post-renderer` package skeleton + types**

`packages/post-renderer/package.json`:
```json
{
  "name": "post-renderer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "peerDependencies": {
    "react": "^18.3.1"
  }
}
```

`packages/post-renderer/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`packages/post-renderer/src/types.ts`:
```ts
export type Layout = 'band' | 'specimen' | 'sequence'

export type Template = {
  id: string
  name: string
  layout: Layout
  accent: string
  onColor: string
  tint: string
  tint2: string
}

export type FigureData = {
  h: string
  w: string
  margin: string
  caption: string
  label: string
  note: string
  imageUrl?: string | null
}

export type SectionData = {
  h: string
  p: string
  fig?: FigureData
}

export type PostRenderData = {
  title: string
  lead?: string
  heroImageUrl?: string | null
  heroCaption?: string
  sections: SectionData[]
}
```

Run: `npm install` (from repo root) to link the new workspace.

- [ ] **Step 3: Write the failing test for the band layout**

`packages/post-renderer/src/PostRenderer.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostRenderer } from './PostRenderer'
import type { PostRenderData, Template } from './types'

const bandTemplate: Template = {
  id: 't1', name: 'Band · Blush', layout: 'band',
  accent: '#F2A0A5', onColor: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4',
}

const post: PostRenderData = {
  title: 'Senses of Flavors',
  lead: 'Năm giác quan cùng tham gia vào một ngụm cà phê',
  sections: [{ h: 'Nó là gì', p: 'Chlorogenic acid không phải một chất...' }],
}

describe('PostRenderer — band layout', () => {
  it('renders the title, lead, and section content', () => {
    render(<PostRenderer template={bandTemplate} post={post} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Senses of Flavors' })).toBeInTheDocument()
    expect(screen.getByText(post.lead!)).toBeInTheDocument()
    expect(screen.getByText('Nó là gì')).toBeInTheDocument()
    expect(screen.getByText(/Chlorogenic acid/)).toBeInTheDocument()
  })

  it('applies the template accent color to the hero band', () => {
    render(<PostRenderer template={bandTemplate} post={post} />)
    expect(screen.getByTestId('post-hero')).toHaveStyle({ background: bandTemplate.accent })
  })
})
```

- [ ] **Step 4: Run, confirm it fails**

Run (from repo root): `npx vitest run packages/post-renderer/src/PostRenderer.test.tsx`
Expected: FAIL — `Cannot find module './PostRenderer'`.

- [ ] **Step 5: Implement the band layout**

`packages/post-renderer/src/PostRenderer.tsx`:
```tsx
import type { PostRenderData, Template } from './types'

export type PostRendererProps = {
  template: Template
  post: PostRenderData
}

export function PostRenderer({ template, post }: PostRendererProps) {
  if (template.layout === 'band') return <BandPost template={template} post={post} />
  // other layouts added in the next task
  return <BandPost template={template} post={post} />
}

function BandPost({ template, post }: PostRendererProps) {
  return (
    <article>
      <header
        data-testid="post-hero"
        style={{ background: template.accent, color: template.onColor, padding: '46px 56px' }}
      >
        <h1 style={{ fontSize: 56, margin: '0 0 12px' }}>{post.title}</h1>
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 20 }}>{post.lead}</p>}
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        {post.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 32 }}>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
```

`packages/post-renderer/src/index.ts`:
```ts
export { PostRenderer } from './PostRenderer'
export type { Layout, Template, FigureData, SectionData, PostRenderData } from './types'
```

- [ ] **Step 6: Run, confirm it passes; add the workspace dependency to `frontend`; commit**

Run: `npx vitest run packages/post-renderer/src/PostRenderer.test.tsx` → expect both tests PASS.

Add to `frontend/package.json` `dependencies`: `"post-renderer": "*"`, then `npm install` from repo root.

```bash
git add package.json vitest.config.ts vitest.setup.ts packages/post-renderer frontend/package.json
git commit -m "feat(post-renderer): scaffold package with band layout"
```

---

### Task B2: `specimen` and `sequence` layout variants

**Files:**
- Modify: `packages/post-renderer/src/PostRenderer.tsx`
- Modify: `packages/post-renderer/src/PostRenderer.test.tsx`

**Interfaces:**
- Consumes: `Template`, `PostRenderData` from Task B1.
- Produces: `PostRenderer` now branches correctly on all 3 `template.layout` values — later tasks (B3 overrides, Track C-FE template picker) can rely on all 3 actually rendering distinct structure, not all falling back to band.

- [ ] **Step 1: Add failing tests for the other two layouts**

Append to `PostRenderer.test.tsx`:
```tsx
it('renders a specimen-layout post with a split hero', () => {
  const specimenTemplate: Template = { ...bandTemplate, id: 't2', layout: 'specimen' }
  render(<PostRenderer template={specimenTemplate} post={post} />)
  expect(screen.getByTestId('post-hero-specimen')).toBeInTheDocument()
})

it('renders a sequence-layout post with an oversized title block', () => {
  const sequenceTemplate: Template = { ...bandTemplate, id: 't3', layout: 'sequence' }
  render(<PostRenderer template={sequenceTemplate} post={post} />)
  expect(screen.getByTestId('post-hero-sequence')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run, confirm both fail**

Run: `npx vitest run packages/post-renderer/src/PostRenderer.test.tsx`
Expected: 2 new FAILs (`post-hero-specimen`/`post-hero-sequence` not found), 2 existing PASS.

- [ ] **Step 3: Implement `SpecimenPost` and `SequencePost`, branch on layout**

Replace the `PostRenderer` function body in `PostRenderer.tsx`:
```tsx
export function PostRenderer({ template, post }: PostRendererProps) {
  if (template.layout === 'specimen') return <SpecimenPost template={template} post={post} />
  if (template.layout === 'sequence') return <SequencePost template={template} post={post} />
  return <BandPost template={template} post={post} />
}
```

Add below `BandPost`:
```tsx
function SpecimenPost({ template, post }: PostRendererProps) {
  return (
    <article>
      <header
        data-testid="post-hero-specimen"
        style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr' }}
      >
        <div style={{ background: template.accent, color: template.onColor, padding: '46px 40px' }}>
          <h1 style={{ fontSize: 48, margin: '0 0 12px' }}>{post.title}</h1>
          {post.lead && <p style={{ fontStyle: 'italic' }}>{post.lead}</p>}
        </div>
        <div style={{ background: template.tint }} />
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        {post.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 32 }}>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </article>
  )
}

function SequencePost({ template, post }: PostRendererProps) {
  return (
    <article>
      <header
        data-testid="post-hero-sequence"
        style={{ background: template.accent, color: template.onColor, padding: '52px 56px' }}
      >
        <h1 style={{ fontSize: 88, lineHeight: 0.95, margin: '0 0 16px' }}>{post.title}</h1>
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 18 }}>{post.lead}</p>}
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        {post.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 32 }}>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Run, confirm all pass**

Run: `npx vitest run packages/post-renderer/src/PostRenderer.test.tsx` → expect all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/post-renderer/src/PostRenderer.tsx packages/post-renderer/src/PostRenderer.test.tsx
git commit -m "feat(post-renderer): add specimen and sequence layout variants"
```

---

### Task B3: Render-prop overrides (the hook Track C-FE's editor uses)

**Files:**
- Modify: `packages/post-renderer/src/PostRenderer.tsx`
- Modify: `packages/post-renderer/src/PostRenderer.test.tsx`

**Interfaces:**
- Produces: `PostRendererProps` gains optional `renderTitle?(title: string): ReactNode`, `renderHero?(heroImageUrl: string | null | undefined): ReactNode`, `renderSectionHeading?(h: string, index: number): ReactNode`, `renderSectionBody?(p: string, index: number): ReactNode`, `renderFigure?(fig: FigureData, index: number): ReactNode`. Defaults render plain text/nothing (current public-site behavior, unchanged). **Track C-FE's editor step imports these overrides to turn the exact same layout into an editable form — tell that track this task is done once it lands.**

- [ ] **Step 1: Failing test — override replaces default title rendering**

Append to `PostRenderer.test.tsx`:
```tsx
it('uses renderTitle override instead of the default heading when provided', () => {
  render(
    <PostRenderer
      template={bandTemplate}
      post={post}
      renderTitle={(title) => <input defaultValue={title} aria-label="edit title" />}
    />,
  )
  expect(screen.getByLabelText('edit title')).toHaveValue('Senses of Flavors')
  expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
})

it('uses renderSectionBody override for section paragraphs when provided', () => {
  render(
    <PostRenderer
      template={bandTemplate}
      post={post}
      renderSectionBody={(p, i) => <textarea aria-label={`section-${i}-body`} defaultValue={p} />}
    />,
  )
  expect(screen.getByLabelText('section-0-body')).toHaveValue(post.sections[0].p)
})
```

- [ ] **Step 2: Run, confirm both fail**

Run: `npx vitest run packages/post-renderer/src/PostRenderer.test.tsx` → 2 new FAILs (default heading still renders, override never called).

- [ ] **Step 3: Thread the overrides through all 3 layouts**

Rewrite `PostRenderer.tsx` in full:
```tsx
import type { ReactNode } from 'react'
import type { FigureData, PostRenderData, Template } from './types'

export type PostRendererProps = {
  template: Template
  post: PostRenderData
  renderTitle?: (title: string) => ReactNode
  renderHero?: (heroImageUrl: string | null | undefined) => ReactNode
  renderSectionHeading?: (h: string, index: number) => ReactNode
  renderSectionBody?: (p: string, index: number) => ReactNode
  renderFigure?: (fig: FigureData, index: number) => ReactNode
}

export function PostRenderer(props: PostRendererProps) {
  if (props.template.layout === 'specimen') return <SpecimenPost {...props} />
  if (props.template.layout === 'sequence') return <SequencePost {...props} />
  return <BandPost {...props} />
}

function Title({ post, renderTitle }: Pick<PostRendererProps, 'post' | 'renderTitle'>, fontSize: number) {
  if (renderTitle) return <>{renderTitle(post.title)}</>
  return <h1 style={{ fontSize, lineHeight: 0.95, margin: '0 0 12px' }}>{post.title}</h1>
}

function Sections({ post, renderSectionHeading, renderSectionBody, renderFigure }: PostRendererProps) {
  return (
    <>
      {post.sections.map((s, i) => (
        <section key={i} style={{ marginBottom: 32 }}>
          {renderSectionHeading ? renderSectionHeading(s.h, i) : <h3>{s.h}</h3>}
          {renderSectionBody ? renderSectionBody(s.p, i) : <p>{s.p}</p>}
          {s.fig && (renderFigure ? renderFigure(s.fig, i) : <FigureBlock fig={s.fig} />)}
        </section>
      ))}
    </>
  )
}

function FigureBlock({ fig }: { fig: FigureData }) {
  return (
    <figure style={{ width: fig.w, margin: fig.margin }}>
      {fig.imageUrl && <img src={fig.imageUrl} alt={fig.caption} style={{ width: '100%' }} />}
      <figcaption>{fig.caption}</figcaption>
    </figure>
  )
}

function BandPost(props: PostRendererProps) {
  const { template, post } = props
  return (
    <article>
      <header data-testid="post-hero" style={{ background: template.accent, color: template.onColor, padding: '46px 56px' }}>
        <Title post={post} renderTitle={props.renderTitle} fontSize={56} />
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 20 }}>{post.lead}</p>}
        {props.renderHero && props.renderHero(post.heroImageUrl)}
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        <Sections {...props} />
      </div>
    </article>
  )
}

function SpecimenPost(props: PostRendererProps) {
  const { template, post } = props
  return (
    <article>
      <header data-testid="post-hero-specimen" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr' }}>
        <div style={{ background: template.accent, color: template.onColor, padding: '46px 40px' }}>
          <Title post={post} renderTitle={props.renderTitle} fontSize={48} />
          {post.lead && <p style={{ fontStyle: 'italic' }}>{post.lead}</p>}
        </div>
        <div style={{ background: template.tint }}>
          {props.renderHero && props.renderHero(post.heroImageUrl)}
        </div>
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        <Sections {...props} />
      </div>
    </article>
  )
}

function SequencePost(props: PostRendererProps) {
  const { template, post } = props
  return (
    <article>
      <header data-testid="post-hero-sequence" style={{ background: template.accent, color: template.onColor, padding: '52px 56px' }}>
        <Title post={post} renderTitle={props.renderTitle} fontSize={88} />
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 18 }}>{post.lead}</p>}
        {props.renderHero && props.renderHero(post.heroImageUrl)}
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        <Sections {...props} />
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Run, confirm all tests pass**

Run: `npx vitest run packages/post-renderer/src/PostRenderer.test.tsx` → expect all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/post-renderer/src/PostRenderer.tsx packages/post-renderer/src/PostRenderer.test.tsx
git commit -m "feat(post-renderer): add render-prop overrides for editable consumers"
```

---

### Task B4: Supabase data hooks for the public frontend

**Files:**
- Create: `frontend/src/data/useModules.ts`
- Create: `frontend/src/data/usePublishedPosts.ts`
- Create: `frontend/src/data/usePost.ts`
- Create: `frontend/src/data/useModules.test.ts`
- Create: `frontend/src/data/usePost.test.ts`
- Modify: `frontend/package.json` (add vitest devDeps, `test` script)

**Interfaces:**
- Consumes: schema from Track A — table `modules` (unchanged columns), `posts` with `status`, `template_id`, `hero_image_url`, `body` (jsonb `SectionData[]`), plus a join to `templates`.
- Produces: `useModules(): { modules: ModuleRow[]; loading: boolean; error: string | null }`, `usePublishedPosts(moduleId?: string): { posts: PostRow[]; loading; error }`, `usePost(slug: string): { post: PostRow | null; loading; error }` where `PostRow` includes a nested `template: Template` (from `post-renderer`).

- [ ] **Step 1: Add test tooling to `frontend/package.json`**

Add to `devDependencies`: `"vitest": "^2.1.8", "@testing-library/react": "^16.1.0"`. Add to `scripts`: `"test": "vitest run"`. Run `cd frontend && npm install`.

- [ ] **Step 2: Failing test for `usePost`**

`frontend/src/data/usePost.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePost } from './usePost'

vi.mock('../lib/supabaseClient', () => {
  const single = vi.fn().mockResolvedValue({
    data: {
      slug: 'cga', en: 'Chlorogenic Acids', vi: 'Nguồn gốc vị chát', lead: null,
      hero_image_url: null, hero_caption: null, body: [{ h: 'Nó là gì', p: '...' }],
      templates: { id: 't1', name: 'Sequence · Apricot', layout: 'sequence', accent: '#F0B45C', on_color: '#3B2E19', tint: '#F9EBD2', tint2: '#F3DCAE' },
    },
    error: null,
  })
  const eq2 = vi.fn().mockReturnValue({ single })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const select = vi.fn().mockReturnValue({ eq: eq1 })
  const from = vi.fn().mockReturnValue({ select })
  return { supabase: { from } }
})

describe('usePost', () => {
  it('fetches a post by slug and maps it to PostRow', async () => {
    const { result } = renderHook(() => usePost('cga'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.post?.title).toBe('Chlorogenic Acids')
    expect(result.current.post?.template.layout).toBe('sequence')
    expect(result.current.post?.sections).toEqual([{ h: 'Nó là gì', p: '...' }])
  })
})
```

- [ ] **Step 3: Run, confirm it fails**

Run: `cd frontend && npx vitest run src/data/usePost.test.ts` → FAIL, `usePost` module doesn't exist.

- [ ] **Step 4: Implement the 3 hooks**

`frontend/src/data/usePost.ts`:
```ts
import { useEffect, useState } from 'react'
import type { PostRenderData, SectionData, Template } from 'post-renderer'
import { supabase } from '../lib/supabaseClient'

export type PostRow = PostRenderData & { slug: string; template: Template }

export function usePost(slug: string) {
  const [post, setPost] = useState<PostRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('posts')
      .select('slug, en, vi, lead, hero_image_url, hero_caption, body, templates(id, name, layout, accent, on_color, tint, tint2)')
      .eq('slug', slug)
      .in('status', ['published', 'archived'])
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err || !data) {
          setError(err?.message ?? 'not found')
          setPost(null)
        } else {
          const t = data.templates as unknown as {
            id: string; name: string; layout: Template['layout']
            accent: string; on_color: string; tint: string; tint2: string
          }
          setPost({
            slug: data.slug,
            title: data.en,
            lead: data.lead ?? data.vi ?? undefined,
            heroImageUrl: data.hero_image_url,
            heroCaption: data.hero_caption ?? undefined,
            sections: (data.body ?? []) as SectionData[],
            template: { id: t.id, name: t.name, layout: t.layout, accent: t.accent, onColor: t.on_color, tint: t.tint, tint2: t.tint2 },
          })
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return { post, loading, error }
}
```

`frontend/src/data/useModules.ts`:
```ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type ModuleRow = {
  id: string
  title: string
  accent: string
  on: string
  tint: string
  tint2: string
  layout: 'band' | 'specimen' | 'sequence'
  long: string
}

export function useModules() {
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('modules')
      .select('id, title, accent, on_color, tint, tint2, layout, long_desc')
      .order('sort_order')
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err || !data) {
          setError(err?.message ?? 'failed to load modules')
        } else {
          setModules(
            data.map((m) => ({
              id: m.id, title: m.title, accent: m.accent, on: m.on_color,
              tint: m.tint, tint2: m.tint2, layout: m.layout, long: m.long_desc,
            })),
          )
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { modules, loading, error }
}
```

`frontend/src/data/usePublishedPosts.ts`:
```ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type PostSummary = {
  slug: string
  moduleId: string
  n: string
  en: string
  vi: string
  kind: 'note' | 'essay' | 'ref' | 'log'
  dateLabel: string
}

export function usePublishedPosts(moduleId?: string) {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let query = supabase
      .from('posts')
      .select('slug, module_id, n, en, vi, kind, date_label')
      .eq('status', 'published')
      .order('sort_order')
    if (moduleId) query = query.eq('module_id', moduleId)
    query.then(({ data, error: err }) => {
      if (cancelled) return
      if (err || !data) {
        setError(err?.message ?? 'failed to load posts')
      } else {
        setPosts(
          data.map((p) => ({
            slug: p.slug, moduleId: p.module_id, n: p.n, en: p.en,
            vi: p.vi, kind: p.kind, dateLabel: p.date_label,
          })),
        )
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [moduleId])

  return { posts, loading, error }
}
```

- [ ] **Step 5: Run, confirm `usePost` test passes; write + run one test for `useModules` the same way**

Run: `cd frontend && npx vitest run src/data/usePost.test.ts` → PASS.

`frontend/src/data/useModules.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useModules } from './useModules'

vi.mock('../lib/supabaseClient', () => {
  const order = vi.fn().mockResolvedValue({
    data: [{ id: 'sensory', title: 'sensory', accent: '#F2A0A5', on_color: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4', layout: 'band', long_desc: '...' }],
    error: null,
  })
  const select = vi.fn().mockReturnValue({ order })
  const from = vi.fn().mockReturnValue({ select })
  return { supabase: { from } }
})

describe('useModules', () => {
  it('fetches and maps modules', async () => {
    const { result } = renderHook(() => useModules())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.modules).toEqual([
      { id: 'sensory', title: 'sensory', accent: '#F2A0A5', on: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4', layout: 'band', long: '...' },
    ])
  })
})
```

Run: `cd frontend && npx vitest run src/data/useModules.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/src/data
git commit -m "feat(frontend): add Supabase data hooks for modules and posts"
```

---

### Task B5: Rewrite `Article.tsx` around `PostRenderer` + slug-based routing

**Files:**
- Modify: `frontend/src/lib/nav.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/screens/Article.tsx`
- Modify: `frontend/src/screens/ModuleScreen.tsx` (only the `nav.openArticle` call sites)
- Create: `frontend/src/screens/Article.test.tsx`
- Delete: `frontend/src/content/article.ts`

**Interfaces:**
- Consumes: `usePost` (Task B4), `PostRenderer` (Task B3).
- Produces: `Nav.openArticle(slug: string): void` and `Nav.postSlug: string | null` — the article screen reads the slug from nav state instead of a hardcoded import.

- [ ] **Step 1: Failing test — Article screen renders the post it's given**

`frontend/src/screens/Article.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Article } from './Article'
import { NavContext, SettingsContext, type Nav } from '../lib/nav'

vi.mock('../data/usePost', () => ({
  usePost: () => ({
    post: {
      slug: 'cga', title: 'Chlorogenic Acids', sections: [{ h: 'Nó là gì', p: 'nội dung...' }],
      template: { id: 't1', name: 'Sequence · Apricot', layout: 'sequence', accent: '#F0B45C', onColor: '#3B2E19', tint: '#F9EBD2', tint2: '#F3DCAE' },
    },
    loading: false, error: null,
  }),
}))

const nav: Nav = {
  screen: 'article', variant: 'A', moduleId: 'biochem', postSlug: 'cga',
  goArt: vi.fn(), goLanding: vi.fn(), goHome: vi.fn(), goArchive: vi.fn(),
  goHours: vi.fn(), goNotes: vi.fn(), openModule: vi.fn(),
  openArticle: vi.fn(), toggleVariant: vi.fn(),
}

describe('Article screen', () => {
  it('renders the post returned by usePost', () => {
    render(
      <SettingsContext.Provider value={{ density: 'roomy', showPlates: true }}>
        <NavContext.Provider value={nav}>
          <Article />
        </NavContext.Provider>
      </SettingsContext.Provider>,
    )
    expect(screen.getByText('Chlorogenic Acids')).toBeInTheDocument()
    expect(screen.getByText('nội dung...')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, confirm it fails**

Run: `cd frontend && npx vitest run src/screens/Article.test.tsx`
Expected: FAIL — `nav.postSlug` doesn't exist on the `Nav` type yet / old `Article` ignores it and shows the old hardcoded CGA copy instead (test still fails because current markup differs, e.g. no plain "Chlorogenic Acids" heading text without the italic-split "(CGA)" span).

- [ ] **Step 3: Add `postSlug` to `Nav`, update `openArticle` signature**

In `frontend/src/lib/nav.tsx`, change:
```ts
export type Nav = {
  screen: Screen
  variant: Variant
  moduleId: string
  postSlug: string | null
  goArt(): void
  goLanding(): void
  goHome(): void
  goArchive(): void
  goHours(): void
  goNotes(): void
  openModule(id: string): void
  openArticle(slug: string): void
  toggleVariant(): void
}
```

- [ ] **Step 4: Update `App.tsx` to hold `postSlug` state and pass it through `openArticle`**

In `frontend/src/App.tsx`, add state and update the `nav` object:
```tsx
const [postSlug, setPostSlug] = useState<string | null>(null)

const openArticle = useCallback((slug: string) => {
  setPostSlug(slug)
  setScreen('article')
}, [])
```
Add `postSlug` and replace the inline `openArticle: () => setScreen('article')` with `openArticle` in the `nav` object literal, and add `postSlug` to the `useMemo` dependency array.

Update `frontend/src/screens/ModuleScreen.tsx`'s 3 `onClick={nav.openArticle}` call sites (in `Band`, `Specimen`, `Sequence`) to `onClick={() => nav.openArticle(e.slug)}` — this requires `withTints`'s return type (and thus `Entry`) to carry a `slug`; that comes from Task B6 which replaces `modules`/`withTints` with live data. For this task, temporarily hardcode `onClick={() => nav.openArticle('cga')}` on all 3 call sites so `ModuleScreen` still compiles — Task B6 replaces these properly.

- [ ] **Step 5: Rewrite `Article.tsx`**

```tsx
import { PostRenderer } from 'post-renderer'
import { usePost } from '../data/usePost'
import { useNav } from '../lib/nav'

export function Article() {
  const nav = useNav()
  const { post, loading, error } = usePost(nav.postSlug ?? '')

  if (loading) return <div style={{ padding: 56 }}>Đang tải...</div>
  if (error || !post) return <div style={{ padding: 56 }}>Không tìm thấy bài viết.</div>

  return <PostRenderer template={post.template} post={post} />
}
```

Delete `frontend/src/content/article.ts` (no longer imported anywhere after this).

- [ ] **Step 6: Run the full frontend test suite, confirm pass; typecheck; commit**

Run:
```bash
cd frontend
npx vitest run src/screens/Article.test.tsx
npx tsc -b --noEmit
```
Expected: test PASS; `tsc` may still complain about the temporary hardcoded `'cga'` slug in `ModuleScreen.tsx` only if types mismatch — they won't, `openArticle(slug: string)` accepts a literal string fine.

```bash
git add frontend/src/lib/nav.tsx frontend/src/App.tsx frontend/src/screens/Article.tsx frontend/src/screens/Article.test.tsx frontend/src/screens/ModuleScreen.tsx
git rm frontend/src/content/article.ts
git commit -m "feat(frontend): rewrite Article screen around PostRenderer and live data"
```

---

### Task B6: Wire `Landing`, `IndexScreen`, `ModuleScreen`, `Archive` to live data; delete `content/modules.ts`

**Files:**
- Modify: `frontend/src/screens/Landing.tsx`
- Modify: `frontend/src/screens/IndexScreen.tsx`
- Modify: `frontend/src/screens/ModuleScreen.tsx`
- Modify: `frontend/src/screens/Archive.tsx`
- Create: `frontend/src/screens/ModuleScreen.test.tsx`
- Delete: `frontend/src/content/modules.ts`

**Interfaces:**
- Consumes: `useModules`, `usePublishedPosts` (Task B4).
- Produces: no screen imports `frontend/src/content/modules.ts` anymore — `DesignSystem.tsx` is the one exception, out of scope, leave its import as-is (it's an internal design-reference page, not user content).

- [ ] **Step 1: Failing test — `ModuleScreen` renders entries from `usePublishedPosts` with real slugs**

`frontend/src/screens/ModuleScreen.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModuleScreen } from './ModuleScreen'
import { NavContext, SettingsContext, type Nav } from '../lib/nav'

vi.mock('../data/useModules', () => ({
  useModules: () => ({
    modules: [{ id: 'sensory', title: 'sensory', accent: '#F2A0A5', on: '#3B2A2B', tint: '#FBE7E5', tint2: '#F6D2D4', layout: 'band', long: 'mô tả' }],
    loading: false, error: null,
  }),
}))
vi.mock('../data/usePublishedPosts', () => ({
  usePublishedPosts: () => ({
    posts: [{ slug: 'senses-of-flavors', moduleId: 'sensory', n: '01', en: 'Senses of Flavors', vi: 'mô tả vi', kind: 'note', dateLabel: '2026.05' }],
    loading: false, error: null,
  }),
}))

const openArticle = vi.fn()
const nav: Nav = {
  screen: 'module', variant: 'A', moduleId: 'sensory', postSlug: null,
  goArt: vi.fn(), goLanding: vi.fn(), goHome: vi.fn(), goArchive: vi.fn(),
  goHours: vi.fn(), goNotes: vi.fn(), openModule: vi.fn(), openArticle, toggleVariant: vi.fn(),
}

describe('ModuleScreen', () => {
  it('renders live entries and navigates to the clicked post by slug', () => {
    render(
      <SettingsContext.Provider value={{ density: 'roomy', showPlates: true }}>
        <NavContext.Provider value={nav}>
          <ModuleScreen />
        </NavContext.Provider>
      </SettingsContext.Provider>,
    )
    screen.getByText('Senses of Flavors').click()
    expect(openArticle).toHaveBeenCalledWith('senses-of-flavors')
  })
})
```

- [ ] **Step 2: Run, confirm it fails**

Run: `cd frontend && npx vitest run src/screens/ModuleScreen.test.tsx` → FAIL (still reads from static `modules`, calls `openArticle('cga')` from the Task B5 stopgap).

- [ ] **Step 3: Rewrite `ModuleScreen.tsx`'s data source**

Replace the static import and the `moduleNumber`/`entries` wiring:
```tsx
import { useModules, type ModuleRow } from '../data/useModules'
import { usePublishedPosts } from '../data/usePublishedPosts'
```
Remove `import { modules, withTints, type Module } from '../content/modules'`. Replace every `Module` type reference with `ModuleRow`, drop `withTints` (tint-alternation now happens inline: `i % 2 === 0 ? m.tint : m.tint2`), and change every `onClick={nav.openArticle}` (or the Task-B5 stopgap `onClick={() => nav.openArticle('cga')}`) to `onClick={() => nav.openArticle(e.slug)}`, sourcing `entries` from `usePublishedPosts(m.id).posts` instead of `m.entries`. Update the exported `ModuleScreen` function:
```tsx
export function ModuleScreen() {
  const { moduleId } = useNav()
  const { modules, loading } = useModules()
  const m = modules.find((x) => x.id === moduleId) ?? modules[0]
  if (loading || !m) return <div style={{ padding: 56 }}>Đang tải...</div>
  if (m.layout === 'band') return <Band m={m} />
  if (m.layout === 'specimen') return <Specimen m={m} />
  return <Sequence m={m} />
}
```
Each of `Band`/`Specimen`/`Sequence` gets `const { posts } = usePublishedPosts(m.id)` in place of `withTints(m)`, and maps `posts` (adding the alternating tint inline where the old `e.tint` was used).

- [ ] **Step 4: Run, confirm it passes**

Run: `cd frontend && npx vitest run src/screens/ModuleScreen.test.tsx` → PASS.

- [ ] **Step 5: Apply the same live-data swap to `Landing.tsx`, `IndexScreen.tsx`, `Archive.tsx`; delete `content/modules.ts`; typecheck**

- `Landing.tsx`: replace `import { modules, type Module } from '../content/modules'` with `useModules()` called inside the `Landing` component, threading `modules` down to `ImageBand`.
- `IndexScreen.tsx`: same swap.
- `Archive.tsx`: replace `import { allPosts } from '../content/modules'` with a new small local computation using `useModules()` + `usePublishedPosts()` (no module filter) sorted by `dateLabel` descending, mirroring the old `allPosts` sort.

Run:
```bash
cd frontend
npx vitest run
npx tsc -b --noEmit
```
Expected: all tests PASS. If `tsc` flags `content/modules.ts` as unused once nothing imports it, that confirms it's safe to delete.

Delete `frontend/src/content/modules.ts` (confirm `DesignSystem.tsx` is the only remaining importer of anything from `content/modules` — if so, inline the small bit it needs, e.g. copy just the `ModuleLayout`/`EntryKind` type aliases into `content/designSystem.ts` directly, since that screen is explicitly out of scope for the live-data migration).

- [ ] **Step 6: Full suite + commit**

Run: `cd frontend && npx vitest run && npx tsc -b --noEmit` → all green.

```bash
git add frontend/src/screens frontend/src/data
git rm frontend/src/content/modules.ts
git commit -m "feat(frontend): wire Landing/IndexScreen/ModuleScreen/Archive to live Supabase data"
```
