import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import {
  createKeyword,
  createPost,
  createTopic,
  deleteKeyword,
  deleteTopic,
  getLayout,
  listKeywords,
  listPosts,
  listTopics,
  renameKeyword,
  reorderTopics,
  saveOverride,
  transitionStatus,
  updatePost,
  updateTopic,
  type Keyword,
  type LayoutOverride,
  type PostStatus,
  type PostSummary,
  type StatusAction,
  type Topic,
} from '../lib/apiClient'
import { ink, paper, sans, serif } from '../../design/tokens'
import { TAG_PAGE, toPath } from '../../lib/routes'
import { useNav } from '../../lib/nav'
import { TEMPLATE_KEYS, templateName } from '../../lib/templateNames'
import { usePostAddresses } from '../../data/usePostAddresses'
import { StatusBadge } from './StatusBadge'

/**
 * Nội dung — the posts and the three vocabularies that file them, on one
 * screen (Phân loại and Quản lý bài used to be two tabs that could not see each
 * other: Phân loại knew a dạng bài had ten posts and could not say which).
 *
 * Left: every vocabulary entry with its live count; a click filters the list.
 * Middle: the posts themselves, bulk-editable. Right, only when asked for (⋯):
 * one entry's settings — rename, colour, merge, retire — beside the very posts
 * it would touch, which the middle column is then filtered to.
 */

type Vocab = 'topic' | 'tpl' | 'kw'
type Filters = { topic: string | null; tpl: string | null; kw: string | null; status: PostStatus | null }
type Undo = { msg: string; revert?: () => Promise<unknown> }

const isUndo = (u: unknown): u is Undo => !!u && typeof u === 'object' && typeof (u as Undo).msg === 'string'

/** Posts with no place on the tree yet — a filter of their own so none goes unseen. */
const UNPLACED = '__unplaced'

const STATUS_LABEL: Record<PostStatus, string> = { draft: 'Nháp', published: 'Đã đăng', archived: 'Lưu trữ', deleted: 'Thùng rác' }

const ACTIONS_BY_STATUS: Record<PostStatus, { label: string; action: StatusAction }[]> = {
  draft: [
    { label: 'Đăng', action: 'publish' },
    { label: 'Lưu trữ', action: 'archive' },
    { label: 'Xoá', action: 'delete' },
  ],
  published: [
    { label: 'Bỏ đăng', action: 'unpublish' },
    { label: 'Lưu trữ', action: 'archive' },
    { label: 'Xoá', action: 'delete' },
  ],
  archived: [
    { label: 'Khôi phục', action: 'restore' },
    { label: 'Xoá', action: 'delete' },
  ],
  deleted: [
    { label: 'Khôi phục', action: 'restore-trash' },
    { label: 'Xoá vĩnh viễn', action: 'permanently-delete' },
  ],
}

/** What the bulk bar offers; each applies only to the selected posts it is valid for. */
const BULK_STATUS: { action: StatusAction; label: string }[] = [
  { action: 'publish', label: 'Đăng' },
  { action: 'unpublish', label: 'Bỏ đăng' },
  { action: 'archive', label: 'Lưu trữ' },
  { action: 'restore', label: 'Khôi phục' },
  { action: 'delete', label: 'Vào thùng rác' },
  { action: 'restore-trash', label: 'Lấy khỏi thùng rác' },
]

const PALETTE = ['#9D9167', '#F0B45C', '#F2A0A5', '#7FB87E', '#6FA8C0', '#C25C7C', '#8A6420', '#5C5745']

/** A colour's companions: the dark ink on it and the two washes behind lists. */
function shades(hex: string): { on_color: string; tint: string; tint2: string } {
  const n = parseInt(hex.slice(1), 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const mix = (to: number, k: number) =>
    '#' + rgb.map((c) => Math.round(c + (to - c) * k).toString(16).padStart(2, '0')).join('').toUpperCase()
  return { on_color: mix(0, 0.78), tint: mix(255, 0.82), tint2: mix(255, 0.68) }
}

const SEL = '#EEF5F8'
const WARN = '#B4552E'
const label: CSSProperties = { fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: ink.faint }
const box: CSSProperties = { boxSizing: 'border-box', background: paper.white, border: `1px solid ${paper.rule}`, color: ink.base, fontFamily: sans, fontSize: 13, padding: '6px 9px', outline: 'none', width: '100%' }
const link: CSSProperties = { fontFamily: sans, fontSize: 12, color: ink.green, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
const quiet: CSSProperties = { ...link, color: ink.muted }
const pill: CSSProperties = { display: 'inline-block', fontFamily: sans, fontSize: 11.5, padding: '0 7px', lineHeight: '18px', border: `1px solid ${paper.rule}`, borderRadius: 10, color: ink.soft, whiteSpace: 'nowrap', cursor: 'pointer', background: 'none', margin: '1px 3px 1px 0' }

const CSS = `
.cw-r .cw-more,.cw-r .cw-grip{opacity:0}
.cw-r:hover{background:${paper.hover}}
.cw-r:hover .cw-more,.cw-r:hover .cw-grip,.cw-r.cw-open .cw-more{opacity:1}
.cw-r:focus-visible,.cw-row:focus-within{outline:2px solid ${ink.green};outline-offset:-2px}
.cw-more:hover{background:${paper.rule}}
.cw-row .cw-act{opacity:0}
.cw-row:hover .cw-act,.cw-row:focus-within .cw-act{opacity:1}
.cw-row:hover td{background:${paper.hover}}
.cw-pill:hover{border-color:${ink.green}!important;color:${ink.green}!important}
@media (max-width:900px){.cw-ws{grid-template-columns:1fr!important}.cw-rail{border-right:none!important;border-bottom:1px solid ${paper.rule};max-height:280px;overflow-y:auto}}
`

function Dot({ own, inherited }: { own: string | null; inherited?: string | null }) {
  return (
    <span
      aria-hidden
      style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', boxSizing: 'border-box', background: own ?? 'transparent', border: own ? 'none' : `1.5px solid ${inherited ?? paper.rule}` }}
    />
  )
}

function AddInline({ text, onAdd, indent = 16 }: { text: string; onAdd: (title: string) => void; indent?: number }) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...link, display: 'block', padding: `4px 12px 4px ${indent}px` }}>
        {text}
      </button>
    )
  return (
    <div style={{ padding: `3px 12px 3px ${indent}px` }}>
      <input
        autoFocus
        aria-label={text}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key !== 'Enter') return
          const v = e.currentTarget.value.trim()
          setOpen(false)
          if (v) onAdd(v)
        }}
        onBlur={() => setOpen(false)}
        style={{ ...box, padding: '4px 8px' }}
      />
    </div>
  )
}

/** One entry in the left column: a click filters, ⋯ opens its settings. */
function RailRow({
  name,
  count,
  on,
  open,
  onClick,
  onMore,
  indent = 14,
  big,
  dot,
  flag,
  drag,
}: {
  name: string
  count: number
  on: boolean
  open?: boolean
  onClick: () => void
  onMore?: () => void
  indent?: number
  big?: boolean
  dot?: ReactNode
  flag?: string
  drag?: { draggable: true; onDragStart: () => void; onDragOver: (e: DragEvent) => void; onDrop: () => void; onDragEnd: () => void; over: boolean; dragging: boolean }
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={on}
      className={`cw-r${open ? ' cw-open' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      draggable={drag?.draggable}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      onDragEnd={drag?.onDragEnd}
      style={{
        display: 'grid',
        gridTemplateColumns: `${drag ? '10px ' : ''}${dot ? '9px ' : ''}minmax(0,1fr) auto 18px`,
        gap: 7,
        alignItems: 'center',
        padding: `5px 8px 5px ${indent}px`,
        cursor: 'pointer',
        background: on ? SEL : undefined,
        boxShadow: drag?.over && !drag.dragging ? `inset 0 2px 0 ${ink.green}` : on ? `inset 3px 0 0 ${ink.green}` : undefined,
        opacity: drag?.dragging ? 0.4 : 1,
      }}
    >
      {drag && (
        <span className="cw-grip" aria-hidden style={{ color: ink.faint, fontSize: 9, cursor: 'grab' }}>
          ⋮⋮
        </span>
      )}
      {dot}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: ink.base, ...(big ? { fontFamily: serif, fontSize: 15.5 } : { fontFamily: sans, fontSize: 13 }) }}>
        {name}
        {flag && <span style={{ fontFamily: sans, fontSize: 10, color: WARN, marginLeft: 6 }}>{flag}</span>}
      </span>
      <span style={{ fontFamily: sans, fontSize: 11.5, color: count ? ink.muted : ink.faint, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      {onMore ? (
        <span
          className="cw-more"
          role="button"
          aria-label={`Sửa ${name}`}
          onClick={(e) => {
            e.stopPropagation()
            onMore()
          }}
          style={{ color: ink.muted, textAlign: 'center', borderRadius: 3, lineHeight: '18px', fontFamily: sans }}
        >
          ⋯
        </span>
      ) : (
        <span />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid' }}>
      <div style={{ ...label, padding: '14px 14px 5px' }}>{title}</div>
      {children}
    </div>
  )
}

/** Settings column: a field. */
function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 5 }}>
      <div style={label}>{name}</div>
      {children}
    </div>
  )
}

/** Two clicks for anything that removes a vocabulary entry. */
function Confirm({ text, onGo, disabled }: { text: string; onGo: () => void; disabled?: boolean }) {
  const [ask, setAsk] = useState(false)
  if (!ask)
    return (
      <button type="button" disabled={disabled} onClick={() => setAsk(true)} style={{ ...quiet, color: disabled ? ink.faint : WARN, cursor: disabled ? 'not-allowed' : 'pointer', justifySelf: 'start' }}>
        {text}
      </button>
    )
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" onClick={() => (setAsk(false), onGo())} style={{ ...link, color: '#fff', background: WARN, padding: '6px 12px' }}>
        {text}
      </button>
      <button type="button" onClick={() => setAsk(false)} style={quiet}>
        thôi
      </button>
    </div>
  )
}

export function ContentWorkspace({ onChanged }: { onChanged?: () => void }) {
  const nav = useNav()
  const addresses = usePostAddresses()
  const [topics, setTopics] = useState<Topic[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [f, setF] = useState<Filters>({ topic: null, tpl: null, kw: null, status: null })
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [cfg, setCfg] = useState<{ vocab: Vocab; id: string } | null>(null)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    () =>
      Promise.all([listTopics(), listKeywords(), listPosts('all')])
        .then(([t, k, p]) => {
          setTopics(t)
          setKeywords(k)
          setPosts(p)
        })
        .catch((e: Error) => setErr(e.message)),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])

  /** Every write goes through here: one error line, one reload, the other tabs told. */
  const run = (fn: () => Promise<unknown>, then?: () => void) => {
    setBusy(true)
    void fn()
      .then((u) => {
        setErr(null)
        if (isUndo(u)) setUndo(u)
        then?.()
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => {
        setBusy(false)
        void load()
        onChanged?.()
      })
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const sorted = useMemo(() => [...topics].sort((a, b) => a.sort_order - b.sort_order), [topics])
  const subjects = sorted.filter((t) => t.parent_id === null)
  const childrenOf = (id: string) => sorted.filter((t) => t.parent_id === id)
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics])
  const live = useMemo(() => posts.filter((p) => p.status !== 'deleted'), [posts])
  const inTopic = (p: PostSummary, id: string) =>
    id === UNPLACED ? !p.topic_id : p.topic_id === id || topicById.get(p.topic_id ?? '')?.parent_id === id
  const kwOf = (p: PostSummary) => p.keywords ?? []
  const postsOf = (vocab: Vocab, id: string, from = live) =>
    from.filter((p) => (vocab === 'topic' ? inTopic(p, id) : vocab === 'tpl' ? p.template === id : kwOf(p).includes(id)))

  const visible = posts
    .filter((p) => (f.status ? p.status === f.status : p.status !== 'deleted'))
    .filter((p) => !f.topic || inTopic(p, f.topic))
    .filter((p) => !f.tpl || p.template === f.tpl)
    .filter((p) => !f.kw || kwOf(p).includes(f.kw))
    .filter((p) => !q.trim() || `${p.en} ${p.vi}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.date_label ?? '').localeCompare(a.date_label ?? '') || b.updated_at.localeCompare(a.updated_at))
  const selected = posts.filter((p) => sel.has(p.id))

  const nameOf = (vocab: Vocab | 'status', id: string) =>
    vocab === 'topic'
      ? id === UNPLACED
        ? 'chưa xếp'
        : topicById.get(id)?.title ?? id
      : vocab === 'tpl'
        ? templateName(id)
        : vocab === 'kw'
          ? keywords.find((k) => k.id === id)?.label ?? id
          : STATUS_LABEL[id as PostStatus]

  const toggle = (vocab: keyof Filters, id: string) => setF((o) => ({ ...o, [vocab]: o[vocab] === id ? null : id }))
  const open = (vocab: Vocab, id: string) => {
    setCfg({ vocab, id })
    setF((o) => ({ ...o, [vocab]: id }))
  }
  const close = () => {
    if (cfg) setF((o) => ({ ...o, [cfg.vocab]: null }))
    setCfg(null)
  }

  // ── topic tree drag: reorder and reparent are one gesture ─────────────────
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  function drop(targetId: string) {
    const from = drag ? topicById.get(drag) : undefined
    const target = topicById.get(targetId)
    setDrag(null)
    setOver(null)
    if (!from || !target || from.id === target.id) return
    if (from.parent_id === null) {
      if (target.parent_id !== null) return
      const order = subjects.map((s) => s.id).filter((id) => id !== from.id)
      order.splice(order.indexOf(target.id), 0, from.id)
      run(() => reorderTopics(order))
      return
    }
    const parent = target.parent_id ?? target.id
    const siblings = childrenOf(parent).map((c) => c.id).filter((id) => id !== from.id)
    if (target.parent_id === null) siblings.push(from.id)
    else siblings.splice(siblings.indexOf(target.id), 0, from.id)
    run(async () => {
      if (from.parent_id !== parent) await updateTopic(from.id, { parent_id: parent })
      await reorderTopics(siblings)
    })
  }
  const dragOf = (id: string) => ({
    draggable: true as const,
    onDragStart: () => setDrag(id),
    onDragOver: (e: DragEvent) => (e.preventDefault(), setOver(id)),
    onDrop: () => drop(id),
    onDragEnd: () => (setDrag(null), setOver(null)),
    over: over === id,
    dragging: drag === id,
  })

  // ── post actions ─────────────────────────────────────────────────────────
  const act = (id: string, action: StatusAction) =>
    run(async () => {
      // Publishing fixes the post's address for good (migration 0027).
      const slug = action === 'publish' ? addresses.slugToPublish(id) : undefined
      await transitionStatus(id, action, ...(slug ? [slug] : []))
    })

  const copy = (id: string) => {
    const src = posts.find((p) => p.id === id)
    if (!src) return
    run(async () => {
      const { id: created } = await createPost({
        module_id: src.module_id,
        kind: src.kind,
        topic_id: src.topic_id,
        en: `${src.en} (bản sao)`,
        vi: src.vi || 'Một dòng mô tả',
        fromPostId: id,
      })
      nav.editPost(created)
    })
  }

  /**
   * Change one field on many posts. The old values are kept so Hoàn tác can
   * put each post back exactly as it was, not to some common value.
   */
  function bulk(field: 'topic_id' | 'kw+' | 'kw-', value: string) {
    const targets = selected
    const before = targets.map((p) => ({ id: p.id, topic_id: p.topic_id, keywords: kwOf(p) }))
    const patchOf = (p: PostSummary) =>
      field === 'topic_id'
        ? { topic_id: value }
        : { keywords: field === 'kw+' ? [...new Set([...kwOf(p), value])] : kwOf(p).filter((k) => k !== value) }
    const what = {
      topic_id: `chủ đề → ${nameOf('topic', value)}`,
      'kw+': `+ tag ${nameOf('kw', value)}`,
      'kw-': `− tag ${nameOf('kw', value)}`,
    }[field]
    run(async () => {
      await Promise.all(targets.map((p) => updatePost(p.id, patchOf(p))))
      return {
        msg: `${targets.length} bài · ${what}`,
        revert: () =>
          Promise.all(
            before.map((b) =>
              updatePost(b.id, field === 'topic_id' ? { topic_id: b.topic_id } : { keywords: b.keywords }),
            ),
          ),
      }
    })
  }

  function bulkStatus(action: StatusAction) {
    const ok = selected.filter((p) => ACTIONS_BY_STATUS[p.status].some((a) => a.action === action))
    const name = BULK_STATUS.find((b) => b.action === action)?.label ?? action
    run(async () => {
      for (const p of ok) {
        const slug = action === 'publish' ? addresses.slugToPublish(p.id) : undefined
        await transitionStatus(p.id, action, ...(slug ? [slug] : []))
      }
      return { msg: `${name} · ${ok.length}/${selected.length} bài` }
    })
  }

  // ── retiring a vocabulary entry: its posts move first, its address goes with them ──

  /**
   * The retired node's address (and the ones it already forwarded) become old
   * addresses of the node its posts went to, so a link to the old page lands
   * on the new one instead of nothing — the database drops the override of a
   * deleted node (migration 0028), and with it every alias it held.
   */
  async function forward(type: 'topic' | 'keyword', from: string, to: string): Promise<() => Promise<unknown>> {
    const { overrides } = await getLayout()
    const mine = overrides.find((o) => o.node_type === type && o.node_id === from)
    const theirs = overrides.find((o) => o.node_type === type && o.node_id === to)
    const asAlias = type === 'topic' ? from : `${TAG_PAGE}${from}`
    const added = [asAlias, ...(mine?.aliases ?? [])].filter((a) => !(theirs?.aliases ?? []).includes(a))
    if (added.length) await saveOverride({ node_type: type, node_id: to, aliases: [...(theirs?.aliases ?? []), ...added] })
    return async () => {
      if (added.length) await saveOverride({ node_type: type, node_id: to, aliases: theirs?.aliases ?? [] })
      if (mine) await saveOverride(mine as LayoutOverride)
    }
  }

  function retireTopic(t: Topic, to: string | null) {
    const moved = postsOf('topic', t.id, posts).filter((p) => p.topic_id === t.id)
    const siblings = (t.parent_id ? childrenOf(t.parent_id) : subjects).map((s) => s.id)
    run(
      async () => {
        await Promise.all(moved.map((p) => updatePost(p.id, { topic_id: to })))
        const unforward = to ? await forward('topic', t.id, to) : null
        await deleteTopic(t.id)
        return {
          msg: to ? `${moved.length} bài → ${nameOf('topic', to)} · đã xoá ${t.title}` : `Đã xoá ${t.title}`,
          revert: async () => {
            const back = await createTopic(t.title, t.parent_id)
            await updateTopic(back.id, { intro: t.intro, visibility: t.visibility, accent: t.accent, on_color: t.on_color, tint: t.tint, tint2: t.tint2, image_url: t.image_url })
            await reorderTopics(siblings.map((s) => (s === t.id ? back.id : s)))
            await Promise.all(moved.map((p) => updatePost(p.id, { topic_id: back.id })))
            await unforward?.()
          },
        }
      },
      () => setCfg(null),
    )
    setF((o) => ({ ...o, topic: null }))
  }

  function retireKeyword(k: Keyword, to: string | null) {
    const moved = postsOf('kw', k.id, posts)
    run(
      async () => {
        const unforward = to ? await forward('keyword', k.id, to) : null
        await deleteKeyword(k.id, to ?? undefined)
        return {
          msg: to ? `${moved.length} bài → ${nameOf('kw', to)} · đã xoá ${k.label}` : `Đã gỡ ${k.label} khỏi ${moved.length} bài`,
          revert: async () => {
            const back = await createKeyword(k.label)
            await Promise.all(moved.map((p) => updatePost(p.id, { keywords: kwOf(p).map((x) => (x === k.id ? back.id : x)) })))
            await unforward?.()
          },
        }
      },
      () => setCfg(null),
    )
    setF((o) => ({ ...o, kw: null }))
  }

  // ── left column ──────────────────────────────────────────────────────────
  const unplaced = live.filter((p) => !p.topic_id).length
  const statusCount = (s: PostStatus) => posts.filter((p) => p.status === s).length
  const rail = (
    <nav aria-label="Phân loại" className="cw-rail" style={{ borderRight: `1px solid ${paper.rule}`, background: paper.white, paddingBottom: 18 }}>
      <Section title="Chủ đề">
        {subjects.map((s) => (
          <div key={s.id}>
            <RailRow
              name={s.title}
              big
              count={postsOf('topic', s.id).length}
              on={f.topic === s.id}
              open={cfg?.vocab === 'topic' && cfg.id === s.id}
              onClick={() => toggle('topic', s.id)}
              onMore={() => open('topic', s.id)}
              dot={<Dot own={s.accent} />}
              flag={s.visibility === 'private' ? 'riêng tư' : undefined}
              drag={dragOf(s.id)}
            />
            {childrenOf(s.id).map((c) => (
              <RailRow
                key={c.id}
                name={c.title}
                indent={30}
                count={postsOf('topic', c.id).length}
                on={f.topic === c.id}
                open={cfg?.vocab === 'topic' && cfg.id === c.id}
                onClick={() => toggle('topic', c.id)}
                onMore={() => open('topic', c.id)}
                dot={<Dot own={c.accent} inherited={s.accent} />}
                flag={c.visibility === 'private' ? 'riêng tư' : undefined}
                drag={dragOf(c.id)}
              />
            ))}
            {cfg?.vocab === 'topic' && cfg.id === s.id && <AddInline text="+ topic" indent={47} onAdd={(title) => run(() => createTopic(title, s.id))} />}
          </div>
        ))}
        {unplaced > 0 && <RailRow name="chưa xếp" count={unplaced} on={f.topic === UNPLACED} onClick={() => toggle('topic', UNPLACED)} />}
        <AddInline text="+ subject" onAdd={(title) => run(() => createTopic(title, null))} />
      </Section>
      {/* Dạng bài is retired: the template a post is written in says what it is. */}
      <Section title="Template">
        {TEMPLATE_KEYS.map((t) => (
          <RailRow key={t} name={templateName(t)} count={postsOf('tpl', t).length} on={f.tpl === t} onClick={() => toggle('tpl', t)} />
        ))}
      </Section>
      <Section title="Tag">
        {keywords.map((k) => (
          <RailRow
            key={k.id}
            name={k.label}
            count={postsOf('kw', k.id).length}
            on={f.kw === k.id}
            open={cfg?.vocab === 'kw' && cfg.id === k.id}
            onClick={() => toggle('kw', k.id)}
            onMore={() => open('kw', k.id)}
          />
        ))}
        <AddInline text="+ tag" onAdd={(l) => run(() => createKeyword(l))} />
      </Section>
      <Section title="Trạng thái">
        {(Object.keys(STATUS_LABEL) as PostStatus[]).map((s) => (
          <RailRow key={s} name={STATUS_LABEL[s]} count={statusCount(s)} on={f.status === s} onClick={() => toggle('status', s)} />
        ))}
      </Section>
    </nav>
  )

  // ── middle column ────────────────────────────────────────────────────────
  const chips = (['topic', 'tpl', 'kw', 'status'] as const).filter((v) => f[v])
  const allOn = visible.length > 0 && visible.every((p) => sel.has(p.id))
  const pillBtn = (vocab: keyof Filters, id: string, text: string, dashed = false) => (
    <button key={id} type="button" className="cw-pill" onClick={() => setF((o) => ({ ...o, [vocab]: id }))} style={{ ...pill, borderStyle: dashed ? 'dashed' : 'solid' }}>
      {text}
    </button>
  )
  const th: CSSProperties = { ...label, textAlign: 'left', padding: '9px 10px', borderBottom: `1px solid ${paper.rule}`, fontWeight: 500 }
  const td: CSSProperties = { padding: '8px 10px', borderBottom: `1px solid ${paper.rule}`, verticalAlign: 'baseline', fontFamily: sans, fontSize: 13 }

  const list = (
    <div style={{ minWidth: 0, display: 'grid', alignContent: 'start' }}>
      {undo && (
        <div role="status" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: '#E7EFE3', padding: '8px 16px', fontFamily: sans, fontSize: 13, color: ink.base }}>
          <span>{undo.msg}</span>
          <span style={{ display: 'flex', gap: 14 }}>
            {undo.revert && (
              <button type="button" disabled={busy} onClick={() => run(async () => (await undo.revert?.(), { msg: 'Đã hoàn tác' }))} style={{ ...link, fontWeight: 500 }}>
                Hoàn tác
              </button>
            )}
            <button type="button" aria-label="Đóng" onClick={() => setUndo(null)} style={quiet}>
              ✕
            </button>
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${paper.rule}`, fontFamily: sans, fontSize: 12.5, color: ink.muted }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{visible.length} bài</span>
        {chips.map((v) => (
          <span key={v} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', background: SEL, color: ink.base, padding: '2px 8px', borderRadius: 3 }}>
            {nameOf(v, f[v] as string)}
            <button type="button" aria-label={`Bỏ lọc ${nameOf(v, f[v] as string)}`} onClick={() => (setF((o) => ({ ...o, [v]: null })), cfg?.vocab === v && setCfg(null))} style={{ ...quiet, fontSize: 13 }}>
              ×
            </button>
          </span>
        ))}
        <input type="search" aria-label="Tìm bài" placeholder="Tìm bài" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...box, width: 200, marginLeft: 'auto' }} />
        <button
          type="button"
          onClick={() => nav.newPost()}
          style={{ fontFamily: sans, fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: ink.green, color: '#fff', padding: '8px 14px', borderRadius: 4 }}
        >
          + Bài mới
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 28 }}>
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={allOn}
                  onChange={() => setSel((s) => {
                    const n = new Set(s)
                    visible.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id)))
                    return n
                  })}
                />
              </th>
              <th style={th}>Bài</th>
              <th style={th}>Chủ đề</th>
              <th style={th}>Template</th>
              <th style={th}>Tag</th>
              <th style={th}>Trạng thái</th>
              <th style={th}>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const t = p.topic_id ? topicById.get(p.topic_id) : undefined
              const on = sel.has(p.id)
              return (
                <tr key={p.id} className="cw-row" style={{ background: on ? SEL : undefined }}>
                  <td style={td}>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${p.en}`}
                      checked={on}
                      onChange={() => setSel((s) => {
                        const n = new Set(s)
                        if (n.has(p.id)) n.delete(p.id)
                        else n.add(p.id)
                        return n
                      })}
                    />
                  </td>
                  <td style={{ ...td, maxWidth: 320 }}>
                    <button type="button" onClick={() => nav.editPost(p.id)} style={{ all: 'unset', cursor: 'pointer', fontFamily: serif, fontSize: 15, color: ink.base }}>
                      {p.en}
                    </button>
                    {p.pinned && (
                      <span aria-label="đã ghim" style={{ marginLeft: 6, fontSize: 11 }}>
                        📌
                      </span>
                    )}
                    <div className="cw-act" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 3, fontSize: 11.5 }}>
                      <button type="button" onClick={() => nav.editPost(p.id)} style={link}>
                        Sửa
                      </button>
                      <button type="button" onClick={() => copy(p.id)} style={link}>
                        Nhân bản
                      </button>
                      {/* A pinned post leads every page that lists it (listingRule sortPosts). */}
                      <button type="button" aria-pressed={p.pinned} onClick={() => run(() => updatePost(p.id, { pinned: !p.pinned }))} style={link}>
                        {p.pinned ? 'Bỏ ghim' : 'Ghim'}
                      </button>
                      {ACTIONS_BY_STATUS[p.status].map((a) => (
                        <button key={a.action} type="button" onClick={() => act(p.id, a.action)} style={a.action === 'delete' || a.action === 'permanently-delete' ? quiet : link}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={td}>{t ? pillBtn('topic', t.id, t.title) : pillBtn('topic', UNPLACED, 'chưa xếp')}</td>
                  <td style={td}>{pillBtn('tpl', p.template ?? '', templateName(p.template))}</td>
                  <td style={td}>{kwOf(p).map((k) => pillBtn('kw', k, nameOf('kw', k), true))}</td>
                  <td style={td}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ ...td, color: ink.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{p.date_label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && <div style={{ color: ink.faint, fontFamily: sans, fontSize: 12.5, padding: '40px 0', textAlign: 'center' }}>Không có bài nào.</div>}
      </div>
      {selected.length > 0 && (
        <BulkBar
          count={selected.length}
          topics={subjects.flatMap((s) => [s, ...childrenOf(s.id)])}
          keywords={keywords}
          busy={busy}
          onField={bulk}
          onStatus={bulkStatus}
          onClear={() => setSel(new Set())}
        />
      )}
    </div>
  )

  // ── right column ─────────────────────────────────────────────────────────
  let settings: ReactNode = null
  if (cfg?.vocab === 'topic') {
    const t = topicById.get(cfg.id)
    if (t)
      settings = (
        <TopicSettings
          key={t.id}
          topic={t}
          parent={t.parent_id ? topicById.get(t.parent_id) : undefined}
          kids={childrenOf(t.id)}
          subjects={subjects}
          tree={subjects.flatMap((s) => [s, ...childrenOf(s.id)])}
          count={postsOf('topic', t.id, posts).filter((p) => p.topic_id === t.id).length}
          used={[...new Set(topics.map((x) => x.accent).filter((c): c is string => !!c))]}
          save={(patch) => run(() => updateTopic(t.id, patch))}
          onRetire={(to) => retireTopic(t, to)}
          onClose={close}
        />
      )
  }
  if (cfg?.vocab === 'kw') {
    const k = keywords.find((x) => x.id === cfg.id)
    if (k)
      settings = (
        <FlatSettings
          key={k.id}
          kind="Tag"
          entry={k}
          count={postsOf('kw', k.id, posts).length}
          others={keywords.filter((x) => x.id !== k.id)}
          address={toPath({ area: 'public', screen: 'module', moduleId: `${TAG_PAGE}${k.id}` })}
          onRename={(l) => run(() => renameKeyword(k.id, l))}
          onRetire={(to) => retireKeyword(k, to)}
          onClose={close}
        />
      )
  }

  return (
    <div style={{ borderTop: `1px solid ${paper.rule}` }}>
      <style>{CSS}</style>
      {err && (
        <div role="alert" style={{ background: '#FBE7E5', color: '#8E1E42', fontFamily: sans, fontSize: 12.5, padding: '8px 16px' }}>
          {err}
        </div>
      )}
      <div
        className="cw-ws"
        style={{
          display: 'grid',
          gridTemplateColumns: settings ? 'minmax(0,240px) minmax(0,1fr) minmax(0,280px)' : 'minmax(0,240px) minmax(0,1fr)',
          minHeight: 560,
          alignItems: 'start',
        }}
      >
        {rail}
        {list}
        {settings && (
          <aside aria-label="Cấu hình" style={{ borderLeft: `1px solid ${paper.rule}`, background: paper.white, padding: '16px 16px 24px', display: 'grid', gap: 16, alignContent: 'start', position: 'sticky', top: 0 }}>
            {settings}
          </aside>
        )}
      </div>
    </div>
  )
}

function BulkBar({
  count,
  topics,
  keywords,
  busy,
  onField,
  onStatus,
  onClear,
}: {
  count: number
  topics: Topic[]
  keywords: Keyword[]
  busy: boolean
  onField: (field: 'topic_id' | 'kw+' | 'kw-', value: string) => void
  onStatus: (a: StatusAction) => void
  onClear: () => void
}) {
  const s: CSSProperties = { all: 'unset', cursor: 'pointer', border: '1px solid rgba(255,255,255,.28)', padding: '4px 10px', fontFamily: sans, fontSize: 12.5, color: paper.cream }
  const pick = (name: string, opts: [string, string][], go: (v: string) => void) => (
    <select
      aria-label={name}
      value=""
      disabled={busy}
      onChange={(e) => e.target.value && go(e.target.value)}
      style={s}
    >
      <option value="">{name}</option>
      {opts.map(([v, t]) => (
        <option key={v} value={v} style={{ color: ink.base }}>
          {t}
        </option>
      ))}
    </select>
  )
  return (
    <div role="toolbar" aria-label="Sửa nhiều bài" style={{ position: 'sticky', bottom: 0, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: ink.base, color: paper.cream, padding: '9px 14px', fontFamily: sans, fontSize: 13 }}>
      <b style={{ marginRight: 8, fontWeight: 500 }}>{count} bài</b>
      {pick('Chủ đề', topics.map((t) => [t.id, t.parent_id ? `  › ${t.title}` : t.title]), (v) => onField('topic_id', v))}
      {keywords.length > 0 && pick('+ Tag', keywords.map((k) => [k.id, k.label]), (v) => onField('kw+', v))}
      {keywords.length > 0 && pick('− Tag', keywords.map((k) => [k.id, k.label]), (v) => onField('kw-', v))}
      {pick('Trạng thái', BULK_STATUS.map((b) => [b.action, b.label]), (v) => onStatus(v as StatusAction))}
      <button type="button" onClick={onClear} style={{ ...s, border: 'none', marginLeft: 'auto', color: ink.faint }}>
        Bỏ chọn
      </button>
    </div>
  )
}

function Head({ kind, count, onClose }: { kind: string; count: number; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={label}>
        {kind} · {count} bài
      </span>
      <button type="button" aria-label="Đóng" onClick={onClose} style={quiet}>
        ✕
      </button>
    </div>
  )
}

function NameInput({ value, onSave, big }: { value: string; onSave: (v: string) => void; big?: boolean }) {
  return (
    <input
      aria-label="Tên"
      key={value}
      defaultValue={value}
      onBlur={(e) => {
        const v = e.target.value.trim()
        if (v && v !== value) onSave(v)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      style={{ fontFamily: serif, fontSize: big ? 24 : 20, lineHeight: 1.15, color: ink.base, border: 'none', borderBottom: `1px solid ${paper.rule}`, background: 'transparent', padding: '2px 0 5px', outline: 'none', width: '100%' }}
    />
  )
}

function TopicSettings({
  topic,
  parent,
  kids,
  subjects,
  tree,
  count,
  used,
  save,
  onRetire,
  onClose,
}: {
  topic: Topic
  parent?: Topic
  kids: Topic[]
  subjects: Topic[]
  tree: Topic[]
  /** Posts filed on this node itself, children not counted. */
  count: number
  used: string[]
  save: (patch: Parameters<typeof updateTopic>[1]) => void
  onRetire: (to: string | null) => void
  onClose: () => void
}) {
  const targets = tree.filter((t) => t.id !== topic.id && t.parent_id !== topic.id)
  const [to, setTo] = useState(parent?.id ?? targets[0]?.id ?? '')
  const setColor = (hex: string | null) => save(hex ? { accent: hex, ...shades(hex) } : { accent: null, on_color: null, tint: null, tint2: null })
  const swatches = [...new Set([...used, ...PALETTE.filter((c) => !used.some((u) => u.toUpperCase() === c))])].slice(0, 9)
  const address = toPath({ area: 'public', screen: 'module', moduleId: topic.id })

  return (
    <>
      <Head kind={parent ? `${parent.title} › topic` : 'Subject'} count={count} onClose={onClose} />
      <NameInput value={topic.title} onSave={(title) => save({ title })} big />
      <Field name="Địa chỉ">
        <a href={address} target="_blank" rel="noreferrer" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: ink.soft }}>
          {address} ↗
        </a>
      </Field>
      <Field name="Quyền xem">
        <div style={{ display: 'inline-flex', border: `1px solid ${paper.rule}`, width: 'fit-content' }}>
          {(['public', 'private'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={topic.visibility === v}
              onClick={() => topic.visibility !== v && save({ visibility: v })}
              style={{ all: 'unset', cursor: 'pointer', fontFamily: sans, fontSize: 12, padding: '4px 11px', background: topic.visibility === v ? ink.base : 'transparent', color: topic.visibility === v ? paper.cream : ink.soft }}
            >
              {v === 'public' ? 'công khai' : 'riêng tư'}
            </button>
          ))}
        </div>
      </Field>
      <Field name="Màu">
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-label={parent ? `theo ${parent.title}` : 'chưa có màu'}
            aria-pressed={!topic.accent}
            onClick={() => topic.accent && setColor(null)}
            style={{ all: 'unset', cursor: 'pointer', width: 20, height: 20, borderRadius: '50%', boxSizing: 'border-box', border: `2px ${parent?.accent ? 'dashed' : 'solid'} ${parent?.accent ?? paper.rule}`, outline: !topic.accent ? `2px solid ${ink.base}` : 'none', outlineOffset: 2 }}
          />
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={topic.accent?.toUpperCase() === c.toUpperCase()}
              onClick={() => setColor(c)}
              style={{ all: 'unset', cursor: 'pointer', width: 20, height: 20, borderRadius: '50%', background: c, outline: topic.accent?.toUpperCase() === c.toUpperCase() ? `2px solid ${ink.base}` : 'none', outlineOffset: 2 }}
            />
          ))}
          <input
            aria-label="mã màu"
            placeholder="#hex"
            key={topic.accent ?? 'none'}
            defaultValue={topic.accent ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (/^#[0-9a-f]{6}$/i.test(v) && v !== topic.accent) setColor(v)
            }}
            style={{ ...box, width: 84, padding: '3px 7px', fontSize: 12 }}
          />
        </div>
      </Field>
      <Field name="Lời dẫn">
        <textarea aria-label="Lời dẫn" key={topic.intro} defaultValue={topic.intro} rows={3} onBlur={(e) => e.target.value !== topic.intro && save({ intro: e.target.value })} style={{ ...box, resize: 'vertical', lineHeight: 1.5 }} />
      </Field>
      {parent && subjects.length > 1 && (
        <Field name="Thuộc subject">
          <select aria-label="Thuộc subject" value={topic.parent_id ?? ''} onChange={(e) => save({ parent_id: e.target.value })} style={box}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div style={{ display: 'grid', gap: 10, borderTop: `1px solid ${paper.rule}`, paddingTop: 14 }}>
        {kids.length > 0 ? (
          <span style={{ fontFamily: sans, fontSize: 12, color: ink.muted }}>còn {kids.length} topic</span>
        ) : count > 0 ? (
          <>
            <Field name={`Chuyển ${count} bài sang`}>
              <select aria-label={`Chuyển ${count} bài sang`} value={to} onChange={(e) => setTo(e.target.value)} style={box}>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.parent_id ? `› ${t.title}` : t.title}
                  </option>
                ))}
              </select>
            </Field>
            <Confirm text={`Chuyển và xoá ${topic.title}`} disabled={!to} onGo={() => onRetire(to)} />
          </>
        ) : (
          <Confirm text={`Xoá ${topic.title}`} onGo={() => onRetire(null)} />
        )}
      </div>
    </>
  )
}

function FlatSettings({
  kind,
  entry,
  count,
  others,
  same,
  required,
  address,
  onRename,
  onRetire,
  onClose,
}: {
  kind: string
  entry: { id: string; label: string }
  count: number
  others: { id: string; label: string }[]
  /** What every one of its posts already says elsewhere (a topic, a template). */
  same?: string | null
  /** Dạng bài: every post wears one, so its posts must go somewhere. */
  required?: boolean
  address?: string
  onRename: (label: string) => void
  onRetire: (to: string | null) => void
  onClose: () => void
}) {
  const [to, setTo] = useState(required ? (others.find((o) => o.id === 'note') ?? others[0])?.id ?? '' : '')
  return (
    <>
      <Head kind={kind} count={count} onClose={onClose} />
      <NameInput value={entry.label} onSave={onRename} />
      <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: ink.faint }}>{entry.id}</span>
      {same && (
        <div style={{ background: '#F8E6DC', color: ink.base, padding: '8px 10px', fontFamily: sans, fontSize: 12.5 }}>
          ≡ {count}/{count} bài cũng ở {same}
        </div>
      )}
      {address && (
        <Field name="Địa chỉ">
          <a href={address} target="_blank" rel="noreferrer" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: ink.soft }}>
            {address} ↗
          </a>
        </Field>
      )}
      <div style={{ display: 'grid', gap: 10, borderTop: `1px solid ${paper.rule}`, paddingTop: 14 }}>
        {count > 0 ? (
          <>
            <Field name={`Chuyển ${count} bài sang`}>
              <select aria-label={`Chuyển ${count} bài sang`} value={to} onChange={(e) => setTo(e.target.value)} style={box}>
                {!required && <option value="">— bỏ khỏi bài —</option>}
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Confirm text={to ? `Chuyển và xoá ${entry.label}` : `Gỡ khỏi ${count} bài và xoá`} disabled={required && !to} onGo={() => onRetire(to || null)} />
          </>
        ) : (
          <Confirm text={`Xoá ${entry.label}`} onGo={() => onRetire(required ? to : null)} disabled={required && !to} />
        )}
      </div>
    </>
  )
}
