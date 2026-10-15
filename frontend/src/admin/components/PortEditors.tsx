import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ScaledPreview } from './ScaledPreview'
import { Choice, Row, Section, desk } from './Detail'
import { Button, IconButton } from '../../design/Button'
import { IconClose, IconGrip, IconPlus } from '../../design/icons'
import { ColorRow, STATUS_CHOICES } from './NodeFields'
import { ink, paper, sans, serif } from '../../design/tokens'
import { useRowDrag } from '../lib/useRowDrag'
import { freeSlug, titleSlug } from '../../lib/postSlug'
import { portSiteOf } from '../../lib/routes'
import type { PostSite } from 'api-contract'
import { useTags } from '../../data/useTags'
import {
  createNode,
  getPortDesign,
  listNodes,
  updatePortDesign,
  updateNode,
  updateSite,
  getSite,
  uploadImage,
  type Node,
} from '../lib/apiClient'
import { PortfolioView } from '../../portfolio/PortfolioView'
import docHtml from '../../portfolio/design-doc.html?raw'
import { buildChrome, onwardOf, usePortSources, usePostHref } from '../../portfolio/data'
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
  fontSize: 14,
  fontWeight: 600,
  color: ink.base,
  borderBottom: `2px solid ${ink.base}`,
  paddingBottom: 9,
  margin: '28px 0 16px',
}
const fieldLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 13,
  fontWeight: 600,
  color: ink.strong,
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
        background: dragging ? ink.soft : paper.rule,
        borderLeft: `3px solid ${paper.cream}`,
        borderRight: `3px solid ${paper.cream}`,
        touchAction: 'none',
      }}
    />
  )
  return { size, columns, handle, dragging }
}

// ── screen ──────────────────────────────────────────────────────────────────

/** Port pages, the design system and the fixed copy — what every port editor reads. */
export function usePortAdmin() {
  const [pages, setPages] = useState<Node[]>([])
  const [stored, setStored] = useState<Record<string, unknown>>({})
  const [contentStored, setContentStored] = useState<Record<string, unknown>>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listNodes('port'), getPortDesign(), getSite()]).then(
      ([nodes, design, site]) => {
        setPages(nodes)
        setStored(design)
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

const uniqueSlug = (base: string, pages: Node[]) => freeSlug(base, new Set(pages.map((p) => p.slug)))

/** What a new port page can start from, wherever one is made. */
export const PRESET_CHOICES: { value: PresetKey; label: string }[] = [
  { value: 'bibi', label: 'mẫu bibi' },
  { value: 'bibe', label: 'mẫu bibe' },
  { value: 'blank', label: 'trang trống' },
]

/** A new port page from a preset, named by the owner; it starts as a draft at the end of the list. */
export async function createFromPreset(key: PresetKey, title: string, pages: Node[], moduleIds: string[], parentId: string | null = null): Promise<Node> {
  const slug = uniqueSlug(titleSlug(title) || (key === 'blank' ? 'trang' : key), pages)
  return createNode({ site: 'port', slug, title, parent_id: parentId, blocks: preset(key, moduleIds), look: key === 'bibe' ? 'baen' : 'biz', status: 'draft' })
}

type Sources = ReturnType<typeof usePortSources>

export function Builder({
  page,
  design,
  src,
  content,
  pages,
  onSaved,
  previewSlot,
  flags,
}: {
  page: Node
  design: Design
  src: Sources
  content: PortContent
  pages: Node[]
  onSaved: (p: Node) => void
  /** The fields are drawn here and the live page goes to this element, Cấu hình's preview column. */
  previewSlot: HTMLElement | null
  /** Hiện trên menu / Hiện ở trang chủ, which live in the port's shared copy, not on the page. */
  flags?: ReactNode
}) {
  const [draft, setDraft] = useState({ ...page, blocks: parseBlocks(page.blocks) })
  const [active, setActive] = useState<string | null>(null)
  const { tags } = useTags()
  const site = portSiteOf(page, pages)
  const postHref = usePostHref(site)

  const save = useCallback(
    (patch: Record<string, unknown>) => updateNode(page.id, patch).then(onSaved),
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
      <Section title="Thông tin">
        <ColorRow node={draft} used={[...new Set(pages.map((p) => p.accent).filter((c): c is string => !!c))]} save={(patch) => set(patch as Partial<typeof draft>)} />
        <Row label="Lời dẫn">
          <textarea aria-label="Lời dẫn" style={{ ...boxed, minHeight: 44, resize: 'vertical' }} value={draft.intro} placeholder="bấm để viết lời dẫn…" onChange={(e) => set({ intro: e.target.value })} />
        </Row>
        <Row label="Đường dẫn">
          <input
            aria-label="Đường dẫn"
            style={{ ...boxed, fontFamily: 'ui-monospace, Menlo, monospace' }}
            value={draft.slug}
            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          />
        </Row>
        <Row label="Giao diện">
          <select aria-label="Giao diện" style={boxed} value={draft.look ?? 'biz'} onChange={(e) => set({ look: e.target.value })}>
            {Object.entries(design.palettes).map(([k, p]) => (
              <option key={k} value={k}>{p.name}</option>
            ))}
          </select>
        </Row>
        <Row label="Trạng thái">
          <Choice label="Trạng thái" options={STATUS_CHOICES} value={draft.status} onChange={(status) => set({ status })} />
        </Row>
        {flags}
        {error && <div style={{ color: ink.danger, fontFamily: sans, fontSize: 12, paddingTop: 6 }}>{error}</div>}
      </Section>

      <Section title="Nội dung trang" note={`${draft.blocks.length} khối · kéo ⠿ để xếp, bấm để sửa`}>
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
              borderTop: i ? `1px solid ${desk.line}` : 'none',
              background: drag.over === i && drag.from !== i ? desk.soft : active === b.id ? paper.hover : 'transparent',
              boxShadow: drag.over === i && drag.from !== i ? `inset 0 3px 0 ${ink.green}` : 'none',
              opacity: drag.from === i ? 0.5 : 1,
            }}
          >
            <div
              onClick={() => setActive(active === b.id ? null : b.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', cursor: 'pointer', fontFamily: sans, fontSize: 14 }}
            >
              <span className="ab-grip" aria-label="Kéo để đổi thứ tự">
                <IconGrip size={14} />
              </span>
              <span style={{ fontSize: 12.5, color: ink.soft, width: 20, fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
              {/* A chip per block kind, so a page of eight blocks can be read by type at a glance. */}
              <span style={{ ...BLOCK_CHIP[b.type], fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{BLOCK_NAMES[b.type]}</span>
              <span style={{ flex: 1, minWidth: 0, color: ink.strong, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary(b, src.moduleTitles).replace(/^ · /, '')}</span>
              <IconButton
                size="sm"
                label="bỏ khối"
                onClick={(e) => {
                  e.stopPropagation()
                  setBlocks(draft.blocks.filter((x) => x.id !== b.id))
                }}
              >
                <IconClose size={14} />
              </IconButton>
            </div>
            {active === b.id && (
              <div style={{ padding: '4px 4px 10px 26px' }}>
                <Field label="Component">
                  <select style={small} value={b.type} onChange={(e) => setType(b.id, e.target.value as BlockType)}>
                    {BLOCK_ORDER.map((t) => (
                      <option key={t} value={t}>{BLOCK_NAMES[t]}</option>
                    ))}
                  </select>
                </Field>
                <BlockFields block={b} onChange={(p) => patchBlock(b.id, p)} src={src} tags={tags} site={site} />
              </div>
            )}
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <Button
            level="add"
            icon={<IconPlus size={14} />}
            onClick={() => {
              const b = newBlock('cards', src.moduleIds[0])
              setBlocks([...draft.blocks, b])
              setActive(b.id)
            }}
          >
            Thêm khối
          </Button>
        </div>
      </Section>
    </>
  )
  const view = (
        <PortfolioView
          title={page.title}
          intro={draft.intro}
          palette={draft.look ?? 'biz'}
          blocks={draft.blocks}
          design={design}
          posts={src.posts}
          moduleTitles={src.moduleTitles}
          postHref={postHref}
          onward={onwardOf(page)}
          activeId={active}
          onPick={setActive}
          chrome={buildChrome(content, pages.map((p) => (p.id === draft.id ? { ...p, title: page.title, slug: draft.slug, status: draft.status } : p)), `page:${draft.id}`)}
        />
  )

  return (
    <div style={{ padding: '4px 0 20px' }}>
      {fields}
      {previewSlot &&
        createPortal(
          <ScaledPreview>
            <div style={{ height: '100%', overflowY: 'auto' }}>{view}</div>
          </ScaledPreview>,
          previewSlot,
        )}
    </div>
  )
}

/** Each kind's chip: the garden tints the blog already uses, dark ink of the same hue on top. */
const BLOCK_CHIP: Record<BlockType, { background: string; color: string }> = {
  head: { background: '#FBE7E5', color: '#8E3A40' },
  opening: { background: '#F3DCAE', color: '#6B4510' },
  cards: { background: '#F1EEE6', color: '#4B463A' },
  slider: { background: '#CFE4EE', color: '#1E5770' },
  series: { background: '#F9EBD2', color: '#7A5212' },
  story: { background: '#E4F0DF', color: '#2B4B33' },
  about: { background: '#EDE7F3', color: '#4E3D68' },
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
    case 'site':
      return `bài tick ${SITE_NAMES[s.site]}`
    default:
      return 'mới nhất'
  }
}

const SITE_NAMES: Record<PostSite, string> = { biz: 'biz', bean: 'bean', blog: 'personal blog' }

const MODE_NAMES: Record<SourceMode, string> = {
  site: 'Bài tick trang này',
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
  site,
}: {
  source: Source
  onChange: (s: Source) => void
  src: Sources
  tags: { id: string; label: string }[]
  /** The site of the page being edited — "bài tick trang này" starts on it. */
  site: PostSite
}) {
  const limit = 'limit' in source ? source.limit : 6
  const change = (mode: SourceMode) => {
    if (mode === 'site') onChange({ mode, site, limit })
    else if (mode === 'module') onChange({ mode, moduleId: src.moduleIds[0] ?? '', limit })
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
        ) : source.mode === 'site' ? (
          <Field label="Trang">
            <select style={small} value={source.site} onChange={(e) => onChange({ ...source, site: e.target.value as PostSite })}>
              {(Object.keys(SITE_NAMES) as PostSite[]).map((id) => (
                <option key={id} value={id}>{SITE_NAMES[id]}</option>
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
              <span style={{ width: 16, color: ink.soft }}>{n >= 0 ? n + 1 : ''}</span>
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
  site,
}: {
  block: Block
  onChange: (p: Partial<Block>) => void
  src: Sources
  tags: { id: string; label: string }[]
  site: PostSite
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
    <SourceFields source={block.source} onChange={(s) => onChange({ source: s } as Partial<Block>)} src={src} tags={tags} site={site} />
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
        <Button size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? 'Đang tải…' : 'Tải ảnh'}
        </Button>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {err && <div style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12, marginTop: 4 }}>{err}</div>}
    </Field>
  )
}

const two: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0 22px' }
const rowBox: CSSProperties = { borderTop: `1px solid ${paper.rule}`, padding: '10px 0 6px' }
/** "+ Thêm …" sits on its own line under the list it adds to. */
const addLine: CSSProperties = { marginTop: 8 }

const NEW = '__new'

/**
 * "+ Thêm khối" under the home blocks: a page already made but not on the
 * home yet, or a new page made right here. Either way the page's own "Hiện ở
 * trang chủ" ends up on, since that switch is the same list.
 */
function AddFeature({ pages, onAdd, onNewPage }: { pages: Node[]; onAdd: (pageId: string) => void; onNewPage: (name: string, preset: PresetKey) => Promise<Node> }) {
  const [open, setOpen] = useState(false)
  const [which, setWhich] = useState(NEW)
  const [name, setName] = useState('')
  const [from, setFrom] = useState<PresetKey>('bibi')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const close = () => {
    setOpen(false)
    setName('')
    setErr('')
  }
  const ready = which !== NEW || !!name.trim()
  const save = async () => {
    if (!ready || busy) return
    if (which !== NEW) {
      onAdd(which)
      return close()
    }
    setBusy(true)
    try {
      onAdd((await onNewPage(name.trim(), from)).id)
      close()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  if (!open)
    return (
      <div style={addLine}>
        <Button
          level="add"
          icon={<IconPlus />}
          onClick={() => {
            setWhich(pages[0]?.id ?? NEW)
            setOpen(true)
          }}
        >
          Thêm khối
        </Button>
      </div>
    )
  const label = { fontFamily: sans, fontSize: 13, fontWeight: 600, color: ink.strong }
  return (
    <div style={{ ...rowBox, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, ...label }}>
        Trang <Choice label="Trang cho khối mới" options={[...pages.map((p) => ({ value: p.id, label: p.title })), { value: NEW, label: '+ Trang mới' }]} value={which} onChange={setWhich} />
      </div>
      {which === NEW && (
        <>
          <input
            autoFocus
            aria-label="Tên trang mới"
            placeholder="tên trang mới"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' ? void save() : e.key === 'Escape' && close())}
            style={{ ...boxed, maxWidth: 420 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, ...label }}>
            bắt đầu từ <Choice label="bắt đầu từ" options={PRESET_CHOICES} value={from} onChange={setFrom} />
          </div>
        </>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button level="primary" disabled={!ready || busy} onClick={() => void save()}>
          {busy ? 'Đang tạo…' : 'Lưu'}
        </Button>
        <Button level="quiet" onClick={close}>
          Huỷ
        </Button>
      </div>
      {err && <div style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12.5 }}>{err}</div>}
    </div>
  )
}

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
  onNewPage,
}: {
  content: PortContent
  setStored: (f: (s: Record<string, unknown>) => Record<string, unknown>) => void
  pages: Node[]
  /** Makes a port page from the home's "+ Thêm khối"; it starts as a draft, as one made in Mục lục does. */
  onNewPage: (name: string, preset: PresetKey) => Promise<Node>
  /** The part Cấu hình has open; its heading and address are the detail template's. */
  only: PortPart
}) {
  const show = (part: PortPart) => only === part
  const save = useCallback((patch: Record<string, unknown>) => updateSite({ portfolio: patch } as never), [])
  const { push, error } = useDebounced<Record<string, unknown>>(save, (a, b) => ({ ...a, ...b }))
  const setGroup = <K extends keyof PortContent>(group: K, value: PortContent[K]) => {
    setStored((s) => ({ ...s, [group]: value }))
    push({ [group]: value })
  }
  const { header, footer, home, about } = content
  const published = pages.filter((p) => p.status === 'published')

  // Header links: the automatic list with the owner's overrides applied.
  const links = navLinks(content, pages)
  const saveLinks = (list: typeof links) =>
    setGroup('header', { ...header, links: list.map((l): NavOverride => ({ key: l.key, label: l.label, hidden: l.hidden })) })

  // Featured pages: what the owner chose, or every published page before any choice.
  // A draft keeps its block here, so one added from "+ Thêm khối" is ready the day
  // it is published; the public home skips it until then (homeCards).
  const kept = pages.filter((p) => p.status !== 'archived')
  const features: Feature[] = home.features.length
    ? home.features.filter((f) => kept.some((p) => p.id === f.pageId))
    : published.map((p) => ({ pageId: p.id, label: '', intro: '', image: '' }))
  const addFeature = (pageId: string) => saveFeatures([...features, { pageId, label: '', intro: '', image: '' }])
  const saveFeatures = (list: Feature[]) => setGroup('home', { ...home, features: list })
  const featDrag = useRowDrag((from, to) => {
    const next = [...features]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    saveFeatures(next)
  })

  const text = (label: string, value: string, set: (v: string) => void, area = false) => (
    <Field label={label}>
      {area ? (
        <textarea style={{ ...boxed, minHeight: 70, resize: 'vertical' }} value={value} onChange={(e) => set(e.target.value)} />
      ) : (
        <input style={boxed} value={value} onChange={(e) => set(e.target.value)} />
      )}
    </Field>
  )
  const grip = (
    <span className="ab-grip" aria-label="Kéo để đổi thứ tự">
      <IconGrip size={14} />
    </span>
  )
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
    <div style={{ padding: '6px 0 20px', maxWidth: 1080 }}>
      {error && <div style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {show('header') && (
        <>
      <div style={two}>
        {text('Chữ thương hiệu', header.brand, (v) => setGroup('header', { ...header, brand: v }))}
        {text('Chữ bên phải', header.right, (v) => setGroup('header', { ...header, right: v }))}
      </div>
      {/* The order is set by dragging in Mục lục, as the blog's sidebar is; here only the words and whether each shows. */}
      <div style={fieldLabel}>Link trên thanh · thứ tự kéo ở Mục lục</div>
      {links.map((l) => (
        <div key={l.key} style={{ ...rowBox, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 200px 80px', gap: 10, alignItems: 'center' }}>
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
      <div style={two}>
        {text('Chữ bên trái', footer.left, (v) => setGroup('footer', { ...footer, left: v }))}
        {text('Chữ bên phải', footer.right, (v) => setGroup('footer', { ...footer, right: v }))}
      </div>

        </>
      )}

      {show('home') && (
        <>
      <div style={two}>
        {text('Tiêu đề', home.title, (v) => setGroup('home', { ...home, title: v }))}
        {text('Giới thiệu', home.intro, (v) => setGroup('home', { ...home, intro: v }), true)}
      </div>
      <div style={fieldLabel}>Khối trên trang chủ · mỗi khối là một trang port, kéo để đổi thứ tự</div>
      {features.map((f, i) => {
        const page = kept.find((p) => p.id === f.pageId)
        const set = (patch: Partial<Feature>) => saveFeatures(features.map((x, j) => (j === i ? { ...x, ...patch } : x)))
        return (
          <div key={f.pageId} {...dragProps(featDrag, i)} style={{ ...rowBox, opacity: featDrag.from === i ? 0.5 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontFamily: sans, fontSize: 13 }}>
              {grip}
              <span style={{ fontFamily: serif, fontSize: 18, flex: 1 }}>
                {page?.title}
                {page?.status === 'draft' && <span style={{ fontFamily: sans, fontSize: 12, color: ink.soft, marginLeft: 10 }}>nháp · hiện khi trang được đăng</span>}
              </span>
              <IconButton size="sm" label="Bỏ khỏi trang tổng" onClick={() => saveFeatures(features.filter((_, j) => j !== i))}>
                <IconClose size={14} />
              </IconButton>
            </div>
            <div style={two}>
              {text('Nhãn', f.label, (v) => set({ label: v }))}
              {text('Mô tả ngắn', f.intro, (v) => set({ intro: v }))}
            </div>
            <ImageField label="Ảnh" value={f.image} onChange={(v) => set({ image: v })} />
          </div>
        )
      })}
      <AddFeature pages={kept.filter((p) => !features.some((f) => f.pageId === p.id))} onAdd={addFeature} onNewPage={onNewPage} />

        </>
      )}

      {show('about') && (
        <>
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
      {about.signs.map((sg, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px minmax(0,1fr) 28px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
          <label style={{ fontFamily: sans, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="radio" name="about-sign" checked={about.signUse === i} onChange={() => setGroup('about', { ...about, signUse: i })} />
            Dùng
          </label>
          <input
            style={small}
            value={sg}
            onChange={(e) => setGroup('about', { ...about, signs: about.signs.map((x, j) => (j === i ? e.target.value : x)) })}
          />
          <IconButton
            size="sm"
            label="Xoá ký tên"
            onClick={() => {
              const signs = about.signs.filter((_, j) => j !== i)
              // Keep pointing at the same signature when one above it is removed.
              const signUse = about.signUse > i ? about.signUse - 1 : about.signUse === i ? 0 : about.signUse
              setGroup('about', { ...about, signs, signUse })
            }}
          >
            <IconClose size={14} />
          </IconButton>
        </div>
      ))}
      <div style={addLine}>
        <Button level="add" icon={<IconPlus size={14} />} onClick={() => setGroup('about', { ...about, signs: [...about.signs, ''] })}>
          Thêm ký tên
        </Button>
      </div>
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
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px minmax(0,1fr) 28px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input style={small} value={l.label} placeholder="Nhãn" onChange={(e) => set({ label: e.target.value })} />
            <input style={small} value={l.url} placeholder="Link" onChange={(e) => set({ url: e.target.value })} />
            <IconButton size="sm" label="Xoá link" onClick={() => setGroup('about', { ...about, reach: about.reach.filter((_, j) => j !== i) })}>
              <IconClose size={14} />
            </IconButton>
          </div>
        )
      })}
      <div style={addLine}>
        <Button level="add" icon={<IconPlus size={14} />} onClick={() => setGroup('about', { ...about, reach: [...about.reach, { label: '', url: '' }] })}>
          Thêm link
        </Button>
      </div>
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
    <div style={{ ...sectionHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{t}</span>
      {group in stored && (
        <Button level="quiet" size="sm" onClick={() => reset(group)}>
          Mặc định
        </Button>
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
              <Button level="danger" size="sm" onClick={() => put('palettes', key, null)}>
                Xoá bảng màu
              </Button>
            )}
          </div>
        ))}
        <Button
          level="add"
          icon={<IconPlus size={14} />}
          onClick={() => {
            let n = Object.keys(design.palettes).length + 1
            while (`p${n}` in design.palettes) n++
            put('palettes', `p${n}`, { ...DEFAULT_DESIGN.palettes.biz, name: `Bảng màu ${n}` })
          }}
        >
          Thêm bảng màu
        </Button>

        {head('Màu ngữ cảnh', 'signal')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Color label="Màu chữ phủ ảnh" value={design.signal.color} onChange={(v) => put('signal', 'color', v)} />
          <Color label="Màu đánh dấu" value={design.signal.mark} onChange={(v) => put('signal', 'mark', v)} />
        </div>

        {head('Kiểu chữ', 'fonts')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Đang tải…' : 'Cập nhật'}
          </Button>
          <input ref={fileRef} type="file" accept=".woff2,.woff,.ttf,.otf" style={{ display: 'none' }} onChange={(e) => addFont(e.target.files?.[0])} />
          {fontError && <span style={{ color: '#8E1E42', fontFamily: sans, fontSize: 12 }}>{fontError}</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {design.fonts.library.map((f) => (
            <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontFamily: `"${f}"`, fontSize: 15, border: `1px solid ${paper.rule}`, background: paper.white, padding: '4px 8px' }}>
              {f}
              {![design.fonts.display, design.fonts.body, design.fonts.meta].includes(f) && (
                <IconButton
                  size="sm"
                  label={`Xoá ${f}`}
                  style={{ height: 20, width: 20, marginRight: -4 }}
                  onClick={() => {
                    put('fonts', 'library', design.fonts.library.filter((x) => x !== f))
                    if (f in design.fonts.files) {
                      const { [f]: _gone, ...rest } = design.fonts.files
                      put('fonts', 'files', rest)
                    }
                  }}
                >
                  <IconClose size={12} />
                </IconButton>
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
