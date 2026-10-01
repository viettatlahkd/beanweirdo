import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ink, paper, sans, serif } from '../../design/tokens'
import { useNav } from '../../lib/nav'
import { useTags } from '../../data/useTags'
import {
  createPortPage,
  deletePortPage,
  getPortfolio,
  updatePortDesign,
  updatePortPage,
  type PortPageRecord,
  type PortStatus,
} from '../lib/apiClient'
import { useRowDrag } from '../lib/useRowDrag'
import { PortfolioView } from '../../portfolio/PortfolioView'
import { postHref, usePortSources } from '../../portfolio/data'
import {
  BLOCK_DS,
  BLOCK_NAMES,
  BLOCK_ORDER,
  newBlock,
  parseBlocks,
  preset,
  type Block,
  type PortPost,
  type PresetKey,
  type Source,
  type SourceMode,
} from '../../portfolio/blocks'
import {
  DEFAULT_DESIGN,
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
      <div style={{ background: '#DDEBF0', color: '#0E2C38', padding: '44px 56px 0' }}>
        <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 70, lineHeight: 1, letterSpacing: '-.04em', margin: 0 }}>
          Portfolio
        </h1>
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
      {error && <div style={{ padding: '14px 56px', color: '#B33', fontFamily: sans, fontSize: 13 }}>{error}</div>}
      {loaded &&
        (tab === 'design' ? (
          <DesignTab stored={stored} setStored={setStored} design={design} pages={pages} />
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

  return (
    <div style={{ padding: '30px 56px 80px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={btn} onClick={() => create('bibi')}>+ từ bibi</button>
        <button style={btn} onClick={() => create('bibe')}>+ từ bibe</button>
        <button style={quiet} onClick={() => create('blank')}>+ trang trống</button>
      </div>
      {error && <div style={{ color: '#B33', fontFamily: sans, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={sectionHead}>{pages.length} trang</div>
      {pages.map((p) => (
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

const STATUS_NAMES: Record<PortStatus, string> = {
  draft: 'nháp',
  published: 'đã đăng',
  archived: 'lưu trữ',
}
const STATUS_COLORS: Record<PortStatus, string> = {
  draft: ink.soft,
  published: ink.green,
  archived: ink.faint,
}

function StatusSelect({ value, onChange, style }: { value: PortStatus; onChange: (s: PortStatus) => void; style?: CSSProperties }) {
  return (
    <select style={{ ...boxed, ...style }} value={value} onChange={(e) => onChange(e.target.value as PortStatus)}>
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
        <StatusSelect
          value={page.status}
          onChange={(status) => save({ status })}
          style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: STATUS_COLORS[page.status], padding: '6px 8px' }}
        />
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

  const drag = useRowDrag((from, to) => {
    const next = [...draft.blocks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setBlocks(next)
  })

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
              <span style={{ cursor: 'grab', color: ink.faint }}>⋮⋮</span>
              <span style={{ flex: 1 }}>
                {BLOCK_NAMES[b.type]}
                <span style={{ color: ink.faint }}> · {BLOCK_DS[b.type]}{summary(b, src.moduleTitles)}</span>
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
                <BlockFields block={b} onChange={(p) => patchBlock(b.id, p)} src={src} tags={tags} />
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {BLOCK_ORDER.map((t) => (
            <button
              key={t}
              style={quiet}
              onClick={() => {
                const b = newBlock(t, src.moduleIds[0])
                setBlocks([...draft.blocks, b])
                setActive(b.id)
              }}
            >
              + {BLOCK_NAMES[t]}
            </button>
          ))}
        </div>
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
  d1: 'cỡ 1 · tiêu đề trang',
  d2: 'cỡ 2 · câu lớn',
  head: 'cỡ 3 · tiêu đề phụ',
  title: 'cỡ 4 · tiêu đề thẻ',
  body: 'cỡ 5 · đoạn văn',
  read: 'cỡ 5b · bài đọc dài',
  label: 'cỡ 6 · nhãn',
  meta: 'cỡ 7 · số, ngày',
}

const COLOR_NAMES: Record<keyof Design['colors'], string> = {
  paper: 'Nền',
  ink: 'Chữ',
  ink2: 'Chữ phụ',
  ink3: 'Meta',
  line: 'Đường kẻ',
  ph: 'Ô ảnh trống',
}

const HEX = /^#[0-9a-fA-F]{6}$/

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input type="color" value={HEX.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: 34, height: 32, padding: 0, border: `1px solid ${paper.rule}` }} />
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

function DesignTab({
  stored,
  setStored,
  design,
  pages,
}: {
  stored: Record<string, unknown>
  setStored: (f: (s: Record<string, unknown>) => Record<string, unknown>) => void
  design: Design
  pages: PortPageRecord[]
}) {
  const src = usePortSources()
  const [newFont, setNewFont] = useState('')
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

  const sample = pages[0]
  const sampleBlocks = useMemo(() => (sample ? parseBlocks(sample.blocks) : preset('bibi', src.moduleIds)), [sample, src.moduleIds])
  const head = (t: string, group: keyof Design) => (
    <div style={{ ...sectionHead, display: 'flex', justifyContent: 'space-between' }}>
      <span>{t}</span>
      {group in stored && (
        <button style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: sans, fontSize: 10, letterSpacing: '.14em', color: ink.faint }} onClick={() => reset(group)}>
          MẶC ĐỊNH
        </button>
      )}
    </div>
  )

  const fl = (g: 'space', k: keyof Design['space']) => {
    const v = design.space[k] as Fluid
    return (
      <div key={k} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: sans, fontSize: 12 }}>{k}</span>
        <Num value={v.min} onChange={(n) => put(g, k, { ...v, min: n })} />
        <Num value={v.max} onChange={(n) => put(g, k, { ...v, max: n })} />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 460px) minmax(0,1fr)', alignItems: 'start' }}>
      <div style={{ padding: '6px 22px 80px 56px', height: 'calc(100vh - 160px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
        {error && <div style={{ color: '#B33', fontFamily: sans, fontSize: 13, marginTop: 12 }}>{error}</div>}

        {head('Màu', 'colors')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          {(Object.keys(COLOR_NAMES) as (keyof Design['colors'])[]).map((k) => (
            <Color key={k} label={COLOR_NAMES[k]} value={design.colors[k]} onChange={(v) => put('colors', k, v)} />
          ))}
        </div>

        {head('Bảng màu nhánh', 'palettes')}
        {Object.entries(design.palettes).map(([key, p]) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <Field label={`Tên · ${key}`}>
              <input style={small} value={p.name} onChange={(e) => put('palettes', key, { ...p, name: e.target.value })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              {(['c500', 'c700', 'c900', 'mark'] as (keyof Palette)[]).filter((x) => x !== 'name').map((c) => (
                <Color
                  key={c}
                  label={{ c500: '500 · dải nền', c700: '700 · chữ nhấn', c900: '900 · chữ trên dải', mark: 'mark · bút hili', name: '' }[c]}
                  value={p[c]}
                  onChange={(v) => put('palettes', key, { ...p, [c]: v })}
                />
              ))}
            </div>
            {!(key in DEFAULT_DESIGN.palettes) && (
              <button style={{ ...quiet, border: 0, padding: 0, color: '#B33' }} onClick={() => put('palettes', key, null)}>bỏ bảng màu</button>
            )}
          </div>
        ))}
        <button
          style={quiet}
          onClick={() => {
            let n = Object.keys(design.palettes).length + 1
            while (`p${n}` in design.palettes) n++
            put('palettes', `p${n}`, { ...DEFAULT_DESIGN.palettes.biz, name: `p${n}` })
          }}
        >
          + bảng màu
        </button>

        {head('Màu ngữ cảnh', 'signal')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Color label="Chữ đè" value={design.signal.color} onChange={(v) => put('signal', 'color', v)} />
          <Color label="Bút hili" value={design.signal.mark} onChange={(v) => put('signal', 'mark', v)} />
        </div>

        {head('Font', 'fonts')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {design.fonts.library.map((f) => (
            <span key={f} style={{ fontFamily: `"${f}"`, fontSize: 15, border: `1px solid ${paper.rule}`, background: paper.white, padding: '4px 8px' }}>
              {f}
              {![design.fonts.display, design.fonts.body, design.fonts.meta].includes(f) && (
                <button
                  style={{ border: 0, background: 'none', cursor: 'pointer', color: ink.faint, marginLeft: 6 }}
                  onClick={() => put('fonts', 'library', design.fonts.library.filter((x) => x !== f))}
                  aria-label={`bỏ ${f}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <input style={small} placeholder="tên trên Google Fonts" value={newFont} onChange={(e) => setNewFont(e.target.value)} />
          <button
            style={btn}
            onClick={() => {
              const f = newFont.trim()
              if (f && !design.fonts.library.includes(f)) put('fonts', 'library', [...design.fonts.library, f])
              setNewFont('')
            }}
          >
            thêm
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {(['display', 'body', 'meta'] as const).map((r) => (
            <Field key={r} label={{ display: 'Tiêu đề · cỡ 1–4', body: 'Chữ đọc · cỡ 5', meta: 'Nhãn, số · cỡ 6–7' }[r]}>
              <select style={small} value={design.fonts[r]} onChange={(e) => put('fonts', r, e.target.value)}>
                {design.fonts.library.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>
          ))}
        </div>

        {head('Cỡ chữ', 'type')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px 56px 52px 58px', gap: 6, ...fieldLabel }}>
          <span>vai</span><span>nhỏ</span><span>lớn</span><span>nét</span><span>dòng</span><span>khoảng</span>
        </div>
        {(Object.keys(ROLE_NAMES) as TypeRole[]).map((r) => {
          const t = design.type[r]
          const setT = (patch: Partial<TypeStyle>) => put('type', r, { ...t, ...patch })
          return (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px 56px 52px 58px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 10 }}>
          {(['s1', 's2', 's3', 's4', 's5'] as const).map((k) => (
            <Num key={k} label={k} value={design.space[k]} onChange={(n) => put('space', k, n)} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 8, ...fieldLabel }}>
          <span /><span>nhỏ</span><span>lớn</span>
        </div>
        {(['s6', 's7', 'gut', 'colGap', 'cardGap'] as const).map((k) => fl('space', k))}

        {head('Bo góc', 'radius')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Num label="Nhỏ · tag, nút" value={design.radius.r1} onChange={(n) => put('radius', 'r1', n)} />
          <Num label="Lớn · ảnh, khung" value={design.radius.r2} onChange={(n) => put('radius', 'r2', n)} />
        </div>
      </div>

      <div style={{ borderLeft: `1px solid ${paper.rule}`, height: 'calc(100vh - 160px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
        <PortfolioView
          title={sample?.title ?? 'bibi'}
          intro={sample?.intro ?? ''}
          palette={sample?.palette ?? 'biz'}
          blocks={sampleBlocks}
          design={design}
          posts={src.posts}
          moduleTitles={src.moduleTitles}
          postHref={postHref}
        />
      </div>
    </div>
  )
}
