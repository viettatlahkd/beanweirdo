import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { garden, ink, paper, sans, serif } from '../../design/tokens'
import { useRowDrag } from '../lib/useRowDrag'
import { useTags } from '../../data/useTags'
import {
  createPortPage,
  getPortfolio,
  updatePortDesign,
  updatePortPage,
  updateSite,
  getSite,
  uploadImage,
  type PortPageRecord,
  type PortStatus,
} from '../lib/apiClient'
import { PortfolioView } from '../../portfolio/PortfolioView'
import docHtml from '../../portfolio/design-doc.html?raw'
import { buildChrome, usePortSources, usePostHref } from '../../portfolio/data'
import { navLinks, resolveContent, type Feature, type LinkItem, type NavOverride, type PortContent } from '../../portfolio/content'
import {
  BLOCK_NAMES,
  BLOCK_ORDER,
  convertBlock,
  newBlock,
  parseBlocks,
  preset,
  type Block,
  type BlockType,
  type PortPost,
  type PresetKey,
  type Source,
  type SourceMode,
} from '../../portfolio/blocks'
import {
  DEFAULT_DESIGN,
  docVars,
  familyFromFile,
  fontFaceCss,
  fontHrefs,
  resolveDesign,
  type Design,
  type Fluid,
  type Palette,
  type TypeRole,
  type TypeStyle,
} from '../../portfolio/tokens'

// ── shared ──────────────────────────────────────────────────────────────────

export const sectionHead: CSSProperties = {
  fontFamily: sans,
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: ink.muted,
  borderBottom: `2px solid ${ink.base}`,
  paddingBottom: 9,
  margin: '28px 0 16px',
}
const fieldLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: ink.faint,
  marginBottom: 6,
}
const boxed: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 13,
  padding: '8px 10px',
  outline: 'none',
}
const small: CSSProperties = { ...boxed, padding: '6px 8px', fontSize: 12 }
const btn: CSSProperties = {
  fontFamily: sans,
  fontSize: 11,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  border: `1px solid ${ink.base}`,
  background: 'transparent',
  color: ink.base,
  padding: '8px 12px',
  cursor: 'pointer',
}
const quiet: CSSProperties = { ...btn, border: `1px solid ${paper.rule}`, color: ink.soft }

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={fieldLabel}>{label}</div>
      {children}
    </label>
  )
}

/** Save 700ms after typing stops, batching every change made while waiting — like the CMS (rule 08). */
function useDebounced<T>(save: (v: T) => Promise<unknown>, merge: (a: T, b: T) => T) {
  const pending = useRef<T | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const v = pending.current
    pending.current = null
    if (v !== null) save(v).then(() => setError(null), (e: Error) => setError(e.message))
  }, [save])
  const push = useCallback(
    (v: T) => {
      pending.current = pending.current === null ? v : merge(pending.current, v)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, 700)
    },
    [flush, merge],
  )
  useEffect(() => flush, [flush])
  return { push, flush, error }
}


/**
 * A draggable divider between the two halves of a split screen. `side` is the
 * half whose width is stored; the other half takes what is left. The width is
 * remembered per screen in localStorage, and iframes stop taking pointer
 * events while dragging so the drag is not swallowed by the embedded page.
 */
export function useSplit(key: string, initial: number, side: 'left' | 'right', min = 280, max = 900) {
  const [size, setSize] = useState(() => {
    try {
      const v = Number(localStorage.getItem(`pf-split-${key}`))
      return v >= min && v <= max ? v : initial
    } catch {
      return initial
    }
  })
  const [dragging, setDragging] = useState(false)
  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX
    const s0 = size
    setDragging(true)
    const move = (ev: PointerEvent) => {
      const d = ev.clientX - x0
      setSize(Math.min(max, Math.max(min, side === 'left' ? s0 + d : s0 - d)))
    }
    const up = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setSize((v) => {
        try {
          localStorage.setItem(`pf-split-${key}`, String(v))
        } catch {
          /* private mode: the width just isn't remembered */
        }
        return v
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const columns = side === 'left' ? `${size}px 7px minmax(0,1fr)` : `minmax(0,1fr) 7px ${size}px`
  const handle = (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để đổi độ rộng"
      onPointerDown={start}
      style={{
        cursor: 'col-resize',
        alignSelf: 'stretch',
        height: 'calc(100vh - 220px)',
        position: 'sticky',
        top: 0,
        background: dragging ? ink.faint : paper.rule,
        borderLeft: `3px solid ${paper.cream}`,
        borderRight: `3px solid ${paper.cream}`,
        touchAction: 'none',
      }}
    />
  )
  return { columns, handle, dragging }
}

// ── screen ──────────────────────────────────────────────────────────────────

/** Port pages, the design system and the fixed copy — what every port editor reads. */
export function usePortAdmin() {
  const [pages, setPages] = useState<PortPageRecord[]>([])
  const [stored, setStored] = useState<Record<string, unknown>>({})
  const [contentStored, setContentStored] = useState<Record<string, unknown>>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getPortfolio(), getSite()]).then(
      ([r, site]) => {
        setPages(r.pages)
        setStored(r.design)
        setContentStored(((site as Record<string, unknown>).portfolio as Record<string, unknown>) ?? {})
        setLoaded(true)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  const design = useMemo(() => resolveDesign(stored), [stored])
  const content = useMemo(() => resolveContent(contentStored), [contentStored])
  return { pages, setPages, stored, setStored, setContentStored, design, content, loaded, error }
}

// ── tab 1: port pages ───────────────────────────────────────────────────────

function uniqueSlug(base: string, pages: PortPageRecord[]) {
  const taken = new Set(pages.map((p) => p.slug))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

/** A new port page from a preset; it starts as a draft at the end of the list. */
export async function createFromPreset(key: PresetKey, pages: PortPageRecord[], moduleIds: string[]): Promise<PortPageRecord> {
  const base = key === 'blank' ? 'trang' : key
  const slug = uniqueSlug(base, pages)
  return createPortPage({ slug, title: slug, blocks: preset(key, moduleIds), palette: key === 'bibe' ? 'baen' : 'biz', sortOrder: pages.length })
}

// Same labels and colours as the post status pills (StatusBadge), so a status reads the same everywhere in admin.
const STATUS_NAMES: Record<PortStatus, string> = {
  draft: 'Nháp',
  published: 'Đã đăng',
  archived: 'Lưu trữ',
}
const STATUS_PILL: Record<PortStatus, { background: string; color: string }> = {
  draft: { background: paper.rule, color: ink.soft },
  published: { background: garden.leafTint, color: garden.moss },
  archived: { background: garden.honeyTint, color: garden.cinnamon },
}

function StatusSelect({ value, onChange, pill }: { value: PortStatus; onChange: (s: PortStatus) => void; pill?: boolean }) {
  const style: CSSProperties = pill
    ? {
        fontFamily: sans,
        fontSize: 9.5,
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        appearance: 'none',
        textAlign: 'center',
        width: 'fit-content',
        ...STATUS_PILL[value],
      }
    : boxed
  return (
    <select style={style} value={value} onChange={(e) => onChange(e.target.value as PortStatus)}>
      {(Object.keys(STATUS_NAMES) as PortStatus[]).map((k) => (
        <option key={k} value={k}>{STATUS_NAMES[k]}</option>
      ))}
    </select>
  )
}

type Sources = ReturnType<typeof usePortSources>

export function Builder({
  page,
  design,
  src,
  content,
  pages,
  onBack,
  onSaved,
  onDelete,
  previewSlot,
}: {
  page: PortPageRecord
  design: Design
  src: Sources
  content: PortContent
  pages: PortPageRecord[]
  onBack?: () => void
  onSaved: (p: PortPageRecord) => void
  /** Shown as a link under the status when the page is opened from the CMS page tree. */
  onDelete?: () => void
  /**
   * Inline in the CMS page tree: only the fields are drawn here, and the live
   * page goes to this element (the tree's right half). `undefined` keeps the
   * builder's own split screen.
   */
  previewSlot?: HTMLElement | null
}) {
  const [draft, setDraft] = useState({ ...page, blocks: parseBlocks(page.blocks) })
  const [active, setActive] = useState<string | null>(null)
  const split = useSplit('builder', 420, 'left')
  const { tags } = useTags()
  const postHref = usePostHref()

  const save = useCallback(
    (patch: Record<string, unknown>) => updatePortPage(page.id, patch).then(onSaved),
    [page.id, onSaved],
  )
  const { push, error } = useDebounced<Record<string, unknown>>(save, (a, b) => ({ ...a, ...b }))

  const set = (patch: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    push(patch as Record<string, unknown>)
  }
  const setBlocks = (blocks: Block[]) => set({ blocks })
  const patchBlock = (id: string, patch: Partial<Block>) =>
    setBlocks(draft.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)))

  const drag = useRowDrag((from, to) => {
    const next = [...draft.blocks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setBlocks(next)
  })
  const setType = (id: string, type: BlockType) =>
    setBlocks(draft.blocks.map((b) => (b.id === id ? convertBlock(b, type, src.moduleIds[0]) : b)))

  // Clicking a block in the preview opens that same block in the left column.
  useEffect(() => {
    if (!active) return
    document.getElementById(`pf-row-${active}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])

  const fields = (
    <>
        {onBack && <button style={{ ...quiet, border: 0, padding: 0, marginBottom: 14 }} onClick={onBack}>← tất cả trang</button>}
        <Field label="Tiêu đề">
          <input style={{ ...boxed, fontFamily: serif, fontSize: 22 }} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Đường dẫn · /portfolio/">
          <input
            style={boxed}
            value={draft.slug}
            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          />
        </Field>
        <Field label="Intro">
          <textarea style={{ ...boxed, minHeight: 64, resize: 'vertical' }} value={draft.intro} onChange={(e) => set({ intro: e.target.value })} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Bảng màu">
            <select style={boxed} value={draft.palette} onChange={(e) => set({ palette: e.target.value })}>
              {Object.entries(design.palettes).map(([k, p]) => (
                <option key={k} value={k}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <StatusSelect value={draft.status} onChange={(status) => set({ status })} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: sans, fontSize: 12 }}>
          {draft.status === 'published' && (
            <a href={`/portfolio/${draft.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: ink.green }}>
              mở trang ↗
            </a>
          )}
          {onDelete && (
            <button style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', color: ink.muted, fontFamily: sans, fontSize: 12 }} onClick={onDelete}>
              xoá trang
            </button>
          )}
          {error && <span style={{ color: '#B33' }}>{error}</span>}
        </div>

        <div style={sectionHead}>Khối</div>
        {draft.blocks.map((b, i) => (
          <div
            key={b.id}
            id={`pf-row-${b.id}`}
            draggable
            onDragStart={() => drag.setFrom(i)}
            onDragOver={(e) => {
              e.preventDefault()
              drag.setOver(i)
            }}
            onDrop={() => drag.drop(i)}
            onDragEnd={drag.end}
            style={{
              border: `1px solid ${active === b.id ? ink.base : paper.rule}`,
              background: drag.over === i && drag.from !== i ? '#EEF5F8' : paper.white,
              opacity: drag.from === i ? 0.5 : 1,
              marginBottom: 6,
            }}
          >
            <div
              onClick={() => setActive(active === b.id ? null : b.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', cursor: 'pointer', fontFamily: sans, fontSize: 12.5 }}
            >
              <span style={{ cursor: 'grab', color: ink.faint }} aria-label="Kéo để đổi thứ tự">⋮⋮</span>
              <span style={{ flex: 1 }}>
                {BLOCK_NAMES[b.type]}
                <span style={{ color: ink.faint }}>{summary(b, src.moduleTitles)}</span>
              </span>
              <button
                style={{ border: 0, background: 'none', color: ink.faint, cursor: 'pointer', fontSize: 15 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setBlocks(draft.blocks.filter((x) => x.id !== b.id))
                }}
                aria-label="bỏ khối"
              >
                ×
              </button>
            </div>
            {active === b.id && (
              <div style={{ padding: '4px 12px 10px', borderTop: `1px solid ${paper.rule}` }}>
                <Field label="Component">
                  <select style={small} value={b.type} onChange={(e) => setType(b.id, e.target.value as BlockType)}>
                    {BLOCK_ORDER.map((t) => (
                      <option key={t} value={t}>{BLOCK_NAMES[t]}</option>
                    ))}
                  </select>
                </Field>
                <BlockFields block={b} onChange={(p) => patchBlock(b.id, p)} src={src} tags={tags} />
              </div>
            )}
          </div>
        ))}
        <button
          style={{ ...quiet, marginTop: 10 }}
          onClick={() => {
            const b = newBlock('cards', src.moduleIds[0])
            setBlocks([...draft.blocks, b])
            setActive(b.id)
          }}
        >
          + thêm khối
        </button>
          </>
  )
  const view = (
        <PortfolioView
          title={draft.title}
          intro={draft.intro}
          palette={draft.palette}
          blocks={draft.blocks}
          design={design}
          posts={src.posts}
          moduleTitles={src.moduleTitles}
          postHref={postHref}
          activeId={active}
          onPick={setActive}
          chrome={buildChrome(content, pages.map((p) => (p.id === draft.id ? { ...p, title: draft.title, slug: draft.slug, status: draft.status } : p)), `page:${draft.id}`)}
        />
  )

  if (previewSlot !== undefined)
    return (
      <div style={{ padding: '4px 0 20px' }}>
        {fields}
        {previewSlot && createPortal(<div style={{ height: '100%', overflowY: 'auto' }}>{view}</div>, previewSlot)}
      </div>
    )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: split.columns, alignItems: 'start' }}>
      <div style={{ padding: '22px 22px 80px 56px', height: 'calc(100vh - 220px)', overflowY: 'auto', position: 'sticky', top: 0 }}>{fields}</div>
      {split.handle}
      <div style={{ height: 'calc(100vh - 220px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
        {view}
      </div>
    </div>
  )
}

function summary(b: Block, modules: Record<string, string>): string {
  const label = 'label' in b && b.label ? b.label : ''
  const s = 'source' in b ? sourceText(b.source, modules) : ''
  const extra = b.type === 'opening' ? b.variant : b.type === 'slider' ? { arrow: 'mũi tên', left: 'tự chạy trái', right: 'tự chạy phải' }[b.motion] : b.type === 'cards' ? `${b.cols} ô` : ''
  return [label, extra, s].filter(Boolean).map((x) => ` · ${x}`).join('')
}

function sourceText(s: Source, modules: Record<string, string>): string {
  switch (s.mode) {
    case 'module':
      return modules[s.moduleId] ?? s.moduleId
    case 'tag':
      return `#${s.tag}`
    case 'pinned':
      return 'ghim'
    case 'pick':
      return `${s.ids.length} bài chọn tay`
    default:
      return 'mới nhất'
  }
}

const MODE_NAMES: Record<SourceMode, string> = {
  latest: 'Mới nhất',
  module: 'Theo module',
  tag: 'Theo tag',
  pinned: 'Bài ghim',
  pick: 'Chọn tay',
}

function SourceFields({
  source,
  onChange,
  src,
  tags,
}: {
  source: Source
  onChange: (s: Source) => void
  src: Sources
  tags: { id: string; label: string }[]
}) {
  const limit = 'limit' in source ? source.limit : 6
  const change = (mode: SourceMode) => {
    if (mode === 'module') onChange({ mode, moduleId: src.moduleIds[0] ?? '', limit })
    else if (mode === 'tag') onChange({ mode, tag: tags[0]?.id ?? '', limit })
    else if (mode === 'pick') onChange({ mode, ids: [] })
    else onChange({ mode, limit } as Source)
  }
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: 8 }}>
        <Field label="Nguồn bài">
          <select style={small} value={source.mode} onChange={(e) => change(e.target.value as SourceMode)}>
            {(Object.keys(MODE_NAMES) as SourceMode[]).map((m) => (
              <option key={m} value={m}>{MODE_NAMES[m]}</option>
            ))}
          </select>
        </Field>
        {source.mode === 'module' ? (
          <Field label="Module">
            <select style={small} value={source.moduleId} onChange={(e) => onChange({ ...source, moduleId: e.target.value })}>
              {src.moduleIds.map((id) => (
                <option key={id} value={id}>{src.moduleTitles[id]}</option>
              ))}
            </select>
          </Field>
        ) : source.mode === 'tag' ? (
          <Field label="Tag">
            <select style={small} value={source.tag} onChange={(e) => onChange({ ...source, tag: e.target.value })}>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Field>
        ) : (
          <span />
        )}
        {source.mode !== 'pick' && (
          <Field label="Số bài">
            <input
              style={small}
              type="number"
              min={1}
              max={24}
              value={limit}
              onChange={(e) => onChange({ ...source, limit: Math.max(1, Number(e.target.value) || 1) } as Source)}
            />
          </Field>
        )}
      </div>
      {source.mode === 'pick' && <PickPosts ids={source.ids} posts={src.posts} onChange={(ids) => onChange({ mode: 'pick', ids })} />}
    </>
  )
}

function PickPosts({ ids, posts, onChange }: { ids: string[]; posts: PortPost[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('')
  const shown = posts.filter((p) => !q || p.en.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <input style={{ ...small, marginBottom: 6 }} placeholder="tìm bài" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${paper.rule}`, background: paper.white }}>
        {shown.map((p) => {
          const n = ids.indexOf(p.id)
          return (
            <label key={p.id} style={{ display: 'flex', gap: 8, padding: '5px 8px', fontFamily: sans, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={n >= 0}
                onChange={() => onChange(n >= 0 ? ids.filter((x) => x !== p.id) : [...ids, p.id])}
              />
              <span style={{ width: 16, color: ink.faint }}>{n >= 0 ? n + 1 : ''}</span>
              <span>{p.en}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function BlockFields({
  block,
  onChange,
  src,
  tags,
}: {
  block: Block
  onChange: (p: Partial<Block>) => void
  src: Sources
  tags: { id: string; label: string }[]
}) {
  const text = (label: string, key: string, area = false) => {
    const v = String((block as Record<string, unknown>)[key] ?? '')
    return (
      <Field label={label}>
        {area ? (
          <textarea style={{ ...small, minHeight: 70, resize: 'vertical' }} value={v} onChange={(e) => onChange({ [key]: e.target.value } as Partial<Block>)} />
        ) : (
          <input style={small} value={v} onChange={(e) => onChange({ [key]: e.target.value } as Partial<Block>)} />
        )}
      </Field>
    )
  }
  const source = 'source' in block && (
    <SourceFields source={block.source} onChange={(s) => onChange({ source: s } as Partial<Block>)} src={src} tags={tags} />
  )
  switch (block.type) {
    case 'head':
      return <>{text('Tiêu đề · trống thì theo trang', 'title')}{text('Intro · trống thì theo trang', 'intro', true)}</>
    case 'opening':
      return (
        <>
          <Field label="Phương án">
            <select style={small} value={block.variant} onChange={(e) => onChange({ variant: e.target.value as 'A' | 'B' | 'C' })}>
              <option value="A">A · ba ảnh, cuối cao hết</option>
              <option value="B">B · ba ảnh, 8 · 5 · 3</option>
              <option value="C">C · hai ảnh đối xứng</option>
            </select>
          </Field>
          {text('Chữ đè', 'text', true)}
          {source}
        </>
      )
    case 'cards':
      return (
        <>
          {text('Nhãn', 'label')}
          <Field label="Lưới">
            <select style={small} value={block.cols} onChange={(e) => onChange({ cols: Number(e.target.value) as 2 | 3 })}>
              <option value={3}>3 ô</option>
              <option value={2}>2 ô</option>
            </select>
          </Field>
          {source}
        </>
      )
    case 'slider':
      return (
        <>
          {text('Nhãn', 'label')}
          <Field label="Chạy">
            <select style={small} value={block.motion} onChange={(e) => onChange({ motion: e.target.value as 'arrow' | 'left' | 'right' })}>
              <option value="arrow">mũi tên</option>
              <option value="left">tự chạy · sang trái</option>
              <option value="right">tự chạy · sang phải</option>
            </select>
          </Field>
          {source}
        </>
      )
    case 'series':
      return <>{text('Nhãn · trống thì theo module', 'label')}{source}</>
    case 'story':
      return (
        <>
          {text('Nhãn · trống thì theo module', 'label')}
          {text('Câu mở', 'head')}
          {text('Đoạn kể', 'text', true)}
          <Field label="Ảnh">
            <select style={small} value={block.side} onChange={(e) => onChange({ side: e.target.value as 'right' | 'left' })}>
              <option value="right">bên phải</option>
              <option value="left">bên trái</option>
            </select>
          </Field>
          {source}
        </>
      )
    case 'about':
      return (
        <>
          {text('Câu mở', 'head')}
          {text('Đoạn ngắn', 'text', true)}
          {text('Ảnh · URL', 'image')}
          {block.links.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
              <Field label="Nhãn">
                <input
                  style={small}
                  value={l.label}
                  onChange={(e) => onChange({ links: block.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                />
              </Field>
              <Field label="Link">
                <input
                  style={small}
                  value={l.url}
                  onChange={(e) => onChange({ links: block.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
                />
              </Field>
            </div>
          ))}
        </>
      )
  }
}

// ── tab 2: fixed content (header, footer, main page, about) ────────────────

/** An image slot: the URL, a thumbnail, and an upload button. */
function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const upload = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    setErr(null)
    try {
      onChange((await uploadImage(f)).url)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }
  return (
    <Field label={label}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 56, height: 56, background: value ? `center/cover no-repeat url("${value.split('#')[0]}")` : paper.rule, border: `1px solid ${paper.rule}` }} />
        <input style={small} value={value} placeholder="URL ảnh" onChange={(e) => onChange(e.target.value)} />
        <button style={{ ...btn, padding: '6px 10px', fontSize: 10 }} disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? 'Đang tải…' : 'Tải ảnh'}
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {err && <div style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12, marginTop: 4 }}>{err}</div>}
    </Field>
  )
}

const two: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0 22px' }
const rowBox: CSSProperties = { border: `1px solid ${paper.rule}`, background: paper.white, padding: '8px 10px', marginBottom: 6 }

/**
 * Portfolio › Nội dung trang — the content every port page shares, edited the
 * way Content management edits site copy: grouped fields, autosaved (rule 08.3).
 * Each group is saved whole under `site_settings.data.portfolio.<group>`.
 */
/** The parts of the fixed port copy, each a node of its own in the CMS page tree. */
export type PortPart = 'home' | 'about' | 'sign' | 'header' | 'footer'

export function ContentTab({
  content,
  setStored,
  pages,
  only,
}: {
  content: PortContent
  setStored: (f: (s: Record<string, unknown>) => Record<string, unknown>) => void
  pages: PortPageRecord[]
  /** One part only; without it, every part in one column as the Portfolio screen had it. */
  only?: PortPart
}) {
  const show = (part: PortPart) => !only || only === part
  const save = useCallback((patch: Record<string, unknown>) => updateSite({ portfolio: patch } as never), [])
  const { push, error } = useDebounced<Record<string, unknown>>(save, (a, b) => ({ ...a, ...b }))
  const setGroup = <K extends keyof PortContent>(group: K, value: PortContent[K]) => {
    setStored((s) => ({ ...s, [group]: value }))
    push({ [group]: value })
  }
  const { header, footer, home, about } = content
  const word = 'portfolio'
  const published = pages.filter((p) => p.status === 'published')

  // Header links: the automatic list with the owner's overrides applied.
  const links = navLinks(content, pages, word)
  const saveLinks = (list: typeof links) =>
    setGroup('header', { ...header, links: list.map((l): NavOverride => ({ key: l.key, label: l.label, hidden: l.hidden })) })
  const linkDrag = useRowDrag((from, to) => {
    const next = [...links]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    saveLinks(next)
  })

  // Featured pages: what the owner chose, or every published page before any choice.
  const features: Feature[] = home.features.length
    ? home.features.filter((f) => published.some((p) => p.id === f.pageId))
    : published.map((p) => ({ pageId: p.id, label: '', intro: '', image: '' }))
  const saveFeatures = (list: Feature[]) => setGroup('home', { ...home, features: list })
  const featDrag = useRowDrag((from, to) => {
    const next = [...features]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    saveFeatures(next)
  })
  const notFeatured = published.filter((p) => !features.some((f) => f.pageId === p.id))

  const view = (href: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: sans, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: ink.faint }}>
      Xem trang ↗
    </a>
  )
  const head = (t: string, href?: string) => (
    <div style={{ ...sectionHead, display: 'flex', justifyContent: 'space-between' }}>
      <span>{t}</span>
      {href && view(href)}
    </div>
  )
  const text = (label: string, value: string, set: (v: string) => void, area = false) => (
    <Field label={label}>
      {area ? (
        <textarea style={{ ...boxed, minHeight: 70, resize: 'vertical' }} value={value} onChange={(e) => set(e.target.value)} />
      ) : (
        <input style={boxed} value={value} onChange={(e) => set(e.target.value)} />
      )}
    </Field>
  )
  const grip = <span style={{ cursor: 'grab', color: ink.faint }} aria-label="Kéo để đổi thứ tự">⋮⋮</span>
  const dragProps = (d: ReturnType<typeof useRowDrag>, i: number) => ({
    draggable: true,
    onDragStart: () => d.setFrom(i),
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      d.setOver(i)
    },
    onDrop: () => d.drop(i),
    onDragEnd: d.end,
  })

  return (
    <div style={{ padding: only ? '0 0 20px' : '34px 56px 130px', maxWidth: 1080 }}>
      {error && <div style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {show('header') && (
        <>
      {head('Header')}
      <div style={two}>
        {text('Chữ thương hiệu', header.brand, (v) => setGroup('header', { ...header, brand: v }))}
        {text('Chữ bên phải', header.right, (v) => setGroup('header', { ...header, right: v }))}
      </div>
      <div style={fieldLabel}>Link trên thanh</div>
      {links.map((l, i) => (
        <div key={l.key} {...dragProps(linkDrag, i)} style={{ ...rowBox, display: 'grid', gridTemplateColumns: '20px minmax(0,1fr) 200px 80px', gap: 10, alignItems: 'center', opacity: linkDrag.from === i ? 0.5 : 1 }}>
          {grip}
          <input
            style={small}
            value={l.label}
            onChange={(e) => saveLinks(links.map((x) => (x.key === l.key ? { ...x, label: e.target.value } : x)))}
          />
          <span style={{ fontFamily: sans, fontSize: 12, color: ink.soft }}>{l.href}</span>
          <label style={{ fontFamily: sans, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={!l.hidden} onChange={() => saveLinks(links.map((x) => (x.key === l.key ? { ...x, hidden: !x.hidden } : x)))} />
            Hiện
          </label>
        </div>
      ))}

        </>
      )}

      {show('footer') && (
        <>
      {head('Footer')}
      <div style={two}>
        {text('Chữ bên trái', footer.left, (v) => setGroup('footer', { ...footer, left: v }))}
        {text('Chữ bên phải', footer.right, (v) => setGroup('footer', { ...footer, right: v }))}
      </div>

        </>
      )}

      {show('home') && (
        <>
      {head('Trang tổng', `/${word}`)}
      <div style={two}>
        {text('Tiêu đề', home.title, (v) => setGroup('home', { ...home, title: v }))}
        {text('Giới thiệu', home.intro, (v) => setGroup('home', { ...home, intro: v }), true)}
      </div>
      <div style={fieldLabel}>Trang giới thiệu</div>
      {features.map((f, i) => {
        const page = published.find((p) => p.id === f.pageId)
        const set = (patch: Partial<Feature>) => saveFeatures(features.map((x, j) => (j === i ? { ...x, ...patch } : x)))
        return (
          <div key={f.pageId} {...dragProps(featDrag, i)} style={{ ...rowBox, opacity: featDrag.from === i ? 0.5 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontFamily: sans, fontSize: 13 }}>
              {grip}
              <span style={{ fontFamily: serif, fontSize: 18, flex: 1 }}>{page?.title}</span>
              <button style={{ border: 0, background: 'none', color: ink.faint, cursor: 'pointer', fontSize: 15 }} aria-label="Bỏ khỏi trang tổng" onClick={() => saveFeatures(features.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
            <div style={two}>
              {text('Nhãn', f.label, (v) => set({ label: v }))}
              {text('Mô tả ngắn', f.intro, (v) => set({ intro: v }))}
            </div>
            <ImageField label="Ảnh" value={f.image} onChange={(v) => set({ image: v })} />
          </div>
        )
      })}
      {notFeatured.length > 0 && (
        <select
          style={{ ...small, width: 'auto', marginTop: 4 }}
          value=""
          onChange={(e) => e.target.value && saveFeatures([...features, { pageId: e.target.value, label: '', intro: '', image: '' }])}
        >
          <option value="">+ Thêm trang</option>
          {notFeatured.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      )}

        </>
      )}

      {show('about') && (
        <>
      {head('About', `/${word}/about`)}
      {text('Đoạn chữ phủ ảnh', about.text, (v) => setGroup('about', { ...about, text: v }), true)}
      <div style={fieldLabel}>Nhãn trên ảnh</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            style={small}
            value={about.tags[i] ?? ''}
            onChange={(e) => {
              const tags = [0, 1, 2, 3].map((j) => (j === i ? e.target.value : about.tags[j] ?? ''))
              setGroup('about', { ...about, tags })
            }}
          />
        ))}
      </div>
        </>
      )}

      {show('sign') && (
        <>
      {only ? head('Ký tên', `/${word}/about`) : <div style={fieldLabel}>Ký tên</div>}
      {about.signs.map((sg, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px minmax(0,1fr) 24px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
          <label style={{ fontFamily: sans, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="radio" name="about-sign" checked={about.signUse === i} onChange={() => setGroup('about', { ...about, signUse: i })} />
            Dùng
          </label>
          <input
            style={small}
            value={sg}
            onChange={(e) => setGroup('about', { ...about, signs: about.signs.map((x, j) => (j === i ? e.target.value : x)) })}
          />
          <button
            style={{ border: 0, background: 'none', color: ink.faint, cursor: 'pointer', fontSize: 15 }}
            aria-label="Xoá ký tên"
            onClick={() => {
              const signs = about.signs.filter((_, j) => j !== i)
              // Keep pointing at the same signature when one above it is removed.
              const signUse = about.signUse > i ? about.signUse - 1 : about.signUse === i ? 0 : about.signUse
              setGroup('about', { ...about, signs, signUse })
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button style={{ ...quiet, marginTop: 4, marginBottom: 12 }} onClick={() => setGroup('about', { ...about, signs: [...about.signs, ''] })}>
        + Thêm ký tên
      </button>
        </>
      )}

      {show('about') && (
        <>
      <div style={two}>
        <ImageField label="Ảnh hẹp" value={about.imageLeft} onChange={(v) => setGroup('about', { ...about, imageLeft: v })} />
        <ImageField label="Ảnh chính" value={about.imageRight} onChange={(v) => setGroup('about', { ...about, imageRight: v })} />
      </div>
      <div style={fieldLabel}>Liên hệ</div>
      {about.reach.map((l, i) => {
        const set = (patch: Partial<LinkItem>) =>
          setGroup('about', { ...about, reach: about.reach.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px minmax(0,1fr) 24px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input style={small} value={l.label} placeholder="Nhãn" onChange={(e) => set({ label: e.target.value })} />
            <input style={small} value={l.url} placeholder="Link" onChange={(e) => set({ url: e.target.value })} />
            <button style={{ border: 0, background: 'none', color: ink.faint, cursor: 'pointer', fontSize: 15 }} aria-label="Xoá link" onClick={() => setGroup('about', { ...about, reach: about.reach.filter((_, j) => j !== i) })}>
              ×
            </button>
          </div>
        )
      })}
      <button style={{ ...quiet, marginTop: 4 }} onClick={() => setGroup('about', { ...about, reach: [...about.reach, { label: '', url: '' }] })}>
        + Thêm link
      </button>
        </>
      )}
    </div>
  )
}

// ── tab 3: design system ────────────────────────────────────────────────────

const ROLE_NAMES: Record<TypeRole, string> = {
  d1: 'Tiêu đề lớn 1',
  d2: 'Tiêu đề lớn 2',
  head: 'Tiêu đề',
  title: 'Tiêu đề thẻ',
  body: 'Nội dung',
  read: 'Nội dung dài',
  label: 'Nhãn',
  meta: 'Chú thích',
}

const COLOR_NAMES: Record<keyof Design['colors'], string> = {
  paper: 'Màu nền',
  ink: 'Màu chữ',
  ink2: 'Màu chữ phụ',
  ink3: 'Màu chữ mờ',
  line: 'Màu viền',
  ph: 'Màu khung ảnh',
}

const PALETTE_NAMES: Record<Exclude<keyof Palette, 'name'>, string> = {
  c500: 'Màu nền khối',
  c700: 'Màu nhấn',
  c900: 'Chữ trên nền khối',
  mark: 'Màu đánh dấu',
}

const FONT_ROLE_NAMES = { display: 'Font tiêu đề', body: 'Font nội dung', meta: 'Font giao diện' } as const

const SPACE_NAMES: Record<keyof Design['space'], string> = {
  s1: 'Bậc 1',
  s2: 'Bậc 2',
  s3: 'Bậc 3',
  s4: 'Bậc 4',
  s5: 'Bậc 5',
  s6: 'Khoảng cách khối',
  s7: 'Khoảng cách đầu trang',
  gut: 'Lề trang',
  colGap: 'Khoảng cách cột',
  cardGap: 'Khoảng cách thẻ',
}

const HEX = /^#[0-9a-fA-F]{6}$/

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input type="color" aria-label={label} value={HEX.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: 34, height: 32, padding: 0, border: `1px solid ${paper.rule}` }} />
        <input
          style={small}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (HEX.test(e.target.value)) onChange(e.target.value.toLowerCase())
          }}
        />
      </div>
    </Field>
  )
}

function Num({ label, value, onChange, step = 1 }: { label?: string; value: number; onChange: (v: number) => void; step?: number }) {
  const input = (
    <input style={small} type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  )
  return label ? <Field label={label}>{input}</Field> : input
}

/**
 * The design system document on the left, the token controls on the right.
 * Every change is saved as the default for all port pages and pushed into the
 * document at once, so the owner tunes against the reference itself.
 */
export function DesignTab({
  stored,
  setStored,
  design,
}: {
  stored: Record<string, unknown>
  setStored: (f: (s: Record<string, unknown>) => Record<string, unknown>) => void
  design: Design
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const split = useSplit('design', 420, 'right')
  const [uploading, setUploading] = useState(false)
  const [fontError, setFontError] = useState<string | null>(null)
  const merge2 = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    const out = { ...a }
    for (const [k, v] of Object.entries(b)) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? { ...(out[k] as object), ...(v as object) } : v
    }
    return out
  }
  const save = useCallback((p: Record<string, unknown>) => updatePortDesign(p), [])
  const { push, error } = useDebounced<Record<string, unknown>>(save, merge2)

  /** Change one second-level leaf: `colors.paper`, `type.d1`, `palettes.biz`… */
  const put = (group: keyof Design, key: string, value: unknown) => {
    const patch = { [group]: { [key]: value } }
    setStored((s) => merge2(s, patch))
    push(patch)
  }
  const reset = (group: keyof Design) => {
    setStored((s) => {
      const n = { ...s }
      delete n[group]
      return n
    })
    push({ [group]: null })
  }

  // Keep the embedded document in step with the tokens: on load, and on every change.
  const sendTokens = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      {
        type: 'pf-tokens',
        vars: docVars(design),
        faces: fontFaceCss(design.fonts.files),
        links: fontHrefs(design.fonts.library.filter((f) => !(f in design.fonts.files))),
      },
      '*',
    )
  }, [design])
  useEffect(() => {
    sendTokens()
    const onReady = (e: MessageEvent) => {
      if (e.source === frameRef.current?.contentWindow && e.data?.type === 'pf-doc-ready') sendTokens()
    }
    window.addEventListener('message', onReady)
    return () => window.removeEventListener('message', onReady)
  }, [sendTokens])

  /** Upload a font file and add it as a family — one file, one family, named after the file. */
  const addFont = async (file: File | undefined) => {
    if (!file) return
    setFontError(null)
    setUploading(true)
    try {
      const { url } = await uploadImage(file)
      const family = familyFromFile(file.name)
      put('fonts', 'files', { ...design.fonts.files, [family]: url })
      if (!design.fonts.library.includes(family)) put('fonts', 'library', [...design.fonts.library, family])
    } catch (e) {
      setFontError((e as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const head = (t: string, group: keyof Design) => (
    <div style={{ ...sectionHead, display: 'flex', justifyContent: 'space-between' }}>
      <span>{t}</span>
      {group in stored && (
        <button style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: sans, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: ink.faint }} onClick={() => reset(group)}>
          Mặc định
        </button>
      )}
    </div>
  )
  const sub = (t: string) => <div style={{ ...fieldLabel, marginTop: 14 }}>{t}</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: split.columns, alignItems: 'start' }}>
      <iframe
        ref={frameRef}
        title="Design system"
        srcDoc={docHtml}
        onLoad={sendTokens}
        style={{ width: '100%', height: 'calc(100vh - 220px)', border: 0, background: paper.white, display: 'block', position: 'sticky', top: 0, pointerEvents: split.dragging ? 'none' : undefined }}
      />
      {split.handle}

      <div style={{ padding: '6px 34px 80px 22px', height: 'calc(100vh - 220px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
        {error && <div style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12.5, marginTop: 12 }}>{error}</div>}

        {head('Màu', 'colors')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          {(Object.keys(COLOR_NAMES) as (keyof Design['colors'])[]).map((k) => (
            <Color key={k} label={COLOR_NAMES[k]} value={design.colors[k]} onChange={(v) => put('colors', k, v)} />
          ))}
        </div>

        {head('Bảng màu', 'palettes')}
        {Object.entries(design.palettes).map(([key, p]) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <Field label="Tên">
              <input style={small} value={p.name} onChange={(e) => put('palettes', key, { ...p, name: e.target.value })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              {(Object.keys(PALETTE_NAMES) as (keyof typeof PALETTE_NAMES)[]).map((c) => (
                <Color key={c} label={PALETTE_NAMES[c]} value={p[c]} onChange={(v) => put('palettes', key, { ...p, [c]: v })} />
              ))}
            </div>
            {!(key in DEFAULT_DESIGN.palettes) && (
              <button style={{ ...quiet, border: 0, padding: 0, color: '#8E1E42' }} onClick={() => put('palettes', key, null)}>Xoá bảng màu</button>
            )}
          </div>
        ))}
        <button
          style={quiet}
          onClick={() => {
            let n = Object.keys(design.palettes).length + 1
            while (`p${n}` in design.palettes) n++
            put('palettes', `p${n}`, { ...DEFAULT_DESIGN.palettes.biz, name: `Bảng màu ${n}` })
          }}
        >
          + Thêm bảng màu
        </button>

        {head('Màu ngữ cảnh', 'signal')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Color label="Màu chữ phủ ảnh" value={design.signal.color} onChange={(v) => put('signal', 'color', v)} />
          <Color label="Màu đánh dấu" value={design.signal.mark} onChange={(v) => put('signal', 'mark', v)} />
        </div>

        {head('Kiểu chữ', 'fonts')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button style={{ ...btn, padding: '5px 10px', fontSize: 10 }} disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Đang tải…' : 'Cập nhật'}
          </button>
          <input ref={fileRef} type="file" accept=".woff2,.woff,.ttf,.otf" style={{ display: 'none' }} onChange={(e) => addFont(e.target.files?.[0])} />
          {fontError && <span style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12 }}>{fontError}</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {design.fonts.library.map((f) => (
            <span key={f} style={{ fontFamily: `"${f}"`, fontSize: 15, border: `1px solid ${paper.rule}`, background: paper.white, padding: '4px 8px' }}>
              {f}
              {![design.fonts.display, design.fonts.body, design.fonts.meta].includes(f) && (
                <button
                  style={{ border: 0, background: 'none', cursor: 'pointer', color: ink.faint, marginLeft: 6 }}
                  onClick={() => {
                    put('fonts', 'library', design.fonts.library.filter((x) => x !== f))
                    if (f in design.fonts.files) {
                      const { [f]: _gone, ...rest } = design.fonts.files
                      put('fonts', 'files', rest)
                    }
                  }}
                  aria-label={`Xoá ${f}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
          {(['display', 'body', 'meta'] as const).map((r) => (
            <Field key={r} label={FONT_ROLE_NAMES[r]}>
              <select style={small} value={design.fonts[r]} onChange={(e) => put('fonts', r, e.target.value)}>
                {design.fonts.library.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>
          ))}
        </div>

        {head('Cỡ chữ', 'type')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px 56px 50px 54px', gap: 6, ...fieldLabel, letterSpacing: '.08em' }}>
          <span /><span>Nhỏ nhất</span><span>Lớn nhất</span><span>Độ đậm</span><span>Giãn dòng</span><span>Giãn chữ</span>
        </div>
        {(Object.keys(ROLE_NAMES) as TypeRole[]).map((r) => {
          const t = design.type[r]
          const setT = (patch: Partial<TypeStyle>) => put('type', r, { ...t, ...patch })
          return (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px 56px 50px 54px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: sans, fontSize: 12 }}>{ROLE_NAMES[r]}</span>
              <Num value={t.min} onChange={(n) => setT({ min: n })} />
              <Num value={t.max} onChange={(n) => setT({ max: n })} />
              <select style={small} value={t.weight} onChange={(e) => setT({ weight: Number(e.target.value) })}>
                {[300, 400, 500].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <Num value={t.lh} step={0.05} onChange={(n) => setT({ lh: n })} />
              <Num value={t.track} step={0.005} onChange={(n) => setT({ track: n })} />
            </div>
          )
        })}

        {head('Khoảng cách', 'space')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 6 }}>
          {(['s1', 's2', 's3', 's4', 's5'] as const).map((k) => (
            <Num key={k} label={SPACE_NAMES[k]} value={design.space[k]} onChange={(n) => put('space', k, n)} />
          ))}
        </div>
        {sub('Co giãn theo bề ngang trang')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, ...fieldLabel, letterSpacing: '.08em' }}>
          <span /><span>Nhỏ nhất</span><span>Lớn nhất</span>
        </div>
        {(['s6', 's7', 'gut', 'colGap', 'cardGap'] as const).map((k) => {
          const v = design.space[k] as Fluid
          return (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: sans, fontSize: 12 }}>{SPACE_NAMES[k]}</span>
              <Num value={v.min} onChange={(n) => put('space', k, { ...v, min: n })} />
              <Num value={v.max} onChange={(n) => put('space', k, { ...v, max: n })} />
            </div>
          )
        })}

        {head('Bo góc', 'radius')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Num label="Bo góc nhỏ" value={design.radius.r1} onChange={(n) => put('radius', 'r1', n)} />
          <Num label="Bo góc lớn" value={design.radius.r2} onChange={(n) => put('radius', 'r2', n)} />
        </div>
      </div>
    </div>
  )
}
