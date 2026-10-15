import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  createPost,
  listAuthors,
  listKeywords,
  listPosts,
  listNodes,
  transitionStatus,
  updatePost,
  type Keyword,
  type PostStatus,
  type PostSummary,
  type StatusAction,
  type Node,
} from '../lib/apiClient'
import { ink, paper, sans, serif } from '../../design/tokens'
import { useNav } from '../../lib/nav'
import { TEMPLATE_KEYS, templateName } from '../../lib/templateNames'
import { Avatar } from '../../components/Byline'
import { tagBadge } from '../../components/TagBadges'
import { postDescription } from '../../lib/postText'
import { ListPostSettings, prefetchPost } from './ListPostSettings'
import { SectionHead } from './SectionHead'
import { statusLabel } from './NodeFields'
import { ancestorsOf, buildTree, flattenTree } from '../../lib/contentTree'
import { tagColor } from '../../lib/tagColor'
import type { Author, PostSite } from 'api-contract'
import { PostSearch, fold, freeWords, type Facet, type Suggestion, type Token } from './PostSearch'
import { desk, Menu } from './Detail'
import { Button, IconButton } from '../../design/Button'
import { IconCalendar, IconClock, IconClose, IconPage, IconPlus } from '../../design/icons'
import { radius } from '../../design/controls'

/**
 * Nội dung — the posts and the three vocabularies that file them, on one
 * screen (Phân loại and Quản lý bài used to be two tabs that could not see each
 * other: Phân loại knew a dạng bài had ten posts and could not say which).
 *
 * Top: one search bar over every way a post is filed (PostSearch).
 * Left: every vocabulary entry with its live count; a click adds it to the
 * search bar as a chip, so both show one filter.
 * Right: the posts themselves, bulk-editable, listed like Medium's "Your
 * stories" (owner's pick, 2026-10-14): status is a tab above the list rather
 * than a badge on every row, and each post reads as title, opening lines and
 * one quiet line of facts. A click anywhere on a post opens it.
 *
 * Naming, colouring, adding, arranging and deleting topics and tags is Cấu
 * hình's job (owner, 2026-10-08 and 2026-10-13): the tree was in three tabs
 * and a click on the same entry did a different thing in each.
 */

type Vocab = 'topic' | 'tpl' | 'kw' | 'site'
type Undo = { msg: string; revert?: () => Promise<unknown> }

const isUndo = (u: unknown): u is Undo => !!u && typeof u === 'object' && typeof (u as Undo).msg === 'string'

/** Posts with no place on the tree yet — a filter of their own so none goes unseen. */
const UNPLACED = '__unplaced'

const SITE_LABEL: Record<PostSite, string> = { biz: 'biz', bean: 'bean', blog: 'journal' }
// A post read before 0038 carries no list; it shows where every post did, on the journal.
const shownOn = (p: PostSummary) => p.shown_on ?? ['blog']
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

const SEL = '#EEF5F8'
const WARN = '#B4552E'
/** The status tabs over the list; "Tất cả" is every post but the trash. */
const TABS: { id: PostStatus | null; label: string }[] = [
  { id: null, label: 'Tất cả' },
  { id: 'draft', label: 'Nháp' },
  { id: 'published', label: 'Đã đăng' },
  { id: 'archived', label: 'Lưu trữ' },
  { id: 'deleted', label: 'Thùng rác' },
]
type Pill = { text: string; bg: string; fg: string }
/**
 * A published post needs no word. The others wear a pill beside the title,
 * where the eye already is, each in its own colour (owner, 2026-10-14: a status
 * lost among the grey facts at the end of the line was hard to see).
 */
const STATUS_PILL: Record<PostStatus, Pill | null> = {
  draft: { text: 'Nháp', bg: '#E6E8EC', fg: '#384150' },
  published: null,
  archived: { text: 'Lưu trữ', bg: '#ECE7DF', fg: '#62584A' },
  deleted: { text: 'Thùng rác', bg: '#FBE7E5', fg: '#8E1E42' },
}
const PENDING_PILL: Pill = { text: 'Có sửa chưa đăng', bg: '#FCE3B0', fg: '#73450A' }

const CSS = `
.cw-r:hover{background:${paper.hover}}
.cw-r:focus-visible{outline:2px solid ${ink.green};outline-offset:-2px}
.cw-story{cursor:pointer}
.cw-story:hover{background:#FAF9F6}
.cw-story:hover .cw-title{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
.cw-story:focus-within{background:#FAF9F6}
.cw-title:focus-visible{outline:2px solid ${ink.green};outline-offset:2px}
.cw-meta{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin:8px 0 0 -8px;padding:4px 8px;border-radius:6px;border:1px solid transparent}
.cw-meta:hover{background:#fff;border-color:${desk.line}}
.cw-meta:focus-visible{outline:2px solid ${ink.green};outline-offset:2px}
.cw-fact{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.cw-tab{all:unset;cursor:pointer;padding:12px 0 11px;font-family:${sans};font-size:14px;color:${ink.soft};white-space:nowrap}
.cw-tab[aria-selected=true]{color:${ink.base};box-shadow:inset 0 -2px 0 ${ink.base}}
.cw-tab:focus-visible{outline:2px solid ${ink.green};outline-offset:2px}
@media (max-width:900px){.cw-ws{grid-template-columns:1fr!important}.cw-rail{border-right:none!important;border-bottom:1px solid ${paper.rule};max-height:280px;overflow-y:auto}}
@media (max-width:640px){.cw-cover{display:none!important}}
`

function Dot({ own, inherited }: { own: string | null; inherited?: string | null }) {
  return (
    <span
      aria-hidden
      style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', boxSizing: 'border-box', background: own ?? 'transparent', border: own ? 'none' : `1.5px solid ${inherited ?? paper.rule}` }}
    />
  )
}

/** One entry in the left column: a click filters the posts to it. */
function RailRow({
  name,
  count,
  on,
  onClick,
  indent = 14,
  big,
  dot,
  flag,
}: {
  name: string
  count: number
  on: boolean
  onClick: () => void
  indent?: number
  big?: boolean
  dot?: ReactNode
  flag?: string
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={on}
      className="cw-r"
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      style={{
        display: 'grid',
        gridTemplateColumns: `${dot ? '9px ' : ''}minmax(0,1fr) auto`,
        gap: 7,
        alignItems: 'center',
        padding: `5px 8px 5px ${indent}px`,
        cursor: 'pointer',
        background: on ? SEL : undefined,
        boxShadow: on ? `inset 3px 0 0 ${ink.green}` : undefined,
      }}
    >
      {dot}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: ink.base, ...(big ? { fontFamily: serif, fontSize: 15.5 } : { fontFamily: sans, fontSize: 13 }) }}>
        {name}
        {flag && <span style={{ fontFamily: sans, fontSize: 13, color: WARN, marginLeft: 6 }}>{flag}</span>}
      </span>
      <span style={{ fontFamily: sans, fontSize: 13, color: count ? ink.soft : ink.soft, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </div>
  )
}

export function ContentWorkspace({ onChanged }: { onChanged?: () => void }) {
  const nav = useNav()
  const [topics, setTopics] = useState<Node[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [undo, setUndo] = useState<Undo | null>(null)
  const [busy, setBusy] = useState(false)
  /** The post whose info panel is open. */
  const [info, setInfo] = useState<string | null>(null)

  const load = useCallback(
    () =>
      Promise.all([listNodes('blog'), listKeywords(), listPosts('all'), listAuthors()])
        .then(([t, k, p, a]) => {
          setTopics(t)
          setKeywords(k)
          setPosts(p)
          setAuthors(a)
        })
        .catch((e: Error) => setErr(e.message)),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])
  const closeInfo = useCallback(() => {
    setInfo(null)
    void load()
    onChanged?.()
  }, [load, onChanged])
  const showError = useCallback((m: string) => setErr(m), [])

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
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics])
  const live = useMemo(() => posts.filter((p) => p.status !== 'deleted'), [posts])
  // A post sits under a node when the node is its topic or any ancestor of it.
  const inTopic = (p: PostSummary, id: string) =>
    id === UNPLACED ? !p.topic_id : p.topic_id === id || (!!p.topic_id && ancestorsOf(topics, p.topic_id).some((a) => a.id === id))
  /** The whole tree, parents before their children, at any depth. */
  const shown = useMemo(() => flattenTree(buildTree(sorted)), [sorted])
  const kwOf = (p: PostSummary) => p.keywords ?? []
  const postsOf = (vocab: Vocab, id: string, from = live) =>
    from.filter((p) => (vocab === 'topic' ? inTopic(p, id) : vocab === 'tpl' ? p.template === id : vocab === 'site' ? shownOn(p).includes(id as PostSite) : kwOf(p).includes(id)))

  const authorById = useMemo(() => new Map(authors.map((a) => [a.id, a])), [authors])
  const kwName = (id: string) => keywords.find((k) => k.id === id)?.label ?? id
  /** Everything a post is filed under, as one accent-blind string the free text is looked up in. */
  const haystack = (p: PostSummary) =>
    fold(
      [
        p.en,
        p.vi,
        ...(p.topic_id ? [p.topic_id, ...ancestorsOf(topics, p.topic_id).map((a) => a.id)].map((id) => topicById.get(id)?.title ?? '') : ['chưa xếp']),
        ...kwOf(p).map(kwName),
        ...(p.authors ?? []).map((id) => authorById.get(id)?.name ?? ''),
        templateName(p.template),
        STATUS_LABEL[p.status],
        p.date_label ?? '',
      ].join(' '),
    )
  /** Does the post carry this one exact filter? */
  const wears = (p: PostSummary, t: Token) =>
    t.kind === 'topic'
      ? inTopic(p, t.id)
      : t.kind === 'kw'
        ? kwOf(p).includes(t.id)
        : t.kind === 'author'
          ? (p.authors ?? []).includes(t.id)
          : t.kind === 'tpl'
            ? p.template === t.id
            : t.kind === 'site'
              ? shownOn(p).includes(t.id as PostSite)
              : p.status === t.id
  // Chips of one kind widen (this topic or that one); different kinds narrow
  // (this topic and that tag) — two topics ANDed would only ever match nothing.
  const kindsOn = [...new Set(tokens.map((t) => t.kind))]
  const words = freeWords(q)

  const visible = posts
    .filter((p) => tokens.some((t) => t.kind === 'status') || p.status !== 'deleted')
    .filter((p) => kindsOn.every((k) => tokens.some((t) => t.kind === k && wears(p, t))))
    .filter((p) => {
      if (!words.length) return true
      const hay = haystack(p)
      return words.every((w) => hay.includes(w))
    })
    .sort((a, b) => (b.date_label ?? '').localeCompare(a.date_label ?? '') || b.updated_at.localeCompare(a.updated_at))
  const selected = posts.filter((p) => sel.has(p.id))

  const nameOf = (vocab: Facet, id: string) =>
    vocab === 'topic'
      ? id === UNPLACED
        ? 'chưa xếp'
        : topicById.get(id)?.title ?? id
      : vocab === 'tpl'
        ? templateName(id)
        : vocab === 'kw'
          ? kwName(id)
          : vocab === 'author'
            ? authorById.get(id)?.name ?? id
            : vocab === 'site'
              ? SITE_LABEL[id as PostSite]
              : STATUS_LABEL[id as PostStatus]

  const isOn = (kind: Facet, id: string) => tokens.some((t) => t.kind === kind && t.id === id)
  const add = (t: Token) => setTokens((o) => (o.some((x) => x.kind === t.kind && x.id === t.id) ? o : [...o, t]))
  const remove = (t: Token) => setTokens((o) => o.filter((x) => !(x.kind === t.kind && x.id === t.id)))
  const toggle = (kind: Facet, id: string) => (isOn(kind, id) ? remove({ kind, id }) : add({ kind, id }))
  // ── post actions ─────────────────────────────────────────────────────────
  const act = (id: string, action: StatusAction) =>
    run(async () => {
      await transitionStatus(id, action)
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
        await transitionStatus(p.id, action)
      }
      return { msg: `${name} · ${ok.length}/${selected.length} bài` }
    })
  }

  // ── search bar ───────────────────────────────────────────────────────────
  const suggestions: Suggestion[] = [
    ...shown.map(({ row: t }) => ({
      kind: 'topic' as const,
      id: t.id,
      label: t.title,
      path: ancestorsOf(topics, t.id).map((a) => a.title).join(' › ') || undefined,
      color: t.accent ?? undefined,
      count: postsOf('topic', t.id).length,
    })),
    ...keywords.map((k) => ({ kind: 'kw' as const, id: k.id, label: k.label, color: tagColor(k.id, k.color), count: postsOf('kw', k.id).length })),
    ...authors.map((a) => ({ kind: 'author' as const, id: a.id, label: a.name, count: live.filter((p) => (p.authors ?? []).includes(a.id)).length })),
    ...TEMPLATE_KEYS.map((t) => ({ kind: 'tpl' as const, id: t, label: templateName(t), count: postsOf('tpl', t).length })),
    ...(Object.keys(SITE_LABEL) as PostSite[]).map((s) => ({ kind: 'site' as const, id: s, label: SITE_LABEL[s], count: postsOf('site', s).length })),
    ...(Object.keys(STATUS_LABEL) as PostStatus[]).map((st) => ({ kind: 'status' as const, id: st, label: STATUS_LABEL[st], count: posts.filter((p) => p.status === st).length })),
  ]
  const search = (
    <PostSearch
      text={q}
      onText={setQ}
      tokens={tokens}
      nameOf={(t) => nameOf(t.kind, t.id)}
      suggestions={suggestions}
      onAdd={add}
      onRemove={remove}
      onClear={() => (setTokens([]), setQ(''))}
    />
  )

  // ── left column ──────────────────────────────────────────────────────────
  const unplaced = live.filter((p) => !p.topic_id).length
  const rail = (
    // No box of its own: one surface with the list, split by a rule, so the two
    // columns can't end at different heights (owner, 2026-10-15). The inner
    // part sticks, so the filters stay in reach down a long list.
    <nav aria-label="Phân loại" className="cw-rail" style={{ borderRight: `1px solid ${desk.line}` }}>
      <div style={{ position: 'sticky', top: 0, maxHeight: '100vh', overflowY: 'auto', paddingBottom: 18 }}>
      <SectionHead id="content.topics" title="Chủ đề">
        {shown.map(({ row: t, depth }) => (
            <div key={t.id}>
              <RailRow
                name={t.title}
                big={depth === 0}
                indent={14 + depth * 16}
                count={postsOf('topic', t.id).length}
                on={isOn('topic', t.id)}
                onClick={() => toggle('topic', t.id)}
                dot={<Dot own={t.accent} inherited={ancestorsOf(topics, t.id).reverse().find((a) => a.accent)?.accent} />}
                flag={t.status !== 'published' ? statusLabel(t.status) : undefined}
              />
            </div>
        ))}
        {unplaced > 0 && <RailRow name="chưa xếp" count={unplaced} on={isOn('topic', UNPLACED)} onClick={() => toggle('topic', UNPLACED)} />}
      </SectionHead>
      {/* Dạng bài is retired: the template a post is written in says what it is. */}
      <SectionHead id="content.templates" title="Template">
        {TEMPLATE_KEYS.map((t) => (
          <RailRow key={t} name={templateName(t)} count={postsOf('tpl', t).length} on={isOn('tpl', t)} onClick={() => toggle('tpl', t)} />
        ))}
      </SectionHead>
      <SectionHead id="content.tags" title="Tag">
        {keywords.map((k) => (
          <RailRow
            key={k.id}
            name={k.label}
            count={postsOf('kw', k.id).length}
            on={isOn('kw', k.id)}
            onClick={() => toggle('kw', k.id)}
          />
        ))}
      </SectionHead>
      </div>
    </nav>
  )

  // ── middle column ────────────────────────────────────────────────────────
  // The tabs are the status filter itself, so a status picked in the search
  // bar lights its tab and a tab click shows up as the bar's chip.
  const statusOn = tokens.filter((t) => t.kind === 'status')
  const tabOn = statusOn.length === 0 ? null : statusOn.length === 1 ? statusOn[0].id : undefined
  const pickTab = (id: PostStatus | null) => setTokens((o) => [...o.filter((t) => t.kind !== 'status'), ...(id ? [{ kind: 'status' as const, id }] : [])])
  // Each tab counts what it would show under the other filters as they stand.
  const otherKinds = kindsOn.filter((k) => k !== 'status')
  const tabCount = (id: PostStatus | null) =>
    posts.filter(
      (p) =>
        (id ? p.status === id : p.status !== 'deleted') &&
        otherKinds.every((k) => tokens.some((t) => t.kind === k && wears(p, t))) &&
        (!words.length || words.every((w) => haystack(p).includes(w))),
    ).length
  const allOn = visible.length > 0 && visible.every((p) => sel.has(p.id))
  const flip = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  // Checkbox, menu and the filter links in a post sit inside the clickable
  // post; their clicks must not also open it.
  const own = (e: { stopPropagation: () => void }) => e.stopPropagation()

  const story = (p: PostSummary) => {
    const t = p.topic_id ? topicById.get(p.topic_id) : undefined
    const by = (p.authors ?? []).map((id) => authorById.get(id)).filter((a): a is Author => !!a)
    const pill = p.status === 'published' && p.has_draft ? PENDING_PILL : STATUS_PILL[p.status]
    const preview = p.excerpt || postDescription(p)
    const icon: CSSProperties = { color: ink.muted, flex: 'none' }
    return (
      <div
        key={p.id}
        className="cw-story"
        onClick={() => nav.editPost(p.id)}
        style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr) auto auto', gap: 16, alignItems: 'start', padding: '18px 16px 18px 20px', borderBottom: `1px solid ${desk.line}`, background: sel.has(p.id) ? SEL : undefined }}
      >
        <input type="checkbox" aria-label={`Chọn ${p.en}`} checked={sel.has(p.id)} onClick={own} onChange={() => flip(p.id)} style={{ marginTop: 5 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 10px' }}>
            <button type="button" className="cw-title" onClick={(e) => (own(e), nav.editPost(p.id))} style={{ all: 'unset', cursor: 'pointer', fontFamily: sans, fontSize: 18, lineHeight: 1.3, fontWeight: 700, color: ink.base }}>
              {p.en}
            </button>
            {p.pinned && <span aria-label="đã ghim" style={{ fontSize: 13 }}>📌</span>}
            {pill && (
              <span
                title={pill === PENDING_PILL ? 'Bản trên trang vẫn là bản cũ — mở bài và bấm "Đăng thay đổi"' : undefined}
                style={{ alignSelf: 'center', fontFamily: sans, fontSize: 12.5, fontWeight: 600, lineHeight: '20px', padding: '0 9px', borderRadius: 999, background: pill.bg, color: pill.fg, whiteSpace: 'nowrap' }}
              >
                {pill.text}
              </span>
            )}
          </div>
          {preview && (
            <p style={{ margin: '5px 0 0', fontFamily: sans, fontSize: 14.5, lineHeight: 1.5, color: ink.mid, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preview}</p>
          )}
          {/* Facts are grouped by gaps and icons, not "·": a row of dots made
              every fact look like the next one (owner, 2026-10-14). The whole
              line opens the post's info panel (owner, 2026-10-15); filtering by
              a fact lives in the left column and the search bar. */}
          <button type="button" className="cw-meta" aria-label={`Sửa thông tin bài ${p.en}`} onMouseEnter={() => prefetchPost(p.id)} onFocus={() => prefetchPost(p.id)} onClick={(e) => (own(e), setInfo(p.id))} style={{ fontFamily: sans, fontSize: 13.5, color: ink.strong }}>
            {by.length > 0 && (
              <span className="cw-fact" style={{ fontWeight: 500, color: ink.base }}>
                <span style={{ display: 'flex' }}>
                  {by.map((a, i) => (
                    <span key={a.id} style={{ marginLeft: i === 0 ? 0 : -6, display: 'flex' }}>
                      <Avatar author={a} size={22} ring={by.length > 1} />
                    </span>
                  ))}
                </span>
                {by.map((a) => a.name).join(' và ')}
              </span>
            )}
            <span className="cw-fact" style={t ? { fontWeight: 500, color: ink.base } : { fontStyle: 'italic', color: ink.soft }}>
              {t && <Dot own={t.accent} inherited={ancestorsOf(topics, t.id).reverse().find((a) => a.accent)?.accent} />}
              {t ? t.title : 'Chưa xếp chủ đề'}
            </span>
            {p.date_label && (
              <span className="cw-fact" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <IconCalendar size={14} style={icon} />
                {p.date_label}
              </span>
            )}
            {p.read_minutes && (
              <span className="cw-fact">
                <IconClock size={14} style={icon} />
                {p.read_minutes} phút đọc
              </span>
            )}
            <span className="cw-fact">
              <IconPage size={14} style={icon} />
              {templateName(p.template)}
            </span>
            {kwOf(p).map((k) => {
              const kw = keywords.find((x) => x.id === k)
              return (
                <span key={k} className="cw-fact" style={{ ...tagBadge(tagColor(k, kw?.color)), fontSize: 12.5 }}>
                  #{nameOf('kw', k)}
                </span>
              )
            })}
          </button>
        </div>
        {p.thumbnail_url ? (
          <img className="cw-cover" src={p.thumbnail_url} alt="" style={{ width: 112, height: 75, objectFit: 'cover', borderRadius: 2, background: paper.rule }} />
        ) : (
          <span className="cw-cover" aria-hidden style={{ width: 112, height: 75, borderRadius: 2, background: '#F4F2EC' }} />
        )}
        <span onClick={own} onMouseEnter={() => prefetchPost(p.id)} style={{ display: 'flex' }}>
          <Menu
            small
            label={`Thao tác ${p.en}`}
            // One entry per job: module, authors, topic and tags all live in
            // the info panel, so the menu doesn't offer them again (owner, 2026-10-15).
            actions={[
              { label: 'Sửa thông tin', onPick: () => setInfo(p.id) },
              { label: 'Nhân bản', onPick: () => copy(p.id) },
              // A pinned post leads every page that lists it (listingRule sortPosts).
              { label: p.pinned ? 'Bỏ ghim' : 'Ghim', onPick: () => run(() => updatePost(p.id, { pinned: !p.pinned })) },
              ...ACTIONS_BY_STATUS[p.status].map((a) => ({
                label: a.label,
                onPick: () => act(p.id, a.action),
                ...(a.action === 'delete' || a.action === 'permanently-delete' ? { danger: true as const } : {}),
              })),
            ]}
          />
        </span>
      </div>
    )
  }

  const list = (
    <div style={{ minWidth: 0, display: 'grid', alignContent: 'start' }}>
      {undo && (
        <div role="status" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: '#E7EFE3', padding: '8px 16px', fontFamily: sans, fontSize: 13, color: ink.base }}>
          <span>{undo.msg}</span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {undo.revert && (
              <Button size="sm" disabled={busy} onClick={() => run(async () => (await undo.revert?.(), { msg: 'Đã hoàn tác' }))}>
                Hoàn tác
              </Button>
            )}
            <IconButton size="sm" label="Đóng" onClick={() => setUndo(null)}>
              <IconClose />
            </IconButton>
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', padding: '0 20px', borderBottom: `1px solid ${desk.line}`, overflowX: 'auto' }}>
        <div role="tablist" aria-label="Trạng thái" style={{ display: 'flex', gap: 24 }}>
          {TABS.map((tab) => (
            <button key={tab.label} type="button" role="tab" className="cw-tab" aria-selected={tabOn === tab.id} onClick={() => pickTab(tab.id)}>
              {tab.label} <span style={{ fontVariantNumeric: 'tabular-nums' }}>{tabCount(tab.id)}</span>
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', padding: '8px 0' }}>
          <Button level="primary" icon={<IconPlus />} onClick={() => nav.newPost()}>
            Bài mới
          </Button>
        </span>
      </div>
      {visible.length > 0 && (
        <label style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${desk.line}`, fontFamily: sans, fontSize: 13, color: ink.soft, cursor: 'pointer' }}>
          <input
            type="checkbox"
            aria-label="Chọn tất cả"
            checked={allOn}
            onChange={() =>
              setSel((s) => {
                const n = new Set(s)
                visible.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id)))
                return n
              })
            }
          />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{visible.length} bài</span>
        </label>
      )}
      <div>
        {visible.map(story)}
        {visible.length === 0 && <div style={{ color: ink.soft, fontFamily: sans, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Không có bài nào.</div>}
      </div>
      {selected.length > 0 && (
        <BulkBar
          count={selected.length}
          topics={shown.map((n) => n.row)}
          keywords={keywords}
          busy={busy}
          onField={bulk}
          onStatus={bulkStatus}
          onClear={() => setSel(new Set())}
        />
      )}
      <ListPostSettings postId={info} topics={topics} onClose={closeInfo} onError={showError} />
    </div>
  )

  return (
    <div style={{ padding: '16px 24px 40px' }}>
      <style>{CSS}</style>
      {search}
      {err && (
        <div role="alert" style={{ background: '#FBE7E5', color: '#8E1E42', fontFamily: sans, fontSize: 12.5, padding: '8px 16px' }}>
          {err}
        </div>
      )}
      <div
        className="cw-ws"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,240px) minmax(0,1fr)',
          minHeight: 560,
          background: desk.panel,
          border: `1px solid ${desk.line}`,
          borderRadius: radius,
          // clip, not hidden: hidden would make this a scroll box and stop the rail sticking.
          overflow: 'clip',
        }}
      >
        {rail}
        {list}
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
  topics: Node[]
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
      {pick('Chủ đề', topics.map((t) => [t.id, `${'  '.repeat(ancestorsOf(topics, t.id).length)}${t.parent_id ? '› ' : ''}${t.title}`]), (v) => onField('topic_id', v))}
      {keywords.length > 0 && pick('+ Tag', keywords.map((k) => [k.id, k.label]), (v) => onField('kw+', v))}
      {keywords.length > 0 && pick('− Tag', keywords.map((k) => [k.id, k.label]), (v) => onField('kw-', v))}
      {pick('Trạng thái', BULK_STATUS.map((b) => [b.action, b.label]), (v) => onStatus(v as StatusAction))}
      <span style={{ marginLeft: 'auto' }}>
        <Button size="sm" onClick={onClear}>
          Bỏ chọn
        </Button>
      </span>
    </div>
  )
}
