import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { garden, ink, paper, sans, serif } from '../../design/tokens'
import { useNav } from '../../lib/nav'
import { Breadcrumbs } from '../../components/Breadcrumbs'
import { useTags } from '../../data/useTags'
import {
  createPortPage,
  deletePortPage,
  getPortfolio,
  updatePortDesign,
  updatePortPage,
  uploadImage,
  type PortPageRecord,
  type PortStatus,
} from '../lib/apiClient'
import { PortfolioView } from '../../portfolio/PortfolioView'
import docHtml from '../../portfolio/design-doc.html?raw'
import { postHref, usePortSources } from '../../portfolio/data'
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

const sectionHead: CSSProperties = {
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

const TABS = [
  { k: 'pages', t: 'Trang port' },
  { k: 'design', t: 'Design system' },
] as const

// ── screen ──────────────────────────────────────────────────────────────────

export function Portfolio() {
  const nav = useNav()
  const tab = nav.portTab
  const [pages, setPages] = useState<PortPageRecord[]>([])
  const [stored, setStored] = useState<Record<string, unknown>>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPortfolio().then(
      (r) => {
        setPages(r.pages)
        setStored(r.design)
        setLoaded(true)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  const design = useMemo(() => resolveDesign(stored), [stored])

  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: '#DDEBF0', color: '#0E2C38', padding: '44px 56px 30px' }}>
        <Breadcrumbs style={{ opacity: 0.75 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 44, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 70, lineHeight: 1, letterSpacing: '-.04em', margin: 0 }}>
              Portfolio
            </h1>
            <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 13.5, lineHeight: 1.5, marginTop: 10, maxWidth: 430, opacity: 0.85 }}>
              Trang portfolio và hệ thiết kế dùng chung cho mọi trang.
            </div>
          </div>
          <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', opacity: 0.7, paddingBottom: 8 }}>
            {pages.length} trang · {pages.filter((p) => p.status === 'published').length} đã đăng
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 26 }}>
          {TABS.map((x) => (
            <div
              key={x.k}
              onClick={() => nav.goPortfolio(x.k)}
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                padding: '10px 18px',
                cursor: 'pointer',
                background: tab === x.k ? ink.base : 'transparent',
                color: tab === x.k ? paper.cream : ink.soft,
              }}
            >
              {x.t}
            </div>
          ))}
        </div>
      </div>
      {error && (
        <div style={{ background: '#FBE7E5', color: '#8E1E42', fontFamily: sans, fontSize: 12.5, padding: '10px 56px' }}>{error}</div>
      )}
      {loaded &&
        (tab === 'design' ? (
          <DesignTab stored={stored} setStored={setStored} design={design} />
        ) : (
          <PagesTab pages={pages} setPages={setPages} design={design} />
        ))}
    </div>
  )
}

// ── tab 1: port pages ───────────────────────────────────────────────────────

function uniqueSlug(base: string, pages: PortPageRecord[]) {
  const taken = new Set(pages.map((p) => p.slug))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

function PagesTab({
  pages,
  setPages,
  design,
}: {
  pages: PortPageRecord[]
  setPages: (f: (p: PortPageRecord[]) => PortPageRecord[]) => void
  design: Design
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | PortStatus>('all')
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const src = usePortSources()
  const open = pages.find((p) => p.id === openId) ?? null

  const create = async (key: PresetKey) => {
    const base = key === 'blank' ? 'trang' : key
    const slug = uniqueSlug(base, pages)
    try {
      const page = await createPortPage({
        slug,
        title: slug,
        blocks: preset(key, src.moduleIds),
        palette: key === 'bibe' ? 'baen' : 'biz',
        sortOrder: pages.length,
      })
      setPages((ps) => [...ps, page])
      setOpenId(page.id)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (open) {
    return (
      <Builder
        key={open.id}
        page={open}
        design={design}
        src={src}
        onBack={() => setOpenId(null)}
        onSaved={(p) => setPages((ps) => ps.map((x) => (x.id === p.id ? p : x)))}
        onDeleted={() => {
          setPages((ps) => ps.filter((x) => x.id !== open.id))
          setOpenId(null)
        }}
      />
    )
  }

  const counts = {
    all: pages.length,
    draft: pages.filter((p) => p.status === 'draft').length,
    published: pages.filter((p) => p.status === 'published').length,
  }
  const shown = filter === 'all' ? pages : pages.filter((p) => p.status === filter)
  const FILTERS: [typeof filter, string][] = [
    ['all', 'Tất cả'],
    ['draft', 'Nháp'],
    ['published', 'Đã đăng'],
    ['archived', 'Lưu trữ'],
  ]

  return (
    <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${paper.rule}`, marginBottom: 4, flexWrap: 'wrap' }}>
        {FILTERS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            aria-pressed={filter === t}
            style={{
              fontFamily: sans,
              fontSize: 11.5,
              padding: '14px 4px',
              marginRight: 26,
              color: filter === t ? ink.base : ink.muted,
              fontWeight: filter === t ? 500 : 400,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${filter === t ? ink.green : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22, position: 'relative' }}>
          {[
            { n: counts.all, label: 'tổng' },
            { n: counts.draft, label: 'nháp' },
            { n: counts.published, label: 'đã đăng' },
          ].map((x) => (
            <div key={x.label} style={{ textAlign: 'right', fontFamily: sans }}>
              <b style={{ fontSize: 15, display: 'block', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{x.n}</b>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.14em', color: ink.faint }}>{x.label}</span>
            </div>
          ))}
          <button
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            style={{
              fontFamily: sans,
              fontSize: 11.5,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              background: ink.green,
              color: '#fff',
              padding: '9px 16px',
              borderRadius: 4,
            }}
          >
            + Trang mới
          </button>
          {menu && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, background: paper.white, border: `1px solid ${paper.rule}`, zIndex: 5, minWidth: 180 }}>
              {([
                ['bibi', 'Từ mẫu bibi'],
                ['bibe', 'Từ mẫu bibe'],
                ['blank', 'Trang trống'],
              ] as [PresetKey, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setMenu(false)
                    void create(k)
                  }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', fontFamily: sans, fontSize: 12.5, padding: '10px 14px', border: 0, background: 'none', cursor: 'pointer', color: ink.base }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <div style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12.5, padding: '10px 0' }}>{error}</div>}
      {shown.map((p) => (
        <PageRow
          key={p.id}
          page={p}
          onOpen={() => setOpenId(p.id)}
          onSaved={(next) => setPages((ps) => ps.map((x) => (x.id === next.id ? next : x)))}
        />
      ))}
    </div>
  )
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

/** One row of the page list: name and status are edited in place, autosaved like everything else (rule 08.3). */
function PageRow({ page, onOpen, onSaved }: { page: PortPageRecord; onOpen: () => void; onSaved: (p: PortPageRecord) => void }) {
  const [title, setTitle] = useState(page.title)
  const save = useCallback((patch: Record<string, unknown>) => updatePortPage(page.id, patch).then(onSaved), [page.id, onSaved])
  const { push, flush, error } = useDebounced<Record<string, unknown>>(save, (a, b) => ({ ...a, ...b }))
  return (
    <div style={{ borderBottom: `1px solid ${paper.rule}`, padding: '10px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 200px 130px 124px', gap: 18, alignItems: 'center' }}>
        <input
          aria-label="Tên trang"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (e.target.value.trim()) push({ title: e.target.value })
          }}
          onBlur={flush}
          style={{ ...boxed, fontFamily: serif, fontSize: 24, background: 'transparent', border: '1px solid transparent', padding: '4px 6px' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = paper.rule)}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'transparent')}
        />
        <span style={{ fontFamily: sans, fontSize: 12, color: ink.soft }}>/portfolio/{page.slug}</span>
        <span>
          <StatusSelect pill value={page.status} onChange={(status) => save({ status })} />
        </span>
        <button style={{ ...quiet, padding: '7px 10px', whiteSpace: 'nowrap' }} onClick={onOpen}>xếp trang →</button>
      </div>
      {error && <div style={{ color: '#B33', fontFamily: sans, fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  )
}

type Sources = ReturnType<typeof usePortSources>

function Builder({
  page,
  design,
  src,
  onBack,
  onSaved,
  onDeleted,
}: {
  page: PortPageRecord
  design: Design
  src: Sources
  onBack: () => void
  onSaved: (p: PortPageRecord) => void
  onDeleted: () => void
}) {
  const [draft, setDraft] = useState({ ...page, blocks: parseBlocks(page.blocks) })
  const [active, setActive] = useState<string | null>(null)
  const { tags } = useTags()

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

  const move = (i: number, by: -1 | 1) => {
    const to = i + by
    if (to < 0 || to >= draft.blocks.length) return
    const next = [...draft.blocks]
    ;[next[i], next[to]] = [next[to], next[i]]
    setBlocks(next)
  }
  const setType = (id: string, type: BlockType) =>
    setBlocks(draft.blocks.map((b) => (b.id === id ? convertBlock(b, type, src.moduleIds[0]) : b)))

  const remove = async () => {
    if (!window.confirm(`Xoá trang “${draft.title}”?`)) return
    await deletePortPage(page.id)
    onDeleted()
  }

  // Clicking a block in the preview opens that same block in the left column.
  useEffect(() => {
    if (!active) return
    document.getElementById(`pf-row-${active}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 420px) minmax(0,1fr)', alignItems: 'start' }}>
      <div style={{ padding: '22px 22px 80px 56px', height: 'calc(100vh - 160px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
        <button style={{ ...quiet, border: 0, padding: 0, marginBottom: 14 }} onClick={onBack}>← tất cả trang</button>
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
          <button style={{ ...quiet, border: 0, padding: 0, color: '#B33' }} onClick={remove}>xoá trang</button>
          {error && <span style={{ color: '#B33' }}>{error}</span>}
        </div>

        <div style={sectionHead}>Khối</div>
        {draft.blocks.map((b, i) => (
          <div
            key={b.id}
            id={`pf-row-${b.id}`}
            style={{
              border: `1px solid ${active === b.id ? ink.base : paper.rule}`,
              background: paper.white,
              marginBottom: 6,
            }}
          >
            <div
              onClick={() => setActive(active === b.id ? null : b.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', cursor: 'pointer', fontFamily: sans, fontSize: 12.5 }}
            >
              <span style={{ fontFamily: sans, fontSize: 10, color: ink.faint, width: 16 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ flex: 1 }}>
                {BLOCK_NAMES[b.type]}
                <span style={{ color: ink.faint }}>{summary(b, src.moduleTitles)}</span>
              </span>
              {([-1, 1] as const).map((by) => (
                <button
                  key={by}
                  disabled={i + by < 0 || i + by >= draft.blocks.length}
                  style={{ border: 0, background: 'none', color: ink.faint, cursor: 'pointer', fontSize: 13, padding: '0 3px', opacity: i + by < 0 || i + by >= draft.blocks.length ? 0.3 : 1 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    move(i, by)
                  }}
                  aria-label={by < 0 ? 'lên' : 'xuống'}
                >
                  {by < 0 ? '↑' : '↓'}
                </button>
              ))}
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
      </div>

      <div style={{ borderLeft: `1px solid ${paper.rule}`, height: 'calc(100vh - 160px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
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
        />
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

// ── tab 2: design system ────────────────────────────────────────────────────

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
function DesignTab({
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(360px, 420px)', alignItems: 'start' }}>
      <iframe
        ref={frameRef}
        title="Design system"
        srcDoc={docHtml}
        onLoad={sendTokens}
        style={{ width: '100%', height: 'calc(100vh - 220px)', border: 0, borderRight: `1px solid ${paper.rule}`, background: paper.white, display: 'block', position: 'sticky', top: 0 }}
      />

      <div style={{ padding: '6px 56px 80px 26px', height: 'calc(100vh - 220px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
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
