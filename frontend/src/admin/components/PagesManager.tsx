import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import {
  TEMPLATES,
  createPage,
  createRule,
  deleteOverride,
  deletePortPage,
  deletePage,
  getLayout,
  listKeywords,
  listTags,
  listTopics,
  saveOverride,
  updatePage,
  updateRule,
  type Keyword,
  type LayoutOverride,
  type LayoutPage,
  type StoredRule,
  type Tag,
  type Topic,
} from '../lib/apiClient'
import { useRowDrag } from '../lib/useRowDrag'
import { findPage, useModules, type PageRow } from '../../data/useModules'
import { treeOrder, type ListingRule, type RuleGroup, type RuleSort, type RuleTier } from '../../lib/listingRule'
import { toPath } from '../../lib/routes'
import { Builder, ContentTab, createFromPreset, usePortAdmin, type PortPart } from './PortEditors'
import { usePortSources } from '../../portfolio/data'
import type { PresetKey } from '../../portfolio/blocks'
import { ink, paper, sans, serif } from '../../design/tokens'

/**
 * Quản lý trang — the feature layer in the CMS (migration 0028).
 *
 * One list of where things are shown — the navigation, curated pages, tier
 * templates and the nodes that override them — and one editor per page: its
 * listing rule, its hand order, how it looks, its fixed copy. The preview on
 * the right is the public page itself, reloaded after every save.
 */

/** Pages the site draws with screens of their own, whose copy lives in site settings. */
export type SystemPage = 'landing' | 'index' | 'notes' | 'archive'

type Selected =
  | { kind: 'system'; key: SystemPage }
  | { kind: 'curated'; id: string }
  | { kind: 'template'; id: string }
  | { kind: 'override'; type: 'topic' | 'keyword'; node: string }
  /** A topic or tag page on its template, before it has settings of its own. */
  | { kind: 'node'; type: 'topic' | 'keyword'; node: string }
  | { kind: 'nav' }
  | { kind: 'port-page'; id: string }
  | { kind: 'port-part'; part: PortPart }
  | { kind: 'practice' }

/** What PageEditor opens: the blog's own pages. */
type BlogSelected = Extract<Selected, { kind: 'system' | 'curated' | 'template' | 'override' }>

const SYSTEM: { key: SystemPage; title: string; path: string }[] = [
  { key: 'landing', title: 'Trang chủ', path: '/' },
  { key: 'index', title: 'Mục lục', path: toPath({ area: 'public', screen: 'home' }) },
  { key: 'archive', title: 'Lưu trữ', path: '' },
]

const TEMPLATE_TITLES: Record<string, string> = {
  template_subject: 'Mẫu trang subject',
  template_topic: 'Mẫu trang topic',
  template_keyword: 'Mẫu trang tag',
}

const TIER_NAMES: Record<RuleTier, string> = {
  topic: 'Chủ đề',
  keyword: 'Tag',
  kind: 'Dạng bài',
  template: 'Khuôn bài',
  pick: 'Chọn tay',
  all: 'Toàn bộ',
}
const SORT_NAMES: Record<RuleSort, string> = { newest: 'mới nhất trước', oldest: 'cũ nhất trước', manual: 'xếp tay', tree: 'theo cây chủ đề' }
const GROUP_NAMES: Record<RuleGroup, string> = { none: 'không nhóm', subject: 'subject', topic: 'topic', keyword: 'tag', kind: 'dạng bài', year: 'năm' }

const head: CSSProperties = {
  fontFamily: sans,
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: ink.muted,
  borderBottom: `2px solid ${ink.base}`,
  paddingBottom: 9,
  margin: '30px 0 12px',
}
const label: CSSProperties = { fontFamily: sans, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: ink.faint, marginBottom: 6 }
const box: CSSProperties = {
  boxSizing: 'border-box',
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 12.5,
  padding: '5px 8px',
  outline: 'none',
}
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${paper.rule}`, fontFamily: sans, fontSize: 13 }
const link: CSSProperties = { fontFamily: sans, fontSize: 11, color: ink.green, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
const quiet: CSSProperties = { ...link, color: ink.muted }
const chip = (on: boolean): CSSProperties => ({
  fontFamily: sans,
  fontSize: 11.5,
  padding: '3px 9px',
  border: `1px solid ${on ? ink.base : paper.rule}`,
  background: on ? ink.base : paper.white,
  color: on ? paper.cream : ink.soft,
  cursor: 'pointer',
})

function dragRow(d: ReturnType<typeof useRowDrag>, i: number) {
  return {
    draggable: true,
    onDragStart: () => d.setFrom(i),
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      d.setOver(i)
    },
    onDrop: () => d.drop(i),
    onDragEnd: d.end,
    style: { ...row, background: d.over === i && d.from !== i ? '#EEF5F8' : 'transparent', opacity: d.from === i ? 0.5 : 1 },
  }
}

const moved = <T,>(list: readonly T[], from: number, to: number): T[] => {
  const next = [...list]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}

type Vocab = { topics: Topic[]; keywords: Keyword[]; kinds: Tag[] }

/** A set of options to switch on and off. */
function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <button key={o.id} type="button" onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} style={chip(on)}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function nodeOptions(tier: RuleTier, v: Vocab): { id: string; label: string }[] {
  if (tier === 'topic') {
    const byId = new Map(v.topics.map((t) => [t.id, t]))
    return treeOrder(v.topics).map((id) => {
      const t = byId.get(id)!
      const parent = t.parent_id ? byId.get(t.parent_id) : undefined
      return { id, label: parent ? `${parent.title} › ${t.title}` : t.title }
    })
  }
  if (tier === 'keyword') return v.keywords.map((k) => ({ id: k.id, label: k.label }))
  if (tier === 'kind') return v.kinds.map((k) => ({ id: k.id, label: k.label }))
  if (tier === 'template') return TEMPLATES.map((t) => ({ id: t, label: t }))
  return []
}

/** The rule's own fields. A template's rule always takes its node from the page. */
function RuleEditor({ rule, vocab, template, onChange }: { rule: StoredRule; vocab: Vocab; template: boolean; onChange: (patch: Partial<ListingRule>) => void }) {
  const opts = nodeOptions(rule.tier, vocab)
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {!template && (
        <div>
          <div style={label}>Kéo từ</div>
          <select aria-label="Kéo từ" value={rule.tier} onChange={(e) => onChange({ tier: e.target.value as RuleTier, nodes: [], exclude: [] })} style={box}>
            {(Object.keys(TIER_NAMES) as RuleTier[]).filter((t) => t !== 'pick').map((t) => (
              <option key={t} value={t}>
                {TIER_NAMES[t]}
              </option>
            ))}
          </select>
        </div>
      )}
      {!template && opts.length > 0 && (
        <div>
          <div style={label}>Nút</div>
          <Chips options={opts} value={rule.nodes} onChange={(nodes) => onChange({ nodes })} />
        </div>
      )}
      {rule.tier === 'topic' && (
        <label style={{ fontFamily: sans, fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={rule.include_children} onChange={(e) => onChange({ include_children: e.target.checked })} />
          gồm topic con
        </label>
      )}
      {rule.tier === 'keyword' && !template && (
        <div>
          <div style={label}>Khớp</div>
          <select aria-label="Khớp" value={rule.match} onChange={(e) => onChange({ match: e.target.value as 'any' | 'all' })} style={box}>
            <option value="any">bất kỳ tag nào</option>
            <option value="all">đủ mọi tag</option>
          </select>
        </div>
      )}
      {!template && opts.length > 0 && (
        <div>
          <div style={label}>Loại trừ</div>
          <Chips options={opts} value={rule.exclude} onChange={(exclude) => onChange({ exclude })} />
        </div>
      )}
      <div>
        <div style={label}>Chỉ dạng bài</div>
        <Chips options={vocab.kinds.map((k) => ({ id: k.id, label: k.label }))} value={rule.kinds} onChange={(kinds) => onChange({ kinds })} />
      </div>
      <div>
        <div style={label}>Chỉ khuôn bài</div>
        <Chips options={TEMPLATES.map((t) => ({ id: t, label: t }))} value={rule.templates} onChange={(templates) => onChange({ templates })} />
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={label}>Xếp</div>
          <select aria-label="Xếp" value={rule.sort} onChange={(e) => onChange({ sort: e.target.value as RuleSort })} style={box}>
            {(Object.keys(SORT_NAMES) as RuleSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_NAMES[s]}
              </option>
            ))}
          </select>
        </div>
        {rule.sort === 'manual' && (
          <div>
            <div style={label}>Bài mới</div>
            <select aria-label="Bài mới" value={rule.new_first ? 'first' : 'last'} onChange={(e) => onChange({ new_first: e.target.value === 'first' })} style={box}>
              <option value="first">vào đầu</option>
              <option value="last">vào cuối</option>
            </select>
          </div>
        )}
        <div>
          <div style={label}>Nhóm</div>
          <select aria-label="Nhóm" value={rule.group_by} onChange={(e) => onChange({ group_by: e.target.value as RuleGroup })} style={box}>
            {(Object.keys(GROUP_NAMES) as RuleGroup[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_NAMES[g]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={label}>Giới hạn</div>
          <input
            aria-label="Giới hạn"
            type="number"
            min={1}
            defaultValue={rule.limit_n ?? ''}
            key={rule.limit_n ?? 'none'}
            onBlur={(e) => onChange({ limit_n: e.target.value ? Math.max(1, Number(e.target.value)) : null })}
            style={{ ...box, width: 70 }}
          />
        </div>
      </div>
    </div>
  )
}

/** The page's posts in their current order, to drag into a hand order and pin. */
function HandOrder({ rule, posts, onChange }: { rule: StoredRule; posts: { id: string; en: string }[]; onChange: (patch: Partial<ListingRule>) => void }) {
  const drag = useRowDrag((from, to) => onChange({ manual_order: moved(posts.map((p) => p.id), from, to) }))
  return (
    <div>
      {posts.map((p, i) => (
        <div key={p.id} {...dragRow(drag, i)}>
          <span style={{ cursor: 'grab', color: ink.faint }} aria-hidden>
            ⋮⋮
          </span>
          <span style={{ color: ink.faint, width: 22 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ flex: 1, fontFamily: serif, fontSize: 15 }}>{p.en}</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: ink.muted }}>
            <input
              type="checkbox"
              aria-label={`ghim ${p.en}`}
              checked={rule.pinned.includes(p.id)}
              onChange={(e) => onChange({ pinned: e.target.checked ? [...rule.pinned, p.id] : rule.pinned.filter((x) => x !== p.id) })}
            />
            ghim
          </label>
        </div>
      ))}
    </div>
  )
}

type NavItem = { ref: string; sidebar?: boolean; home?: boolean }

const PORT_PARTS: { part: PortPart; title: string }[] = [
  { part: 'about', title: 'About' },
  { part: 'sign', title: 'Signature' },
  { part: 'header', title: 'Thanh trên' },
  { part: 'footer', title: 'Chân trang' },
]

const treeRow = (on: boolean, indent: number): CSSProperties => ({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  width: '100%',
  padding: `5px 12px 5px ${indent}px`,
  cursor: 'pointer',
  fontFamily: sans,
  fontSize: 13,
  color: ink.base,
  background: on ? '#EEF5F8' : undefined,
  boxShadow: on ? `inset 3px 0 0 ${ink.green}` : undefined,
})
const meta: CSSProperties = { marginLeft: 'auto', fontSize: 11, color: ink.faint, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }
const siteHead: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 12px 6px', fontFamily: serif, fontSize: 18, color: ink.base }
const group: CSSProperties = { ...label, margin: 0, padding: '10px 12px 3px 24px' }

const same = (a: Selected | null, b: Selected) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Quản lý trang — every page of the three sites in one tree (Port, Personal
 * Blog, Practice), and the selected page's settings beside it. Port used to be
 * a screen of its own and Ghi 02 a special module of the blog; both are pages
 * like the others now, edited from here.
 */
export function PagesManager({
  renderCopy,
  renderModule,
  renderPractice,
}: {
  /** The fixed copy of a page the site draws with a screen of its own. */
  renderCopy: (key: SystemPage) => ReactNode
  /** The fields of a module a page still takes its looks from. */
  renderModule: (moduleId: string) => ReactNode
  /** Practice's own settings — its name and colour live in site settings, not in the blog's pages. */
  renderPractice: () => ReactNode
}) {
  const { data: pages, postsOf, reload } = useModules()
  const port = usePortAdmin()
  const src = usePortSources()
  const [layout, setLayout] = useState<{ pages: LayoutPage[]; overrides: LayoutOverride[]; rules: StoredRule[] } | null>(null)
  const [vocab, setVocab] = useState<Vocab>({ topics: [], keywords: [], kinds: [] })
  const [open, setOpen] = useState<Selected>({ kind: 'system', key: 'landing' })
  const [err, setErr] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [newPage, setNewPage] = useState('')
  const [archived, setArchived] = useState(false)

  const load = () => void getLayout().then(setLayout).catch((e: Error) => setErr(e.message))
  useEffect(() => {
    load()
    void Promise.all([listTopics(), listKeywords(), listTags()]).then(([topics, keywords, kinds]) => setVocab({ topics, keywords, kinds }))
  }, [])

  /** Save, then read the layout and the public pages again, and reload the preview. */
  const run = (fn: () => Promise<unknown>) =>
    void fn()
      .then(() => {
        setErr(null)
        load()
        reload()
        setRound((r) => r + 1)
      })
      .catch((e: Error) => setErr(e.message))

  const ruleOf = (id: string | null | undefined) => layout?.rules.find((r) => r.id === id)
  const nav = layout?.pages.find((p) => p.kind === 'nav')

  // The navigation as the site draws it: the owner's list, then subjects not yet placed.
  const navItems: NavItem[] = useMemo(() => {
    const items = ((nav?.presentation.items ?? []) as NavItem[]).slice()
    const listed = new Set(items.map((i) => i.ref))
    const subjects = vocab.topics.filter((t) => t.parent_id === null).sort((a, b) => a.sort_order - b.sort_order)
    for (const s of subjects) if (!listed.has(`topic:${s.id}`)) items.push({ ref: `topic:${s.id}`, sidebar: true, home: true })
    return items
  }, [nav, vocab.topics])
  const navPage = (ref: string): PageRow | undefined => {
    const [type, id] = ref.split(':')
    return findPage(pages, type === 'tag' ? `tag-${id}` : id)
  }
  const saveNav = (items: NavItem[]) => nav && run(() => updatePage(nav.id, { presentation: { ...nav.presentation, items } }))
  const navDrag = useRowDrag((from, to) => saveNav(moved(navItems, from, to)))

  if (!layout) return <div style={{ padding: '34px 56px', fontFamily: sans, fontSize: 13, color: ink.muted }}>{err ?? 'Đang tải…'}</div>

  const errorLine = err && (
    <div role="alert" style={{ fontFamily: sans, fontSize: 12, color: '#8E1E42', margin: '10px 0' }}>
      {err}
    </div>
  )

  // A page drawn by the practice journal's screen is Practice's, not the blog's
  // (the leftover row of the old Ghi 02 module, until it is removed).
  const curated = layout.pages.filter((p) => p.kind === 'curated' && p.presentation.screen !== 'hours')
  const templates = layout.pages.filter((p) => p.kind.startsWith('template_'))
  const overrideOf = (type: 'topic' | 'keyword', id: string) => layout.overrides.find((o) => o.node_type === type && o.node_id === id)
  const sortedTopics = [...vocab.topics].sort((a, b) => a.sort_order - b.sort_order)
  const subjects = sortedTopics.filter((t) => t.parent_id === null)
  const livePort = port.pages.filter((p) => p.status !== 'archived')
  const archivedPort = port.pages.filter((p) => p.status === 'archived')

  const item = (sel: Selected, text: ReactNode, indent: number, right?: ReactNode, big = false) => (
    <button type="button" key={JSON.stringify(sel)} aria-current={same(open, sel) ? 'page' : undefined} onClick={() => setOpen(sel)} style={{ ...treeRow(same(open, sel), indent), ...(big ? { fontFamily: serif, fontSize: 15 } : {}) }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      {right !== undefined && <span style={meta}>{right}</span>}
    </button>
  )
  const nodeItem = (type: 'topic' | 'keyword', id: string, title: string, indent: number, big = false) => {
    const page = findPage(pages, type === 'keyword' ? `tag-${id}` : id)
    const own = overrideOf(type, id)
    const sel: Selected = own ? { kind: 'override', type, node: id } : { kind: 'node', type, node: id }
    return item(sel, title, indent, `${own ? 'riêng · ' : ''}${page ? postsOf(page.id).length : 0}`, big)
  }

  const tree = (
    <nav aria-label="Cây trang" style={{ borderRight: `1px solid ${paper.rule}`, background: paper.white, paddingBottom: 24, position: 'sticky', top: 0, maxHeight: '100vh', overflowY: 'auto' }}>
      <div style={siteHead}>
        Port <span style={meta}>/portfolio</span>
      </div>
      {item({ kind: 'port-part', part: 'home' }, 'Trang chủ', 24)}
      <div style={group}>Các trang port</div>
      {livePort.map((p) => item({ kind: 'port-page', id: p.id }, p.title, 34, p.status === 'draft' ? 'nháp' : ''))}
      <AddPort
        onAdd={(key) =>
          run(async () => {
            const page = await createFromPreset(key, port.pages, src.moduleIds)
            port.setPages((ps) => [...ps, page])
            setOpen({ kind: 'port-page', id: page.id })
          })
        }
      />
      {archivedPort.length > 0 && (
        <>
          <button type="button" aria-expanded={archived} onClick={() => setArchived((a) => !a)} style={{ ...treeRow(false, 34), color: ink.muted, fontSize: 12 }}>
            {archived ? '▾' : '▸'} Lưu trữ <span style={meta}>{archivedPort.length}</span>
          </button>
          {archived && archivedPort.map((p) => item({ kind: 'port-page', id: p.id }, p.title, 46))}
        </>
      )}
      {PORT_PARTS.map((x) => item({ kind: 'port-part', part: x.part }, x.title, 24))}

      <div style={{ ...siteHead, borderTop: `1px solid ${paper.rule}`, marginTop: 12 }}>
        Personal Blog <span style={meta}>/</span>
      </div>
      {SYSTEM.map((s) => item({ kind: 'system', key: s.key }, s.title, 24))}
      {item({ kind: 'nav' }, 'Điều hướng', 24, navItems.length)}
      <div style={group}>Trang chọn tay</div>
      {curated.map((p) => item({ kind: 'curated', id: p.id }, p.title || p.id, 34, postsOf(p.id).length))}
      <div style={{ padding: '3px 12px 3px 34px', display: 'flex', gap: 6 }}>
        <input aria-label="Địa chỉ trang mới" placeholder="+ trang mới" value={newPage} onChange={(e) => setNewPage(e.target.value.trim())} style={{ ...box, padding: '3px 7px', fontSize: 12 }} />
        {newPage && (
          <button type="button" onClick={() => run(async () => { await createPage(newPage, newPage); setOpen({ kind: 'curated', id: newPage }); setNewPage('') })} style={link}>
            tạo
          </button>
        )}
      </div>
      <div style={group}>Chủ đề</div>
      {subjects.map((s) => (
        <div key={s.id}>
          {nodeItem('topic', s.id, s.title, 34, true)}
          {sortedTopics.filter((t) => t.parent_id === s.id).map((t) => nodeItem('topic', t.id, t.title, 48))}
        </div>
      ))}
      {vocab.keywords.length > 0 && <div style={group}>Tag</div>}
      {vocab.keywords.map((k) => nodeItem('keyword', k.id, k.label, 34))}
      <div style={group}>Mẫu</div>
      {templates.map((p) => item({ kind: 'template', id: p.id }, TEMPLATE_TITLES[p.kind], 34))}

      <div style={{ ...siteHead, borderTop: `1px solid ${paper.rule}`, marginTop: 12 }}>
        Practice <span style={meta}>{toPath({ area: 'practice', screen: 'hours' })}</span>
      </div>
      {item({ kind: 'practice' }, 'Ghi 02', 24, 'sau đăng nhập')}
    </nav>
  )

  let body: ReactNode
  if (open.kind === 'port-part') {
    body = port.loaded ? <ContentTab key={open.part} only={open.part} content={port.content} setStored={port.setContentStored} pages={port.pages} /> : null
  } else if (open.kind === 'port-page') {
    const p = port.pages.find((x) => x.id === open.id)
    body = p ? (
      <Builder
        key={p.id}
        page={p}
        design={port.design}
        src={src}
        content={port.content}
        pages={port.pages}
        onSaved={(next) => port.setPages((ps) => ps.map((x) => (x.id === next.id ? next : x)))}
        onDelete={() => {
          if (!window.confirm(`Xoá trang “${p.title}”? Thao tác này không hoàn tác được.`)) return
          run(async () => {
            await deletePortPage(p.id)
            port.setPages((ps) => ps.filter((x) => x.id !== p.id))
            setOpen({ kind: 'port-part', part: 'home' })
          })
        }}
      />
    ) : null
  } else if (open.kind === 'practice') {
    const path = toPath({ area: 'practice', screen: 'hours' })
    body = (
      <div style={{ padding: '6px 32px 130px', maxWidth: 640 }}>
        <div style={{ fontFamily: serif, fontSize: 30, margin: '10px 0 4px' }}>Ghi 02</div>
        <a href={path} target="_blank" rel="noreferrer" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: ink.soft }}>
          {path} ↗
        </a>
        {renderPractice()}
      </div>
    )
  } else if (open.kind === 'nav') {
    body = (
      <div style={{ padding: '6px 32px 130px', maxWidth: 760 }}>
        <div style={{ fontFamily: serif, fontSize: 30, margin: '10px 0 4px' }}>Điều hướng</div>
        {errorLine}
        {navItems.map((it, i) => {
          const p = navPage(it.ref)
          return (
            <div key={it.ref} {...dragRow(navDrag, i)}>
              <span style={{ cursor: 'grab', color: ink.faint }} aria-hidden>
                ⋮⋮
              </span>
              <span style={{ flex: 1 }}>{p?.title ?? it.ref}</span>
              <span style={{ color: ink.faint, fontSize: 11 }}>{p ? postsOf(p.id).length : 0} bài</span>
              {(['sidebar', 'home'] as const).map((flag) => (
                <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: ink.muted }}>
                  <input
                    type="checkbox"
                    aria-label={`${flag === 'sidebar' ? 'thanh bên' : 'trang chủ'} ${p?.title ?? it.ref}`}
                    checked={it[flag] !== false}
                    onChange={(e) => saveNav(navItems.map((x, j) => (j === i ? { ...x, [flag]: e.target.checked } : x)))}
                  />
                  {flag === 'sidebar' ? 'thanh bên' : 'trang chủ'}
                </label>
              ))}
            </div>
          )
        })}
      </div>
    )
  } else if (open.kind === 'node') {
    // A node on its template: what it follows, and the way to give it settings of its own.
    const { type, node } = open
    const topic = vocab.topics.find((t) => t.id === node)
    const tplKind = type === 'keyword' ? 'template_keyword' : topic?.parent_id ? 'template_topic' : 'template_subject'
    const tpl = templates.find((p) => p.kind === tplKind)
    const page = findPage(pages, type === 'keyword' ? `tag-${node}` : node)
    const preview = page ? toPath({ area: 'public', screen: 'module', moduleId: page.id }) : ''
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: preview ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)', minHeight: '70vh' }}>
        <div style={{ padding: '6px 32px 130px', maxWidth: 640 }}>
          <div style={{ fontFamily: serif, fontSize: 30, margin: '10px 0 4px' }}>{page?.title ?? node}</div>
          {errorLine}
          <div style={{ fontFamily: sans, fontSize: 13, color: ink.muted, margin: '8px 0 14px' }}>
            theo{' '}
            {tpl ? (
              <button type="button" onClick={() => setOpen({ kind: 'template', id: tpl.id })} style={{ ...link, fontSize: 13 }}>
                {TEMPLATE_TITLES[tplKind]}
              </button>
            ) : (
              TEMPLATE_TITLES[tplKind]
            )}{' '}
            · {page ? postsOf(page.id).length : 0} bài
          </div>
          <button
            type="button"
            style={{ ...link, fontSize: 12.5 }}
            onClick={() =>
              run(async () => {
                // The node starts from its template's rule, with the node written in.
                const { id: _id, ...copy } = ruleOf(tpl?.blocks[0]) ?? ({} as StoredRule)
                const rule = await createRule({ ...copy, tier: type, from_page: false, nodes: [node] })
                await saveOverride({ node_type: type, node_id: node, rule_id: rule.id })
                setOpen({ kind: 'override', type, node })
              })
            }
          >
            + cài đặt riêng
          </button>
        </div>
        {preview && (
          <div style={{ borderLeft: `1px solid ${paper.rule}`, position: 'sticky', top: 0, height: '100vh' }}>
            <iframe key={round} title={`xem trước ${page?.title ?? node}`} src={preview} style={{ width: '100%', height: '100%', border: 0 }} />
          </div>
        )}
      </div>
    )
  } else {
    body = (
      <PageEditor
        key={JSON.stringify(open)}
        selected={open}
        layout={layout}
        pages={pages}
        postsOf={postsOf}
        vocab={vocab}
        round={round}
        error={errorLine}
        ruleOf={ruleOf}
        run={run}
        onBack={() => setOpen({ kind: 'system', key: 'landing' })}
        renderCopy={renderCopy}
        renderModule={renderModule}
      />
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,260px) minmax(0,1fr)', borderTop: `1px solid ${paper.rule}`, alignItems: 'start' }}>
      {tree}
      <div style={{ minWidth: 0, paddingTop: 14 }}>{body}</div>
    </div>
  )
}

/** "+ trang port": from one of the two presets or blank, like the Portfolio screen offered. */
function AddPort({ onAdd }: { onAdd: (key: PresetKey) => void }) {
  return (
    <select aria-label="Trang port mới" value="" onChange={(e) => e.target.value && onAdd(e.target.value as PresetKey)} style={{ ...box, width: 'auto', margin: '2px 12px 4px 34px', padding: '2px 6px', fontSize: 12, color: ink.green, border: 'none', background: 'transparent' }}>
      <option value="">+ trang port</option>
      <option value="bibi">từ mẫu bibi</option>
      <option value="bibe">từ mẫu bibe</option>
      <option value="blank">trang trống</option>
    </select>
  )
}

function PageEditor({
  selected,
  layout,
  pages,
  postsOf,
  vocab,
  round,
  error,
  ruleOf,
  run,
  onBack,
  renderCopy,
  renderModule,
}: {
  selected: BlogSelected
  layout: { pages: LayoutPage[]; overrides: LayoutOverride[]; rules: StoredRule[] }
  pages: PageRow[]
  postsOf: (id: string) => { id: string; en: string }[]
  vocab: Vocab
  round: number
  error: ReactNode
  ruleOf: (id: string | null | undefined) => StoredRule | undefined
  run: (fn: () => Promise<unknown>) => void
  onBack: () => void
  renderCopy: (key: SystemPage) => ReactNode
  renderModule: (moduleId: string) => ReactNode
}) {
  let title = ''
  let rule: StoredRule | undefined
  let preview = ''
  let page: PageRow | undefined
  let record: LayoutPage | undefined
  let override: LayoutOverride | undefined
  let copyKey: SystemPage | null = null

  if (selected.kind === 'system') {
    const s = SYSTEM.find((x) => x.key === selected.key)!
    title = s.title
    preview = s.path
    copyKey = s.key
  } else if (selected.kind === 'curated' || selected.kind === 'template') {
    record = layout.pages.find((p) => p.id === selected.id)
    rule = ruleOf(record?.blocks[0])
    page = selected.kind === 'curated' ? findPage(pages, selected.id) : undefined
    title = selected.kind === 'template' ? TEMPLATE_TITLES[record?.kind ?? ''] ?? '' : record?.title || selected.id
    if (page) preview = page.screen === 'notes' ? toPath({ area: 'public', screen: 'notes' }) : toPath({ area: 'public', screen: 'module', moduleId: page.id })
    if (page?.screen === 'notes') copyKey = 'notes'
  } else {
    override = layout.overrides.find((o) => o.node_type === selected.type && o.node_id === selected.node)
    rule = ruleOf(override?.rule_id)
    page = findPage(pages, selected.type === 'keyword' ? `tag-${selected.node}` : selected.node)
    title = page?.title ?? selected.node
    if (page) preview = toPath({ area: 'public', screen: 'module', moduleId: page.id })
  }

  const linked = ((override?.presentation ?? record?.presentation ?? {}) as { module?: string }).module
  const posts = page ? postsOf(page.id) : []
  const saveRule = (patch: Partial<ListingRule>) => rule && run(() => updateRule(rule!.id, patch))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: preview ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)', minHeight: '70vh' }}>
      <div style={{ padding: '6px 32px 130px', maxWidth: 640 }}>
        <div style={{ fontFamily: serif, fontSize: 30, margin: '10px 0 4px' }}>{title}</div>
        {error}

        {record && selected.kind === 'curated' && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '12px 0' }}>
            <input
              aria-label="Tên trang"
              defaultValue={record.title}
              key={record.title}
              onBlur={(e) => e.target.value.trim() && e.target.value !== record!.title && run(() => updatePage(record!.id, { title: e.target.value.trim() }))}
              style={{ ...box, width: 260, fontFamily: serif, fontSize: 16 }}
            />
            <select aria-label="Quyền xem trang" value={record.visibility} onChange={(e) => run(() => updatePage(record!.id, { visibility: e.target.value as 'public' | 'private' }))} style={box}>
              <option value="public">công khai</option>
              <option value="private">riêng tư</option>
            </select>
          </div>
        )}

        {rule && (
          <>
            <div style={head}>Quy chế</div>
            <RuleEditor rule={rule} vocab={vocab} template={selected.kind === 'template'} onChange={saveRule} />
          </>
        )}

        {rule?.sort === 'manual' && posts.length > 0 && (
          <>
            <div style={head}>Thứ tự</div>
            <HandOrder rule={rule} posts={posts} onChange={saveRule} />
          </>
        )}

        {linked && (
          <>
            <div style={head}>Hình trang</div>
            {renderModule(linked)}
          </>
        )}

        {copyKey && (
          <>
            <div style={head}>Chữ cố định</div>
            {renderCopy(copyKey)}
          </>
        )}

        {selected.kind === 'override' && (
          <button type="button" style={{ ...quiet, marginTop: 30 }} onClick={() => run(async () => { await deleteOverride(selected.type, selected.node); onBack() })}>
            bỏ cài đặt riêng, dùng mẫu
          </button>
        )}
        {selected.kind === 'curated' && record && record.aliases.length === 0 && !linked && (
          <button type="button" style={{ ...quiet, marginTop: 30 }} onClick={() => run(async () => { await deletePage(record!.id); onBack() })}>
            xoá trang
          </button>
        )}
      </div>
      {preview && (
        <div style={{ borderLeft: `1px solid ${paper.rule}`, position: 'sticky', top: 0, height: '100vh' }}>
          <iframe key={round} title={`xem trước ${title}`} src={preview} style={{ width: '100%', height: '100%', border: 0 }} />
        </div>
      )}
    </div>
  )
}
