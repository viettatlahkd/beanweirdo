import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import {
  TEMPLATES,
  createPage,
  createRule,
  deleteOverride,
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
const GROUP_NAMES: Record<RuleGroup, string> = { none: 'không nhóm', topic: 'topic', keyword: 'tag', kind: 'dạng bài', year: 'năm' }

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

export function PagesManager({
  renderCopy,
  renderModule,
}: {
  /** The fixed copy of a page the site draws with a screen of its own. */
  renderCopy: (key: SystemPage) => ReactNode
  /** The fields of a module a page still takes its looks from. */
  renderModule: (moduleId: string) => ReactNode
}) {
  const { data: pages, postsOf, reload } = useModules()
  const [layout, setLayout] = useState<{ pages: LayoutPage[]; overrides: LayoutOverride[]; rules: StoredRule[] } | null>(null)
  const [vocab, setVocab] = useState<Vocab>({ topics: [], keywords: [], kinds: [] })
  const [open, setOpen] = useState<Selected | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [newPage, setNewPage] = useState('')

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

  if (open) {
    return (
      <PageEditor
        selected={open}
        layout={layout}
        pages={pages}
        postsOf={postsOf}
        vocab={vocab}
        round={round}
        error={errorLine}
        ruleOf={ruleOf}
        run={run}
        onBack={() => setOpen(null)}
        renderCopy={renderCopy}
        renderModule={renderModule}
      />
    )
  }

  const curated = layout.pages.filter((p) => p.kind === 'curated')
  const templates = layout.pages.filter((p) => p.kind.startsWith('template_'))
  const overridden = layout.overrides
  const freeNodes = vocab.topics.filter((t) => !overridden.some((o) => o.node_type === 'topic' && o.node_id === t.id))

  return (
    <div style={{ padding: '10px 56px 130px', maxWidth: 1080 }}>
      {errorLine}

      <div style={head}>Điều hướng</div>
      {navItems.map((item, i) => {
        const p = navPage(item.ref)
        return (
          <div key={item.ref} {...dragRow(navDrag, i)}>
            <span style={{ cursor: 'grab', color: ink.faint }} aria-hidden>
              ⋮⋮
            </span>
            <span style={{ flex: 1 }}>{p?.title ?? item.ref}</span>
            <span style={{ color: ink.faint, fontSize: 11 }}>{p ? postsOf(p.id).length : 0} bài</span>
            {(['sidebar', 'home'] as const).map((flag) => (
              <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: ink.muted }}>
                <input
                  type="checkbox"
                  aria-label={`${flag === 'sidebar' ? 'thanh bên' : 'trang chủ'} ${p?.title ?? item.ref}`}
                  checked={item[flag] !== false}
                  onChange={(e) => saveNav(navItems.map((x, j) => (j === i ? { ...x, [flag]: e.target.checked } : x)))}
                />
                {flag === 'sidebar' ? 'thanh bên' : 'trang chủ'}
              </label>
            ))}
          </div>
        )
      })}

      <div style={head}>Trang</div>
      {SYSTEM.map((s) => (
        <div key={s.key} style={row}>
          <span style={{ flex: 1 }}>{s.title}</span>
          <button type="button" onClick={() => setOpen({ kind: 'system', key: s.key })} style={link}>
            sửa →
          </button>
        </div>
      ))}
      {curated.map((p) => (
        <div key={p.id} style={row}>
          <span style={{ flex: 1 }}>{p.title || p.id}</span>
          <span style={{ color: ink.faint, fontSize: 11 }}>{postsOf(p.id).length} bài</span>
          <button type="button" onClick={() => setOpen({ kind: 'curated', id: p.id })} style={link}>
            sửa →
          </button>
        </div>
      ))}
      <div style={{ ...row, borderBottom: 'none' }}>
        <input
          aria-label="Địa chỉ trang mới"
          placeholder="dia-chi-trang-moi"
          value={newPage}
          onChange={(e) => setNewPage(e.target.value.trim())}
          style={{ ...box, width: 220 }}
        />
        <button type="button" disabled={!newPage} onClick={() => run(async () => { await createPage(newPage, newPage); setOpen({ kind: 'curated', id: newPage }); setNewPage('') })} style={link}>
          + trang mới
        </button>
      </div>

      <div style={head}>Trang theo tầng</div>
      {templates.map((p) => (
        <div key={p.id} style={row}>
          <span style={{ flex: 1 }}>{TEMPLATE_TITLES[p.kind]}</span>
          <button type="button" onClick={() => setOpen({ kind: 'template', id: p.id })} style={link}>
            sửa →
          </button>
        </div>
      ))}
      {overridden.map((o) => {
        const p = findPage(pages, o.node_type === 'keyword' ? `tag-${o.node_id}` : o.node_id)
        return (
          <div key={`${o.node_type}:${o.node_id}`} style={row}>
            <span style={{ flex: 1 }}>{p?.title ?? o.node_id}</span>
            <span style={{ color: ink.faint, fontSize: 11 }}>cài đặt riêng · {p ? postsOf(p.id).length : 0} bài</span>
            <button type="button" onClick={() => setOpen({ kind: 'override', type: o.node_type, node: o.node_id })} style={link}>
              sửa →
            </button>
          </div>
        )
      })}
      <div style={{ ...row, borderBottom: 'none' }}>
        <select
          aria-label="Cài đặt riêng cho chủ đề"
          value=""
          onChange={(e) => {
            const node = e.target.value
            if (!node) return
            const tpl = templates.find((p) => p.kind === (vocab.topics.find((t) => t.id === node)?.parent_id ? 'template_topic' : 'template_subject'))
            const base = ruleOf(tpl?.blocks[0])
            run(async () => {
              // The node starts from its template's rule, with the node written in.
              const { id: _id, ...copy } = base ?? ({} as StoredRule)
              const rule = await createRule({ ...copy, tier: 'topic', from_page: false, nodes: [node] })
              await saveOverride({ node_type: 'topic', node_id: node, rule_id: rule.id })
              setOpen({ kind: 'override', type: 'topic', node })
            })
          }}
          style={box}
        >
          <option value="">+ cài đặt riêng cho…</option>
          {freeNodes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
    </div>
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
  selected: Selected
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
      <div style={{ padding: '10px 32px 130px 56px', maxWidth: 640 }}>
        <button type="button" onClick={onBack} style={quiet}>
          ← Quản lý trang
        </button>
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
