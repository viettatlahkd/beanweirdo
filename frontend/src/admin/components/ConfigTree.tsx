import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  createKeyword,
  createNode,
  deleteNode,
  getLayout,
  listKeywords,
  listTags,
  listNodes,
  colorKeyword,
  renameKeyword,
  reorderNodes,
  updateSite,
  updateNode,
  type Module,
  type Node,
  type NodeStatus,
} from '../lib/apiClient'
import { ancestorsOf, buildTree, flattenTree } from '../../lib/contentTree'
import { planMove, type DropWhere } from '../../lib/treeMove'
import { bySiteOrder } from '../../lib/moduleOrder'
import { TAG_PAGE, portPagePath, portSiteOf, toPath } from '../../lib/routes'
import { findPage, useModules } from '../../data/useModules'
import { usePortSources } from '../../portfolio/data'
import { JOURNAL_LINKS, navLinks, type NavOverride, type PortContent } from '../../portfolio/content'
import type { PresetKey } from '../../portfolio/blocks'
import { ink, paper, sans } from '../../design/tokens'
import { radius } from '../../design/controls'
import { Button, IconButton } from '../../design/Button'
import { IconClose } from '../../design/icons'
import { retireKeyword, retireTopic } from '../lib/retire'
import { Switch, desk, DetailHead, ItemList, Row, Section, WHERE_WORDS, type AddSpec, type Crumb, type DetailAction, type ItemDrag, type ListItem } from './Detail'
import { ColorField, RetireTag, RetireTopic, statusLabel, TopicFields } from './NodeFields'
import { tagColor } from '../../lib/tagColor'
import { Builder, ContentTab, PRESET_CHOICES, createFromPreset, usePortAdmin, useSplit, type PortPart } from './PortEditors'
import { ScaledPreview, useWidth } from './ScaledPreview'
import { TagBadges } from '../../components/TagBadges'
import { CONFIG_SITE_LABELS as SITE_LABELS, Item, useAdminFrame, type ConfigSite } from '../AdminShell'
import { AuthorsPanel } from './AuthorsPanel'
import {
  describePage,
  pagePath,
  NavFlags,
  NodePage,
  PageEditor,
  type BlogSelected,
  type Layout,
  type SystemPage,
  type Vocab,
} from './PageSettings'

/**
 * Cấu hình — every page of the site and every setting behind it, in one tree.
 *
 * Until 2026-10-08 there were two tabs for this, Quản lý trang and Cấu hình,
 * and the topic tree was in both (and in Nội dung): clicking "roasting"
 * opened its listing rule in one, its name and colour in the other. The owner
 * could not tell what a click acted on. They kept this tab's look and asked
 * for three things, which are the rules of the screen:
 *
 * - the tree only picks. Nothing is typed or saved on the left; a click on a
 *   card opens it on the right, and that is all a click does;
 * - everything about one thing sits together on the right — a topic's name,
 *   colour and place in the tree beside the page it gets;
 * - the public page is always previewed beside the fields.
 *
 * Later the same day the owner asked for one order and nothing without a
 * page: Mục lục and the topic tree are one card (Mục lục draws the tree), the
 * Điều hướng screen went (the sidebar follows the tree; its two switches sit
 * on each page), and so did Mẫu and Lưu trữ, which had nothing to see.
 *
 * On 2026-10-13 the owner asked for the sites to stop sharing one scroll and
 * to look and act alike: a tab per site, and every site built from the same
 * `SiteSpec` — a home card, a Mục lục whose order is the site's navigation
 * and which drags the same way, other pages, and Phần chung. A new site is a
 * new spec, not new tree code.
 *
 * Later still that day the owner asked for the values to move out of the
 * tree: the left keeps only the cards, and what a card holds (the topics,
 * the tags, the port's pages) is listed, dragged, added and deleted in the
 * detail on the right, where an item's own children are listed in turn.
 *
 * On 2026-10-14 the owner redrew what the sites are: beanweirdo is a root
 * that only points the way (its home, About, the frame every page wears, and
 * what both sites share: tags, authors, Practice), and biz and bean are two
 * independent sites cut from one pattern, each with its own home and its own
 * Mục lục. So the tabs are beanweirdo | biz | bean, the Tác giả tab moved in
 * here, and "Phần chung" — which meant the frame on the port and the borrowed
 * looks on the blog — is gone as a name. Until the data moves, biz's pages are
 * `nodes` with site 'port'; each child site's home is the block page flagged `home_of` (0035).
 *
 * On 2026-10-15 the owner took the blog out of bean into a tab of its own,
 * the journal, at `/journal`: its front page is its home, the topic
 * tree its Mục lục. bean became a block-page site like biz, its pages filed
 * under its home.
 */

type Group = 'root-toc' | 'biz-pages' | 'bean-pages' | 'frame' | 'topics' | 'tags' | 'authors' | 'modules'

type SiteId = ConfigSite

type Picked =
  | BlogSelected
  | { kind: 'group'; id: Group }
  | { kind: 'port-part'; part: PortPart }
  | { kind: 'port-page'; id: string }
  | { kind: 'topic'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'module'; id: string }
  | { kind: 'practice' }

const same = (a: Picked, b: Picked) => JSON.stringify(a) === JSON.stringify(b)

const posts = (n: number) => `${n} bài`

/** A card of the tree, which the arrow keys walk. */
const ROW = 'data-cfg-row'

function Card({ title, note, on, onClick }: { title: string; note: string; on: boolean; onClick: () => void }) {
  return (
    <Item depth={1} on={on} onClick={onClick} {...{ [ROW]: '' }}>
      <span title={note}>{title}</span>
    </Item>
  )
}

/**
 * Which part of the row the pointer is on: the top quarter and the bottom
 * quarter mean "beside", the middle half means "inside" — the wider target,
 * because filing something inside is the move this tree exists for. A broken
 * measurement answers "before", never "inside", since inside changes the
 * node's parent and with it every post address under it.
 */
function whereIn(e: { clientY: number; currentTarget: HTMLElement }, nest: boolean): DropWhere {
  const box = e.currentTarget.getBoundingClientRect()
  const part = (e.clientY - box.top) / box.height
  // A flat list has no inside: each half of the row is a side.
  if (!nest) return Number.isFinite(part) && part >= 0.5 ? 'after' : 'before'
  if (!Number.isFinite(part) || part < 0.25) return 'before'
  if (part > 0.75) return 'after'
  return 'inside'
}

type MovePlan = Exclude<ReturnType<typeof planMove>, { error: string }>

/** One row of a site's Mục lục; `parent_id` is null on a flat list. */
type TocItem = {
  id: string
  parent_id: string | null
  name: string
  dot?: string | null
  meta?: string
  picked: Picked
  movable: boolean
  /** A row that opens or is removed some other way than its pick: a journal link on beanweirdo's top bar. */
  open?: () => void
  actions?: DetailAction[]
}

type Toc = NonNullable<SiteSpec['toc']>

/** A card of the tree: what a click opens on the right. */
type CardSpec = { title: string; note: string; picked: Picked }

/**
 * What a tab of Cấu hình is made of — the one shape every tab fills in, so
 * biz and bean read and act alike (the owner's ask of 2026-10-14: the two
 * sites configured the same way). Each part is optional; a tab draws only
 * what it has, never an empty card for symmetry's sake.
 */
type SiteSpec = {
  id: SiteId
  path: string
  home?: CardSpec
  /**
   * Mục lục: the site's pages in the order its navigation shows them. `move`
   * draws a drop at once and hands back the save and its undo; `nest` says
   * whether a row can be dropped inside another.
   */
  toc?: { id: Group; title: string; note: string; items: TocItem[]; nest: boolean; move: (id: string, plan: MovePlan) => { apply: () => Promise<unknown>; revert: () => Promise<unknown> } }
  /** Everything else the tab holds, each its own card. */
  cards?: CardSpec[]
}

export function ConfigTree({
  modules,
  renderCopy,
  renderModule,
  renderPractice,
  openAuthors = false,
}: {
  /** `/ad-authors` lands here, on the authors card, since Tác giả stopped being a tab of its own. */
  openAuthors?: boolean
  modules: Module[]
  /** The fixed copy of a page the site draws with a screen of its own. */
  renderCopy: (key: SystemPage) => ReactNode
  /** The fields of a module a page still takes its looks from. */
  renderModule: (moduleId: string) => ReactNode
  /** Practice's own settings — its name and colour live in site settings, not in the blog's pages. */
  renderPractice: () => ReactNode
}) {
  const { data: pages, postsOf, reload: reloadPages } = useModules()
  const port = usePortAdmin()
  const bizHome = port.pages.find((p) => p.home_of === 'biz')
  const beanHome = port.pages.find((p) => p.home_of === 'bean')
  const src = usePortSources()
  const [layout, setLayout] = useState<Layout | null>(null)
  const [vocab, setVocab] = useState<Vocab>({ topics: [], keywords: [], kinds: [] })
  const frame = useAdminFrame()
  const site = frame.site
  // Without its home page (not loaded yet) a block-page site opens on its Mục lục.
  const homeOf = (id: SiteId): Picked => {
    if (id === 'root') return { kind: 'port-part', part: 'home' }
    if (id === 'blog') return { kind: 'system', key: 'landing' }
    const home = id === 'biz' ? bizHome : beanHome
    if (home) return { kind: 'port-page', id: home.id }
    return { kind: 'group', id: id === 'bean' ? 'bean-pages' : 'biz-pages' }
  }
  const [picked, setPicked] = useState<Picked>(() => (openAuthors ? { kind: 'group', id: 'authors' } : homeOf(site)))
  // The site is picked in the sidebar; opening another one starts on its home.
  // `/ad-authors` lands on the root site's authors card, which a site change must not reset.
  const shownSite = useRef(site)
  const keepPick = useRef(false)
  useEffect(() => {
    if (openAuthors && site !== 'root') {
      keepPick.current = true
      frame.openSite('root')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (shownSite.current === site) return
    shownSite.current = site
    if (keepPick.current) {
      keepPick.current = false
      return
    }
    setPicked(homeOf(site))
    setDragging(null)
    setDropAt(null)
  }, [site]) // eslint-disable-line react-hooks/exhaustive-deps
  const [err, setErr] = useState<string | null>(null)
  // The delete panel is open for one pick, so another pick closes it and a
  // row's "Xoá…" can open its item with the panel already showing.
  const [retiringFor, setRetiringFor] = useState<string | null>(null)
  const retiring = retiringFor === JSON.stringify(picked)
  const retire = (p: Picked) => {
    setPicked(p)
    setRetiringFor(JSON.stringify(p))
  }
  const [round, setRound] = useState(0)
  const [portRound, setPortRound] = useState(0)
  const [undo, setUndo] = useState<{ msg: string; saving: boolean; revert: () => Promise<unknown> } | null>(null)

  // The divider drags and its width is remembered, for long forms.
  const split = useSplit('cfg-v1', 520, 'left', 360, 900)
  const [root, width] = useWidth<HTMLDivElement>()
  // Wide: fields and preview side by side. Narrower: the preview goes under the fields.
  const wide = width === 0 || width >= 960
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  const editor = useRef<HTMLDivElement>(null)
  // Side by side, the fields scroll on their own; stacked, a pick far down the
  // tree would open its fields out of sight, so bring them into view.
  useEffect(() => {
    const top = editor.current?.getBoundingClientRect().top ?? 0
    if (!wide && (top < 0 || top > window.innerHeight - 80)) editor.current?.scrollIntoView?.({ block: 'start' })
  }, [picked]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Fixed port copy autosaves after typing rests; reload its preview after that, not per keystroke.
    const t = setTimeout(() => setPortRound((r) => r + 1), 1200)
    return () => clearTimeout(t)
  }, [port.content])

  const loadLayout = () => getLayout().then(setLayout)
  const loadVocab = () => Promise.all([listNodes('blog'), listKeywords(), listTags()]).then(([topics, keywords, kinds]) => setVocab({ topics, keywords, kinds }))
  useEffect(() => {
    loadLayout().catch((e: Error) => setErr(e.message))
    loadVocab().catch((e: Error) => setErr(e.message))
  }, [])

  /** Every write: save, then read everything the tree and the preview draw from again. */
  const run = (fn: () => Promise<unknown>) =>
    void fn()
      .then(() => setErr(null))
      .catch((e: Error) => setErr(e.message))
      .finally(() => {
        void loadLayout().catch(() => {})
        void loadVocab().catch(() => {})
        reloadPages()
        setRound((r) => r + 1)
      })

  // ── the Mục lục drag, the same for every site ──────────────────────
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<{ id: string; where: DropWhere } | null>(null)
  // The order a site's tree is drawn in, which `planMove` keeps for everything it does not move.
  const inTreeOrder = (rows: Node[]) => flattenTree(buildTree([...rows].sort((a, b) => a.sort_order - b.sort_order))).map((n) => n.row)
  const sorted = [...vocab.topics].sort((a, b) => a.sort_order - b.sort_order)
  const shownTopics = inTreeOrder(vocab.topics)
  const shownPort = inTreeOrder(port.pages)
  // biz's pages are those under no other site's home; bean's sit under bean's home.
  const portOf = (pg: Node) => portSiteOf(pg, port.pages)
  const shownBiz = shownPort.filter((pg) => portOf(pg) === 'biz')
  const shownBean = shownPort.filter((pg) => portOf(pg) === 'bean')

  /** Draws a move before the server has it; the reload after the save replaces this with what was stored. */
  const placeIn = (set: (f: (rows: Node[]) => Node[]) => void) => (id: string, parentId: string | null, order: string[]) =>
    set((rows) =>
      rows.map((t) => {
        const at = order.indexOf(t.id)
        return { ...t, ...(at >= 0 ? { sort_order: at + 1 } : {}), ...(t.id === id ? { parent_id: parentId } : {}) }
      }),
    )

  // The tree moves the moment a row is dropped. Saving takes calls across the
  // ocean (Vercel in the US, the database in Tokyo) and then a reload; waiting
  // for all that before redrawing made the owner think the drop had failed.
  // biz and bean are both rows of `nodes`, so one move serves both.
  const moveNodeIn = (rows: Node[], shown: Node[], set: (f: (rows: Node[]) => Node[]) => void) => (id: string, p: MovePlan) => {
    const placeLocally = placeIn(set)
    const from = rows.find((t) => t.id === id)?.parent_id ?? null
    const oldOrder = shown.map((t) => t.id)
    placeLocally(id, p.parentId, p.order)
    return {
      // Parent first: the order only means anything once the node sits where it is going.
      apply: async () => {
        if (from !== p.parentId) await updateNode(id, { parent_id: p.parentId })
        await reorderNodes(p.order)
      },
      revert: async () => {
        placeLocally(id, from, oldOrder)
        if (from !== p.parentId) await updateNode(id, { parent_id: from })
        await reorderNodes(oldOrder)
      },
    }
  }
  const moveTopic = moveNodeIn(vocab.topics, shownTopics, (f) => setVocab((v) => ({ ...v, topics: f(v.topics) })))
  const movePortPage = moveNodeIn(port.pages, shownPort, port.setPages)
  // bean's Mục lục lists its home's children as its top level, so its top is under the home.
  const moveBeanPage = (id: string, p: MovePlan) => movePortPage(id, { ...p, parentId: p.parentId ?? beanHome?.id ?? null })

  // beanweirdo's top bar order is its header links (`navLinks`): a drop rewrites
  // that list, keeping each link's own label and hidden flag, and home where it was.
  const portLinks = port.loaded ? navLinks(port.content, port.pages) : []
  const setHeader = (header: PortContent['header']) => port.setContentStored((s) => ({ ...s, header }))
  const movePortLink = (_id: string, p: MovePlan) => {
    const before = port.content.header
    const keys = p.order.filter((k) => k !== 'home' && portLinks.some((l) => l.key === k))
    keys.splice(Math.max(0, portLinks.findIndex((l) => l.key === 'home')), 0, 'home')
    const header = { ...before, links: keys.map((key) => before.links.find((o) => o.key === key) ?? { key }) }
    setHeader(header)
    return {
      apply: () => updateSite({ portfolio: { header } } as never),
      revert: async () => {
        setHeader(before)
        await updateSite({ portfolio: { header: before } } as never)
      },
    }
  }

  // Adding to the top bar: a journal page joins it, a page or About hidden from it shows again.
  const saveLinks = (links: NavOverride[]) => {
    const header = { ...port.content.header, links }
    setHeader(header)
    run(() => updateSite({ portfolio: { header } } as never))
  }
  const storedLinks = () => portLinks.map((l) => port.content.header.links.find((o) => o.key === l.key) ?? { key: l.key })
  const addLink = (key: string) =>
    saveLinks(portLinks.some((l) => l.key === key) ? storedLinks().map((o) => (o.key === key ? { ...o, hidden: false } : o)) : [...storedLinks(), { key }])
  const dropLink = (key: string) => saveLinks(storedLinks().filter((o) => o.key !== key))
  const linkChoices = [
    ...Object.entries(JOURNAL_LINKS)
      .filter(([key]) => !portLinks.some((l) => l.key === key))
      .map(([key, j]) => ({ value: key, label: `${j.label} · ${j.href()}` })),
    ...portLinks.filter((l) => l.hidden && l.key !== 'home').map((l) => ({ value: l.key, label: `${l.label} · ${l.href} · đang ẩn` })),
  ]
  // A journal row opens the journal's own tab, on the page it links.
  const openJournal = (to: Picked) => () => {
    keepPick.current = true
    frame.openSite('blog')
    setPicked(to)
  }

  const titleOf = (items: TocItem[], id: string | null) => (id ? (items.find((t) => t.id === id)?.name ?? id) : 'tầng trên cùng')

  /** `shown` is the whole Mục lục in drawn order, even where only one level of it is listed. */
  const dragOf = (toc: Toc, shown: TocItem[], id: string): ItemDrag => {
    const plan = (target: string, where: DropWhere) => (dragging ? planMove(shown, dragging, target, where) : null)
    const drop = (target: string, where: DropWhere) => {
      const moved = dragging
      const p = plan(target, where)
      setDragging(null)
      setDropAt(null)
      if (!moved || !p) return
      if ('error' in p) return setErr(p.error)
      const msg = `Đã chuyển ${titleOf(shown, moved)} ${WHERE_WORDS[where]} ${titleOf(shown, target)}`
      const m = toc.move(moved, p)
      setUndo({ msg, saving: true, revert: m.revert })
      run(async () => {
        await m.apply()
        setUndo((u) => u && { ...u, saving: false })
      })
    }
    return {
      onDragStart: (e) => {
        e.dataTransfer?.setData('text/plain', id)
        setDragging(id)
      },
      onDragOver: (e) => {
        if (!dragging) return
        e.preventDefault()
        const where = whereIn(e, toc.nest)
        const p = plan(id, where)
        if (!p || 'error' in p) return dropAt && setDropAt(null)
        if (dropAt?.id !== id || dropAt.where !== where) setDropAt({ id, where })
      },
      onDragLeave: () => dropAt?.id === id && setDropAt(null),
      onDrop: (e) => {
        e.preventDefault()
        drop(id, whereIn(e, toc.nest))
      },
      onDragEnd: () => (setDragging(null), setDropAt(null)),
      dragging: dragging === id,
      mark: dropAt?.id === id && dragging !== id ? dropAt.where : null,
    }
  }

  // ── the arrow keys walk the cards of the tree ──────────────────────────
  const walk = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>(`[${ROW}]`)]
    const at = rows.indexOf(document.activeElement as HTMLElement)
    const next = rows[at + (e.key === 'ArrowDown' ? 1 : -1)]
    if (!next) return
    e.preventDefault()
    next.focus()
  }

  if (!layout) return <div style={{ padding: '34px 56px', fontFamily: sans, fontSize: 13, color: ink.muted }}>{err ?? 'Đang tải…'}</div>

  const errorLine = err && (
    <div role="alert" style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: ink.danger, background: desk.panel, border: `1px solid ${ink.dangerLine}`, borderRadius: radius, padding: '10px 14px', margin: '14px 0 0' }}>
      {err}
    </div>
  )

  const overrideOf = (type: 'topic' | 'keyword', id: string) => layout.overrides.find((o) => o.node_type === type && o.node_id === id)
  // One count per node, the one its settings show too: the posts filed under it.
  const leafMeta = (type: 'topic' | 'keyword', id: string, n: number) => `${overrideOf(type, id) ? 'riêng · ' : ''}${posts(n)}`
  // Every site's rows say the same things the same way: a state other than live first, then where it is.
  const tocMeta = (status: NodeStatus, rest: string, hidden = false) =>
    [status !== 'published' ? statusLabel(status) : hidden ? 'ẩn' : '', rest].filter(Boolean).join(' · ')
  // A port page's dot: its own colour, else the colour of the look it wears.
  const portDot = (pg: Node) => pg.accent ?? port.design.palettes[pg.look ?? 'biz']?.c500 ?? null
  // Tags have no order of their own; by name, so a long list can be scanned.
  const tags = [...vocab.keywords].sort((a, b) => a.label.localeCompare(b.label, 'vi'))
  // The page that wears a module's looks, if any: the one to preview it on.
  const wearer = (id: string) => findPage(pages, id)
  const pick = (p: Picked) => () => setPicked(p)
  const on = (p: Picked) => same(picked, p)

  const moduleRows = flattenTree(buildTree([...modules].sort(bySiteOrder)))

  // ── the sites, each one spec ─────────────────────────────────────────────
  const topicToc: Toc = {
    id: 'topics',
    title: 'Mục lục',
    note: `${shownTopics.filter((t) => t.parent_id === null).length} subject · theo thứ tự của thanh bên và trang Mục lục`,
    nest: true,
    move: moveTopic,
    // Ghi and tư duy tư duy are subjects since 0036: a hand-picked page is a node with a rule of its own.
    items: shownTopics.map((t): TocItem => ({
      id: t.id,
      parent_id: t.parent_id,
      name: t.title,
      dot: t.accent ?? ancestorsOf(sorted, t.id).reverse().find((a) => a.accent)?.accent ?? null,
      meta: tocMeta(t.status, leafMeta('topic', t.id, t.posts)),
      picked: { kind: 'topic', id: t.id },
      movable: true,
    })),
  }

  // A block-page site's Mục lục: its pages but the home, the home's children at the top.
  const portToc = (id: Group, name: string, rows: Node[], home: Node | undefined, move: Toc['move']): Toc => {
    const items = rows
      .filter((pg) => !pg.home_of)
      .map((pg): TocItem => ({ id: pg.id, parent_id: home && pg.parent_id === home.id ? null : pg.parent_id, name: pg.title, dot: portDot(pg), meta: tocMeta(pg.status, portPagePath(pg, port.pages)), picked: { kind: 'port-page', id: pg.id }, movable: true }))
    return { id, title: 'Mục lục', note: `${items.filter((r) => r.parent_id === null).length} mục · cây trang của ${name}`, nest: true, move, items }
  }
  const bizToc = portToc('biz-pages', 'biz', shownBiz, bizHome, movePortPage)
  const beanToc = portToc('bean-pages', 'bean', shownBean, beanHome, moveBeanPage)
  const tocOfPage = (pg: Node) => (portOf(pg) === 'bean' ? beanToc : bizToc)
  const portHome = (title: string, home: Node | undefined): CardSpec | undefined =>
    home && { title, note: `${portPagePath(home)} · ${home.title}`, picked: { kind: 'port-page', id: home.id } }

  const bizSite: SiteSpec = { id: 'biz', path: '/biz/…', home: portHome('Trang chủ biz', bizHome), toc: bizToc }
  const beanSite: SiteSpec = { id: 'bean', path: `${toPath({ area: 'public', screen: 'portfolioPage', site: 'bean' })}/…`, home: portHome('Trang chủ bean', beanHome), toc: beanToc }

  const blogPath = toPath({ area: 'public', screen: 'landing' })
  const blogSite: SiteSpec = {
    id: 'blog',
    path: `${blogPath}/…`,
    // The blog's front page, called details until it got its own address (2026-10-15).
    home: { title: 'Trang chủ', note: `${blogPath} · nhãn trên cùng, tên lớn, hai đoạn dẫn`, picked: { kind: 'system', key: 'landing' } },
    toc: topicToc,
    cards: [{ title: 'Hình trang', note: 'dàn trang, ảnh và chữ mà một trang mượn', picked: { kind: 'group', id: 'modules' } }],
  }

  // beanweirdo's Mục lục is its top bar: the doors to the sites, then About, in the bar's order.
  const rootToc: Toc = {
    id: 'root-toc',
    title: 'Mục lục',
    note: 'các mục trên thanh trên, theo thứ tự của thanh',
    nest: false,
    move: movePortLink,
    items: portLinks.flatMap((l): TocItem[] => {
      if (l.key === 'about') return [{ id: l.key, parent_id: null, name: 'About', dot: null, meta: tocMeta('published', '/about', l.hidden), picked: { kind: 'port-part', part: 'about' }, movable: true }]
      const j = JOURNAL_LINKS[l.key]
      if (j) {
        const to: Picked = l.key === 'journal:index' ? { kind: 'group', id: 'topics' } : { kind: 'system', key: 'landing' }
        return [{ id: l.key, parent_id: null, name: l.label, dot: null, meta: tocMeta('published', l.href, l.hidden), picked: to, movable: true, open: openJournal(to), actions: [{ label: 'Gỡ khỏi thanh trên', danger: true, onPick: () => dropLink(l.key) }] }]
      }
      const pg = port.pages.find((x) => `page:${x.id}` === l.key)
      return pg ? [{ id: l.key, parent_id: null, name: l.label, dot: portDot(pg), meta: tocMeta(pg.status, portPagePath(pg), l.hidden), picked: { kind: 'port-page', id: pg.id }, movable: true }] : []
    }),
  }

  const rootSite: SiteSpec = {
    id: 'root',
    path: '/',
    home: { title: 'Trang chủ', note: 'Lời chào và các khối của trang /', picked: { kind: 'port-part', part: 'home' } },
    toc: rootToc,
    cards: [
      { title: 'Khung chung', note: 'thanh trên, chân trang: mọi trang đều mang', picked: { kind: 'group', id: 'frame' } },
      // Tags and authors are filed on posts of both sites (owner, 2026-10-13 and -14): one list, at the root.
      { title: 'Tag', note: `${vocab.keywords.length} tag, dùng chung cho mọi site`, picked: { kind: 'group', id: 'tags' } },
      { title: 'Tác giả', note: 'người đứng tên bài, dùng chung cho mọi site', picked: { kind: 'group', id: 'authors' } },
      { title: 'Ghi 02', note: 'Practice · nhật ký giờ luyện, sau đăng nhập', picked: { kind: 'practice' } },
    ],
  }

  const spec = { root: rootSite, biz: bizSite, bean: beanSite, blog: blogSite }[site]

  /** The card a pick belongs to, lit while anything inside it is open on the right. */
  const groupOf = (p: Picked): Group | null => {
    switch (p.kind) {
      case 'group':
        return p.id
      case 'topic':
        return 'topics'
      case 'tag':
        return 'tags'
      case 'module':
        return 'modules'
      case 'port-page':
      {
        if (site === 'root') return 'root-toc'
        const pg = port.pages.find((x) => x.id === p.id)
        return !pg || pg.home_of ? null : tocOfPage(pg).id
      }
      case 'port-part':
        return p.part === 'about' ? 'root-toc' : p.part === 'home' ? null : 'frame'
      default:
        return null
    }
  }

  /** The cards of one tab, drawn from its spec: the same cards for every site. */
  const siteTree = ({ id, path, home, toc, cards = [] }: SiteSpec) => {
    const card = (c: CardSpec) => {
      const g = c.picked.kind === 'group' ? c.picked.id : null
      return <Card key={c.title} title={c.title} note={c.note} on={g ? groupOf(picked) === g : on(c.picked)} onClick={pick(c.picked)} />
    }
    return (
      <section aria-label={SITE_LABELS[id]} title={path} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {home && card(home)}
        {toc && card({ title: toc.title, note: toc.note, picked: { kind: 'group', id: toc.id } })}
        {cards.map(card)}
      </section>
    )
  }

  // Drawn in the sidebar, under the open site.
  const tree = frame.slot
    ? createPortal(
        <nav aria-label="Cây cấu hình" onKeyDown={walk} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0 6px' }}>
          {siteTree(spec)}
        </nav>,
        frame.slot,
      )
    : null

  // ── the right side: one template for every item (`Detail.tsx`) and the public page beside it ──
  let crumbs: Crumb[] = []
  let title = ''
  let rename: ((v: string) => void) | undefined
  let address = ''
  let facts: string[] = []
  let actions: DetailAction[] = []
  let preview = ''
  let previewKey = round
  let body: ReactNode = null

  const fixed = (why: string): DetailAction[] => [{ label: 'Xoá', danger: true, off: why }]
  const undoable = (fn: () => Promise<{ msg: string; revert: () => Promise<unknown> }>, then: () => void) =>
    run(async () => {
      const r = await fn()
      setRetiringFor(null)
      then()
      setUndo({ msg: r.msg, saving: false, revert: r.revert })
    })
  const page = (sel: BlogSelected) => (
    <PageEditor
      key={JSON.stringify(sel)}
      selected={sel}
      layout={layout}
      pages={pages}
      postsOf={postsOf}
      vocab={vocab}
      error={errorLine}
      run={run}
      renderCopy={renderCopy}
      renderModule={renderModule}
    />
  )
  const nodePage = (type: 'topic' | 'keyword', node: string) => (
    <NodePage
      type={type}
      node={node}
      layout={layout}
      pages={pages}
      postsOf={postsOf}
      vocab={vocab}
      error={errorLine}
      run={run}
      renderCopy={renderCopy}
      renderModule={renderModule}
    />
  )
  const siteCrumb = (id: SiteId): Crumb => ({ label: SITE_LABELS[id], open: pick(homeOf(id)) })
  const groupCrumb = (id: Group, label: string): Crumb => ({ label, open: pick({ kind: 'group', id }) })

  /**
   * How an item is deleted — the same from its own ⋮ and from its row's ⋮ in
   * the list it sits in. Topics and tags first ask where their posts go, so
   * their row opens the item with that panel showing.
   */
  const deleteOf = (p: Picked): DetailAction[] | undefined => {
    switch (p.kind) {
      case 'topic':
        return [{ label: 'Xoá…', danger: true, onPick: () => retire(p) }]
      case 'tag':
        return [{ label: 'Xoá hay gộp…', danger: true, onPick: () => retire(p) }]
      case 'port-page': {
        const pg = port.pages.find((x) => x.id === p.id)
        if (!pg) return undefined
        return [
          {
            label: 'Xoá trang…',
            danger: true,
            onPick: () => {
              if (!window.confirm(`Xoá trang “${pg.title}”? Thao tác này không hoàn tác được.`)) return
              run(async () => {
                await deleteNode(pg.id)
                port.setPages((ps) => ps.filter((x) => x.id !== pg.id))
                setPicked((cur) => (same(cur, p) ? { kind: 'group', id: tocOfPage(pg).id } : cur))
              })
            },
          },
        ]
      }
      default:
        return undefined
    }
  }

  /** Rows of a Mục lục as the right-hand list draws them: dragged by their grip, deleted from their ⋮. */
  const tocList = (toc: Toc, rows: TocItem[]): ListItem[] =>
    rows.map((r) => ({ id: r.id, name: r.name, meta: r.meta, dot: r.dot, onOpen: r.open ?? pick(r.picked), drag: r.movable ? dragOf(toc, toc.items.filter((x) => x.movable), r.id) : undefined, actions: r.actions ?? deleteOf(r.picked) }))
  const dragNote = (nest: boolean) => (nest ? 'kéo ⠿ để đổi chỗ hay đưa vào trong' : 'kéo ⠿ để đổi chỗ')
  const newPortPage = async (name: string, key: PresetKey, parentId: string | null = null) => {
    const p = await createFromPreset(key, name, port.pages, src.moduleIds, parentId)
    port.setPages((ps) => [...ps, p])
    return p
  }
  // A block-page site's Mục lục adds the way the blog's does: at the top (under the site's home), or inside the page being edited.
  const addPortPage = (parent: Node | undefined): AddSpec => ({
    label: parent && !parent.home_of ? 'Thêm mục con' : 'Thêm trang',
    placeholder: parent && !parent.home_of ? `tên trang mới trong ${parent.title}` : 'tên trang mới',
    choose: { label: 'bắt đầu từ', options: PRESET_CHOICES },
    onSave: (name, key) =>
      run(async () => {
        const p = await newPortPage(name, (key ?? 'blank') as PresetKey, parent?.id ?? null)
        setPicked({ kind: 'port-page', id: p.id })
      }),
  })
  const addTopic = (parent: Node | null): AddSpec => ({
    label: parent ? 'Thêm mục con' : 'Thêm subject',
    placeholder: parent ? `tên mục mới trong ${parent.title}` : 'tên subject',
    onSave: (name) => run(() => createNode({ site: 'blog', title: name, parent_id: parent?.id ?? null })),
  })

  /**
   * A port page's two switches, named as a blog subject's are: on the top bar
   * (the header link's hidden flag) and on the port home (its feature cards).
   * Only a published page is on either.
   */
  const portFlags = (p: Node): ReactNode => {
    if (p.status === 'archived')
      return (
        <Row label="Hiện trên menu">
          <span style={{ color: ink.soft }}>chỉ trang đã đăng mới lên thanh trên và trang chủ</span>
        </Row>
      )
    const { header, home } = port.content
    const published = port.pages.filter((x) => x.status === 'published')
    const link = portLinks.find((l) => l.key === `page:${p.id}`)
    const features = home.features.length ? home.features : published.map((x) => ({ pageId: x.id, label: '', intro: '', image: '' }))
    const save = (patch: Partial<PortContent>) => {
      port.setContentStored((st) => ({ ...st, ...patch }))
      run(() => updateSite({ portfolio: patch } as never))
    }
    const setMenu = (on: boolean) =>
      save({ header: { ...header, links: portLinks.map((l) => ({ key: l.key, label: l.label, hidden: l.key === `page:${p.id}` ? !on : l.hidden })) } })
    const setHome = (on: boolean) =>
      save({ home: { ...home, features: on ? [...features, { pageId: p.id, label: '', intro: '', image: '' }] : features.filter((f) => f.pageId !== p.id) } })
    // A draft can already hold its home block (added from Trang chủ port's "+ Thêm khối"),
    // so its switch shows the same list; the public home waits for it to be published.
    return (
      <>
        {p.status === 'published' ? (
          <Row label="Hiện trên menu">
            <Switch label="Hiện trên menu" value={!!link && !link.hidden} onChange={setMenu} />
          </Row>
        ) : (
          <Row label="Hiện trên menu">
            <span style={{ color: ink.soft }}>lên thanh trên khi trang được đăng</span>
          </Row>
        )}
        <Row label="Hiện ở trang chủ">
          <Switch label="Hiện ở trang chủ" value={features.some((f) => f.pageId === p.id)} onChange={setHome} />
        </Row>
      </>
    )
  }

  switch (picked.kind) {
    case 'port-part': {
      // Only home and About are picked: the top bar and footer open together as Khung chung, and
      // the signature, which only About shows, opens with About.
      const about = picked.part === 'about'
      const part = (only: PortPart) => <ContentTab key={only} only={only} content={port.content} setStored={port.setContentStored} pages={port.pages} onNewPage={newPortPage} />
      title = about ? 'About' : 'Trang chủ'
      crumbs = [siteCrumb('root'), ...(about ? [groupCrumb('root-toc', 'Mục lục')] : [])]
      preview = toPath({ area: 'public', screen: about ? 'portfolioAbout' : 'portfolioHome' })
      address = preview
      actions = fixed('trang hệ thống, không xoá được')
      previewKey = portRound
      body = port.loaded ? (
        <>
          <Section title="Nội dung trang">{part(about ? 'about' : 'home')}</Section>
          {about && <Section title="Signature">{part('sign')}</Section>}
        </>
      ) : null
      break
    }
    case 'port-page': {
      const p = port.pages.find((x) => x.id === picked.id)
      if (!p) break
      const kids = port.pages.filter((x) => x.parent_id === p.id)
      const own = portOf(p)
      const toc = tocOfPage(p)
      crumbs = p.home_of
        ? [siteCrumb(p.home_of)]
        : [siteCrumb(own), groupCrumb(toc.id, 'Mục lục'), ...ancestorsOf(shownPort, p.id).filter((x) => !x.home_of).map((x): Crumb => ({ label: x.title, open: pick({ kind: 'port-page', id: x.id }) }))]
      title = p.title
      rename = (v) => run(async () => {
        const next = await updateNode(p.id, { title: v })
        port.setPages((ps) => ps.map((x) => (x.id === next.id ? next : x)))
      })
      address = p.status === 'published' ? portPagePath(p, port.pages) : ''
      facts = [statusLabel(p.status)]
      actions = deleteOf(picked) ?? []
      // The builder draws its own live preview of the unsaved page into the preview column.
      body = (
        <>
          {errorLine}
          <Builder
            key={p.id}
            page={p}
            design={port.design}
            src={src}
            content={port.content}
            pages={port.pages}
            onSaved={(next) => port.setPages((ps) => ps.map((x) => (x.id === next.id ? next : x)))}
            previewSlot={slot}
            flags={portFlags(p)}
          />
          {/* A home's children are its site's Mục lục, listed and added there. */}
          {!p.home_of && (
            <Section title="Mục con" note={kids.length ? `${kids.length} · ${dragNote(true)}` : undefined}>
              <ItemList label="Mục con" items={tocList(toc, toc.items.filter((r) => r.parent_id === p.id))} add={addPortPage(p)} />
            </Section>
          )}
        </>
      )
      break
    }
    case 'system': {
      const d = describePage(picked, layout, pages)
      crumbs = [siteCrumb('blog')]
      title = picked.key === 'landing' ? 'Trang chủ' : d.title
      preview = d.preview
      address = d.preview
      actions = fixed('trang hệ thống, không xoá được')
      body = page(picked)
      break
    }
    case 'override':
      // Not opened from the tree: a node's own settings show inside its topic or tag.
      break
    case 'topic': {
      const t = vocab.topics.find((x) => x.id === picked.id)
      if (!t) break
      const kids = sorted.filter((x) => x.parent_id === t.id)
      crumbs = [siteCrumb('blog'), groupCrumb('topics', 'Mục lục'), ...ancestorsOf(sorted, t.id).map((x): Crumb => ({ label: x.title, open: pick({ kind: 'topic', id: x.id }) }))]
      title = t.title
      rename = (v) => run(() => updateNode(t.id, { title: v }))
      const drawn = findPage(pages, t.id)
      address = drawn ? pagePath(drawn) : toPath({ area: 'public', screen: 'module', moduleId: t.id })
      preview = address
      facts = [posts(t.posts), statusLabel(t.status)]
      actions = deleteOf(picked) ?? []
      body = (
        <>
          {errorLine}
          {retiring && (
            <RetireTopic
              topic={t}
              tree={shownTopics}
              kids={kids.length}
              count={t.posts}
              onCancel={() => setRetiringFor(null)}
              onRetire={(to) => undoable(() => retireTopic(t, to, vocab.topics), () => setPicked({ kind: 'group', id: 'topics' }))}
            />
          )}
          <Section title="Thông tin">
            <TopicFields
              key={t.id}
              topic={t}
              parent={t.parent_id ? vocab.topics.find((x) => x.id === t.parent_id) : undefined}
              tree={shownTopics}
              used={[...new Set(vocab.topics.map((x) => x.accent).filter((c): c is string => !!c))]}
              save={(patch) => run(() => updateNode(t.id, patch))}
            />
            <NavFlags layout={layout} navRef={`topic:${t.id}`} defaults={{ sidebar: true, home: t.parent_id === null }} run={run} />
          </Section>
          <Section title="Mục con" note={kids.length ? `${kids.length} · ${dragNote(true)}` : undefined}>
            <ItemList label="Mục con" items={tocList(topicToc, topicToc.items.filter((r) => r.parent_id === t.id))} add={addTopic(t)} />
          </Section>
          <Section title="Nội dung trang">{nodePage('topic', t.id)}</Section>
        </>
      )
      break
    }
    case 'tag': {
      const k = vocab.keywords.find((x) => x.id === picked.id)
      if (!k) break
      crumbs = [siteCrumb('root'), groupCrumb('tags', 'Tag')]
      title = k.label
      rename = (v) => run(() => renameKeyword(k.id, v))
      address = toPath({ area: 'public', screen: 'module', moduleId: `${TAG_PAGE}${k.id}` })
      preview = address
      facts = [posts(k.posts)]
      actions = deleteOf(picked) ?? []
      body = (
        <>
          {errorLine}
          {retiring && (
            <RetireTag
              tag={k}
              others={tags.filter((x) => x.id !== k.id)}
              count={k.posts}
              onCancel={() => setRetiringFor(null)}
              onRetire={(to) => undoable(() => retireKeyword(k, to), () => setPicked({ kind: 'group', id: 'tags' }))}
            />
          )}
          <Section title="Thông tin">
            <ColorField
              value={k.color ?? null}
              fallback={tagColor(k.id)}
              fallbackLabel="màu tự chọn"
              used={tags.flatMap((x) => (x.color ? [x.color] : []))}
              onChange={(hex) => run(() => colorKeyword(k.id, hex))}
            />
            <Row label="Hiện trên bài">
              <TagBadges tags={[{ id: k.id, label: k.label, color: tagColor(k.id, k.color) }]} />
            </Row>
            {/* The tag's own page and its menu switches are the blog's; the block-page sites only wear the badge. */}
            {<NavFlags layout={layout} navRef={`tag:${k.id}`} defaults={{ sidebar: false, home: false }} run={run} />}
          </Section>
          <Section title="Trang của tag trên journal">{nodePage('keyword', k.id)}</Section>
        </>
      )
      break
    }
    case 'module': {
      crumbs = [siteCrumb('blog'), groupCrumb('modules', 'Hình trang')]
      title = modules.find((m) => m.id === picked.id)?.title ?? picked.id
      actions = fixed('hình trang chỉ sửa được; trang nào mượn thì đổi ở trang ấy')
      // A module is not a page of its own since the pages moved onto the topic
      // tree; it is previewed on the page that wears it.
      const w = wearer(picked.id)
      if (w) preview = w.screen === 'notes' ? toPath({ area: 'public', screen: 'notes' }) : toPath({ area: 'public', screen: 'module', moduleId: w.id })
      facts = [!w ? 'chưa trang nào mượn' : w.source === 'module' ? 'trang của riêng nó' : `trang ${w.title} đang mượn`]
      body = <Section title="Giao diện">{renderModule(picked.id)}</Section>
      break
    }
    case 'practice':
      crumbs = [siteCrumb('root')]
      title = 'Ghi 02'
      preview = toPath({ area: 'practice', screen: 'hours' })
      address = preview
      actions = fixed('trang hệ thống, không xoá được')
      body = <Section title="Thông tin">{renderPractice()}</Section>
      break
    case 'group': {
      const g = picked.id
      actions = fixed('nhóm của site, không xoá được; xoá từng mục bên trong')
      if (g === 'root-toc') {
        crumbs = [siteCrumb('root')]
        title = 'Mục lục'
        preview = '/'
        facts = [`${rootToc.items.length} mục`]
        body = (
          <>
            {errorLine}
            <Section title="Thanh trên" note={`theo thứ tự thanh trên · ${dragNote(false)}`}>
              <ItemList label="Thanh trên" items={tocList(rootToc, rootToc.items)} add={{ ...addPortPage(undefined), label: 'Thêm mục', existing: { options: linkChoices, onPick: addLink } }} />
            </Section>
          </>
        )
      } else if (g === 'biz-pages' || g === 'bean-pages') {
        const bean = g === 'bean-pages'
        const toc = bean ? beanToc : bizToc
        crumbs = [siteCrumb(bean ? 'bean' : 'biz')]
        title = 'Mục lục'
        facts = [`${toc.items.length} trang`]
        body = (
          <>
            {errorLine}
            <Section title="Các mục" note={dragNote(true)}>
              <ItemList label="Các mục" items={tocList(toc, toc.items.filter((r) => r.parent_id === null))} add={addPortPage(bean ? beanHome : undefined)} />
            </Section>
          </>
        )
      } else if (g === 'topics') {
        crumbs = [siteCrumb('blog')]
        title = 'Mục lục'
        preview = toPath({ area: 'public', screen: 'home' })
        address = preview
        const subjects = sorted.filter((t) => t.parent_id === null)
        facts = [`${subjects.length} subject`]
        body = (
          <>
            {errorLine}
            <Section title="Các mục" note={`theo thứ tự thanh bên · ${dragNote(true)}`}>
              <ItemList label="Các mục" items={tocList(topicToc, topicToc.items.filter((r) => r.parent_id === null))} add={addTopic(null)} />
            </Section>
            <Section title="Chữ cố định">{renderCopy('index')}</Section>
          </>
        )
      } else if (g === 'tags') {
        crumbs = [siteCrumb('root')]
        title = 'Tag'
        facts = [`${tags.length} tag`]
        body = (
          <>
            {errorLine}
            <Section title="Các tag" note="xếp theo tên · dùng chung cho mọi site">
              <ItemList
                label="Các tag"
                items={tags.map((k) => ({ id: k.id, name: `#${k.label}`, dot: tagColor(k.id, k.color), meta: leafMeta('keyword', k.id, k.posts), onOpen: pick({ kind: 'tag', id: k.id }), actions: deleteOf({ kind: 'tag', id: k.id }) }))}
                add={{ label: 'Thêm tag', placeholder: 'tên tag', onSave: (label) => run(() => createKeyword(label)) }}
              />
            </Section>
          </>
        )
      } else if (g === 'authors') {
        crumbs = [siteCrumb('root')]
        title = 'Tác giả'
        body = <AuthorsPanel />
      } else if (g === 'frame') {
        crumbs = [siteCrumb('root')]
        title = 'Khung chung'
        preview = '/'
        previewKey = portRound
        body = port.loaded ? (
          <>
            <Section title="Thanh trên">
              <ContentTab key="header" only="header" content={port.content} setStored={port.setContentStored} pages={port.pages} onNewPage={newPortPage} />
            </Section>
            <Section title="Chân trang">
              <ContentTab key="footer" only="footer" content={port.content} setStored={port.setContentStored} pages={port.pages} onNewPage={newPortPage} />
            </Section>
          </>
        ) : null
      } else {
        crumbs = [siteCrumb('blog')]
        title = 'Hình trang'
        body = (
          <Section title="Hình trang" note="dàn trang, ảnh và chữ mà một trang mượn">
            <ItemList label="Hình trang" items={moduleRows.map(({ row, depth }) => ({ id: row.id, name: row.title, depth, dot: row.accent, meta: wearer(row.id) ? undefined : 'chưa dùng', onOpen: pick({ kind: 'module', id: row.id }) }))} />
          </Section>
        )
      }
      break
    }
  }

  const header = <DetailHead crumbs={crumbs} title={title} rename={rename} address={address} facts={facts} actions={actions} />

  // The port builder draws its own preview into the slot; everything else gets the public page.
  const previewPane =
    slot && picked.kind !== 'port-page'
      ? createPortal(
          preview ? (
            <ScaledPreview>
              <iframe key={`${preview}#${previewKey}`} title={`xem trước ${title}`} src={preview} style={{ width: '100%', height: '100%', border: 0 }} />
            </ScaledPreview>
          ) : (
            <div style={{ padding: 24, fontFamily: sans, fontSize: 13, color: ink.muted }}>Mục này không có trang riêng để xem trước.</div>
          ),
          slot,
        )
      : null

  const previewStyle = { background: paper.white, border: `1px solid ${paper.rule}`, borderRadius: radius, overflow: 'hidden', pointerEvents: split.dragging ? 'none' : undefined } as const

  return (
    <div
      ref={root}
      style={{
        display: 'grid',
        gridTemplateColumns: wide ? split.columns : 'minmax(0, 1fr)',
        // Each cell keeps its own height, which is what lets the preview stick.
        alignItems: 'start',
        columnGap: 12,
        rowGap: 20,
        padding: wide ? '8px 28px 120px' : '8px 16px 90px',
      }}
    >
      {tree}
      <div ref={editor} className="cfg-detail" style={{ minWidth: 0, scrollMarginTop: 16, ...(wide ? { position: 'sticky', top: 0, maxHeight: '100vh', overflowY: 'auto', paddingRight: 8 } : {}) }}>
        {header}
        {body}
        {undo && (
          <div role="status" style={{ position: 'sticky', bottom: 0, marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', background: desk.panel, border: `1px solid ${ink.border}`, borderRadius: radius, boxShadow: '0 -6px 18px rgba(35,33,26,.08)', padding: '10px 14px', fontFamily: sans, fontSize: 14, color: ink.base }}>
            <span style={{ flex: 1 }}>
              <span>{undo.msg}</span>
              {undo.saving && <span style={{ color: ink.soft }}> · đang lưu…</span>}
            </span>
            <Button
              disabled={undo.saving}
              onClick={() => {
                const u = undo
                setUndo(null)
                run(u.revert)
              }}
            >
              Hoàn tác
            </Button>
            <IconButton label="Đóng" onClick={() => setUndo(null)}>
              <IconClose />
            </IconButton>
          </div>
        )}
      </div>
      {wide && split.handle}
      <div
        ref={setSlot}
        aria-label="Xem trước"
        style={{ ...previewStyle, ...(wide ? { position: 'sticky', top: 0, height: 'calc(100vh - 40px)' } : { height: '70vh' }) }}
      />
      {previewPane}
    </div>
  )
}
