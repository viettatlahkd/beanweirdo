import { type CSSProperties, type DragEvent, type ReactNode } from 'react'
import { POST_TEMPLATE_KEYS as TEMPLATES } from '../../content/templates'
import {
  createRule,
  deleteOverride,
  saveOverride,
  updatePage,
  updateRule,
  type Keyword,
  type LayoutOverride,
  type LayoutPage,
  type StoredRule,
  type Tag,
  type Node,
} from '../lib/apiClient'
import { useRowDrag } from '../lib/useRowDrag'
import { findPage, type PageRow } from '../../data/useModules'
import { ancestorsOf } from '../../lib/contentTree'
import { treeOrder, type ListingRule, type RuleGroup, type RuleSort, type RuleTier } from '../../lib/listingRule'
import { toPath } from '../../lib/routes'
import { Row, Section, Switch } from './Detail'
import { Button } from '../../design/Button'
import { IconGrip } from '../../design/icons'
import { ink, paper, sans, serif } from '../../design/tokens'

/**
 * The page side of Cấu hình: what a page lists and how it looks (migration
 * 0028). This was Quản lý trang's editor column; since the two tabs were
 * merged (2026-10-08) the tree that picks a page lives in `ConfigTree.tsx`
 * and these are the panels it opens on the right.
 */

/** Pages the site draws with screens of their own, whose copy lives in site settings. */
export type SystemPage = 'landing' | 'index' | 'notes'

/** What PageEditor opens: the blog's own pages. */
export type BlogSelected =
  | { kind: 'system'; key: SystemPage }
  | { kind: 'override'; type: 'topic' | 'keyword'; node: string }

export type Layout = { pages: LayoutPage[]; overrides: LayoutOverride[]; rules: StoredRule[] }

const SYSTEM: { key: SystemPage; title: string; path: string }[] = [
  { key: 'landing', title: 'Trang chủ', path: toPath({ area: 'public', screen: 'landing' }) },
  { key: 'index', title: 'Mục lục', path: toPath({ area: 'public', screen: 'home' }) },
]

/**
 * The template a node's page follows when it has no settings of its own.
 * Templates are no longer opened in Cấu hình (the owner found nothing to see
 * on them), so this is only named, never linked.
 */
const TEMPLATE_WORDS: Record<string, string> = {
  template_subject: 'quy chế chung của trang subject',
  template_topic: 'quy chế chung của trang topic',
  template_keyword: 'quy chế chung của trang tag',
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

const label: CSSProperties = { fontFamily: sans, fontSize: 13, fontWeight: 600, color: ink.strong, marginBottom: 6 }
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

export type Vocab = { topics: Node[]; keywords: Keyword[]; kinds: Tag[] }

/**
 * A set of options to switch on and off. Several can be on at once, so these are
 * loose pressed toggles rather than the joined one-of-a-few `Choice`.
 */
function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="ab-tabs" style={{ gap: 4 }}>
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <button key={o.id} type="button" className="ab-tab" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}>
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
    return treeOrder(v.topics).map((id) => ({ id, label: [...ancestorsOf(v.topics, id), byId.get(id)!].map((t) => t.title).join(' › ') }))
  }
  if (tier === 'keyword') return v.keywords.map((k) => ({ id: k.id, label: k.label }))
  if (tier === 'kind') return v.kinds.map((k) => ({ id: k.id, label: k.label }))
  if (tier === 'template') return TEMPLATES.map((t) => ({ id: t, label: t }))
  return []
}

/** The rule's own fields. */
function RuleEditor({ rule, vocab, onChange }: { rule: StoredRule; vocab: Vocab; onChange: (patch: Partial<ListingRule>) => void }) {
  const opts = nodeOptions(rule.tier, vocab)
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <div style={label}>Kéo từ</div>
        <select aria-label="Kéo từ" value={rule.tier} onChange={(e) => onChange({ tier: e.target.value as RuleTier, nodes: [], exclude: [] })} style={box}>
          {/* No dạng bài: it is retired, the template tier says the same. */}
          {(Object.keys(TIER_NAMES) as RuleTier[]).filter((t) => t !== 'pick' && t !== 'kind').map((t) => (
            <option key={t} value={t}>
              {TIER_NAMES[t]}
            </option>
          ))}
        </select>
      </div>
      {opts.length > 0 && (
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
      {rule.tier === 'keyword' && (
        <div>
          <div style={label}>Khớp</div>
          <select aria-label="Khớp" value={rule.match} onChange={(e) => onChange({ match: e.target.value as 'any' | 'all' })} style={box}>
            <option value="any">bất kỳ tag nào</option>
            <option value="all">đủ mọi tag</option>
          </select>
        </div>
      )}
      {opts.length > 0 && (
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
            {(Object.keys(GROUP_NAMES) as RuleGroup[]).filter((g) => g !== 'kind').map((g) => (
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
          <span className="ab-grip" aria-hidden>
            <IconGrip size={14} />
          </span>
          <span style={{ color: ink.soft, width: 22 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ flex: 1, fontFamily: serif, fontSize: 15 }}>{p.en}</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: ink.soft }}>
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

const ruleIn = (layout: Layout) => (id: string | null | undefined) => layout.rules.find((r) => r.id === id)

type NavItem = { ref: string; sidebar?: boolean; home?: boolean }

/**
 * Whether one page is listed in the blog's menu (its sidebar) and on the blog
 * home — named as the port names its own pair, so the two sites read alike.
 *
 * There used to be a whole Điều hướng screen that also ordered that list, and
 * its order fought the topic tree's: drag a subject in the tree and the
 * sidebar did not follow. The tree is the one order now (`arrange` in
 * useModules), so all that is left of the navigation is these two switches,
 * shown on the page they are about.
 */
export function NavFlags({
  layout,
  navRef,
  defaults,
  run,
}: {
  layout: Layout
  navRef: string
  /** What an entry not yet in the list shows as — the same defaults `arrange` applies. */
  defaults: { sidebar: boolean; home: boolean }
  run: (fn: () => Promise<unknown>) => void
}) {
  const nav = layout.pages.find((p) => p.kind === 'nav')
  if (!nav) return null
  const items = (nav.presentation.items ?? []) as NavItem[]
  const own = items.find((i) => i.ref === navRef)
  const shown = (flag: 'sidebar' | 'home') => (own ? own[flag] !== false : defaults[flag])
  const set = (flag: 'sidebar' | 'home', value: boolean) => {
    const entry = { ref: navRef, sidebar: shown('sidebar'), home: shown('home'), [flag]: value }
    const next = own ? items.map((i) => (i.ref === navRef ? entry : i)) : [...items, entry]
    run(() => updatePage(nav.id, { presentation: { ...nav.presentation, items: next } }))
  }
  return (
    <>
      {(['sidebar', 'home'] as const).map((flag) => (
        <Row key={flag} label={flag === 'sidebar' ? 'Hiện trên menu' : 'Hiện ở trang chủ'}>
          <Switch label={flag === 'sidebar' ? 'Hiện trên menu' : 'Hiện ở trang chủ'} value={shown(flag)} onChange={(v) => set(flag, v)} />
        </Row>
      ))}
    </>
  )
}

/**
 * The page of a topic or a tag: either it follows its tier's template, or it
 * has settings of its own — then it gets the full page editor.
 */
export function NodePage({
  type,
  node,
  layout,
  pages,
  postsOf,
  vocab,
  error,
  run,
  renderCopy,
  renderModule,
}: {
  type: 'topic' | 'keyword'
  node: string
  layout: Layout
  pages: PageRow[]
  postsOf: (id: string) => { id: string; en: string }[]
  vocab: Vocab
  error: ReactNode
  run: (fn: () => Promise<unknown>) => void
  renderCopy: (key: SystemPage) => ReactNode
  renderModule: (moduleId: string) => ReactNode
}) {
  const own = layout.overrides.find((o) => o.node_type === type && o.node_id === node)
  if (own)
    return (
      <PageEditor
        selected={{ kind: 'override', type, node }}
        layout={layout}
        pages={pages}
        postsOf={postsOf}
        vocab={vocab}
        error={error}
        run={run}
        renderCopy={renderCopy}
        renderModule={renderModule}
      />
    )
  const topic = vocab.topics.find((t) => t.id === node)
  const tplKind = type === 'keyword' ? 'template_keyword' : topic?.parent_id ? 'template_topic' : 'template_subject'
  const tpl = layout.pages.find((p) => p.kind === tplKind)
  const page = findPage(pages, type === 'keyword' ? `tag-${node}` : node)
  const listed = page ? postsOf(page.id) : []
  return (
    <div>
      {error}
      <div style={{ fontFamily: sans, fontSize: 13, color: ink.soft, margin: '8px 0 10px' }}>
        Theo {TEMPLATE_WORDS[tplKind]}: {listed.length ? `trang đang liệt kê ${listed.length} bài` : 'trang chưa có bài nào'}.
      </div>
      {listed.length > 0 && (
        <ol style={{ margin: '0 0 14px', paddingLeft: 20, fontFamily: serif, fontSize: 14, lineHeight: 1.6, color: ink.base }}>
          {listed.slice(0, 8).map((p) => (
            <li key={p.id}>{p.en}</li>
          ))}
          {listed.length > 8 && <li style={{ listStyle: 'none', fontFamily: sans, fontSize: 12, color: ink.soft }}>… và {listed.length - 8} bài nữa</li>}
        </ol>
      )}
      {/* The "+" stays in the words: tests and the owner's notes name the button by them. */}
      <Button
        level="add"
        onClick={() =>
          run(async () => {
            // The node starts from its template's rule, with the node written in.
            const { id: _id, ...copy } = ruleIn(layout)(tpl?.blocks[0]) ?? ({} as StoredRule)
            const rule = await createRule({ ...copy, tier: type, from_page: false, nodes: [node] })
            await saveOverride({ node_type: type, node_id: node, rule_id: rule.id })
          })
        }
      >
        + cài đặt riêng
      </Button>
    </div>
  )
}

/** A blog page's public address: Ghi has a screen of its own, every other page is drawn by the module screen. */
export const pagePath = (page: PageRow) =>
  page.screen === 'notes' ? toPath({ area: 'public', screen: 'notes' }) : toPath({ area: 'public', screen: 'module', moduleId: page.id })

/** Where a blog page lives and what it is made of — read once, by the editor and by the preview beside it. */
export function describePage(selected: BlogSelected, layout: Layout, pages: PageRow[]) {
  const ruleOf = ruleIn(layout)
  let title = ''
  let rule: StoredRule | undefined
  let preview = ''
  let page: PageRow | undefined
  let override: LayoutOverride | undefined
  let copyKey: SystemPage | null = null

  if (selected.kind === 'system') {
    const s = SYSTEM.find((x) => x.key === selected.key)!
    title = s.title
    preview = s.path
    copyKey = s.key
  } else {
    override = layout.overrides.find((o) => o.node_type === selected.type && o.node_id === selected.node)
    rule = ruleOf(override?.rule_id)
    page = findPage(pages, selected.type === 'keyword' ? `tag-${selected.node}` : selected.node)
    title = page?.title ?? selected.node
    if (page) preview = pagePath(page)
    // Ghi was a hand-picked page with a screen of its own until 0036 made it a topic; its copy came along.
    if (page?.screen === 'notes') copyKey = 'notes'
  }
  return { title, rule, preview, page, override, copyKey }
}

export function PageEditor({
  selected,
  layout,
  pages,
  postsOf,
  vocab,
  error,
  run,
  renderCopy,
  renderModule,
}: {
  selected: BlogSelected
  layout: Layout
  pages: PageRow[]
  postsOf: (id: string) => { id: string; en: string }[]
  vocab: Vocab
  error: ReactNode
  run: (fn: () => Promise<unknown>) => void
  renderCopy: (key: SystemPage) => ReactNode
  renderModule: (moduleId: string) => ReactNode
}) {
  const { rule, page, override, copyKey } = describePage(selected, layout, pages)
  const linked = ((override?.presentation ?? {}) as { module?: string }).module
  const posts = page ? postsOf(page.id) : []
  const saveRule = (patch: Partial<ListingRule>) => rule && run(() => updateRule(rule.id, patch))

  return (
    <div>
      {error}

      {rule && (
        <Section title="Quy chế" note="trang này liệt kê bài nào">
          <RuleEditor rule={rule} vocab={vocab} onChange={saveRule} />
        </Section>
      )}

      {rule?.sort === 'manual' && posts.length > 0 && (
        <Section title="Thứ tự">
          <HandOrder rule={rule} posts={posts} onChange={saveRule} />
        </Section>
      )}

      {linked && <Section title="Giao diện">{renderModule(linked)}</Section>}

      {copyKey && <Section title="Chữ cố định">{renderCopy(copyKey)}</Section>}

      {selected.kind === 'override' && (
        <div style={{ marginTop: 30 }}>
          <Button onClick={() => run(() => deleteOverride(selected.type, selected.node))}>
            bỏ cài đặt riêng, dùng quy chế chung
          </Button>
        </div>
      )}
    </div>
  )
}
