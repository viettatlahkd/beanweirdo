import type { Area } from './area'
import type { Origin, Screen } from './nav'
import { activeWords, DEFAULT_WORDS, pastWords, type RouteWords } from './routeWords'

/**
 * Every address the site answers to, in one table.
 *
 * The screen used to live only in React state, so the address bar stayed on `/`
 * however far in you walked: back and forward did nothing, a page could not be
 * linked to, and reloading dropped you at the front door. Templates was the one
 * exception, and it had to grow its own history handling to get there — which
 * is the argument for putting all of it in one place instead.
 *
 * Reading and writing are the same table read in two directions, so an address
 * that can be produced can always be parsed back.
 */
export type Where = {
  area: Area
  screen: Screen
  /** Which module a module page or an article belongs to. */
  moduleId?: string
  /** The post being read, edited or previewed — by slug, never by id. */
  slug?: string
  /** Which tab of Content management is open. */
  tab?: CmsTab
  /** Which door an article was opened through — see `Origin`. */
  from?: Origin
  /**
   * Which child site a port page sits in. Alone it opens the site's home
   * (`/biz`, `/bean`: the page flagged `home_of` it, 0035); with a slug it
   * says the page was opened under `/bean/<slug>`.
   */
  site?: PortSite
}

/** The child sites, each at its own address with its home page there. */
export type PortSite = 'biz' | 'bean'

/**
 * Module ids are short in the database (`biochem`) and spelled out in the
 * address (`biochemistry`). Only the ones that differ are listed; the rest pass
 * through, which keeps this from becoming a list nobody remembers to update.
 */
/** Prefix of a tag page's id: `tag-heat` is the page of tag `heat`. */
export const TAG_PAGE = 'tag-'

export const moduleToUrl = (id: string, w: RouteWords = activeWords()) => w.modules[id] ?? id

function moduleFromUrl(name: string, w: RouteWords = activeWords()): string {
  for (const [id, spelt] of Object.entries(w.modules)) if (spelt === name) return id
  return name
}

/** The admin screens that live at their own `/ad-…` address. */
const adminPages = (w: RouteWords): Record<string, Screen> => ({
  [`${w.admin}-${w.adPost}`]: 'cms',
  [`${w.admin}-${w.adConfig}`]: 'cms',
  [`${w.admin}-${w.adTree}`]: 'cms',
  [`${w.admin}-${w.adAuthors}`]: 'cms',
  [`${w.admin}-${w.adSitemap}`]: 'cms',
  [`${w.admin}-${w.adPageContent}`]: 'cms',
  [`${w.admin}-${w.adTaxonomy}`]: 'cms',
  [`${w.admin}-${w.adDisplay}`]: 'cms',
  [`${w.admin}-${w.adArchive}`]: 'archive',
  // Portfolio folded into the CMS (port pages in Quản lý trang, its design in
  // Cài đặt hiển thị); its old addresses still land there.
  [`${w.admin}-${w.adPortfolio}`]: 'cms',
  [`${w.admin}-${w.adPortContent}`]: 'cms',
  [`${w.admin}-${w.adPortDesign}`]: 'cms',
})

/** Nội dung (posts and the vocabularies filing them) · Cấu hình (every page and its settings) · Cài đặt hiển thị. `authors` is Cấu hình opened on its Tác giả card. */
export type CmsTab = 'posts' | 'pages' | 'display' | 'authors'

/**
 * Which tab of Content management an `/ad-…` address opens on.
 *
 * `/ad` names the screen without naming a tab, and opens on the first one. The
 * two tabs are separate addresses because they are separate places to be — a
 * link to the settings should not open the post list.
 *
 * `/ad-sitemap`, `/ad-page-content`, `/ad-config` were tabs that are now one
 * tab. They still read, because links to them are already out there; only
 * `/ad-cau-hinh` is written from here on.
 */
const cmsTabs = (w: RouteWords = activeWords()): Record<string, CmsTab> => ({
  [`${w.admin}-${w.adPost}`]: 'posts',
  // Cấu hình and Quản lý trang are one tab since 2026-10-08; every old address lands on it.
  [`${w.admin}-${w.adConfig}`]: 'pages',
  [`${w.admin}-${w.adTree}`]: 'pages',
  [`${w.admin}-${w.adAuthors}`]: 'authors',
  // Phân loại folded into Nội dung; its old address still lands there.
  [`${w.admin}-${w.adTaxonomy}`]: 'posts',
  [`${w.admin}-${w.adSitemap}`]: 'pages',
  // Nội dung trang folded into Quản lý trang, now Cấu hình; its old address still lands there.
  [`${w.admin}-${w.adPageContent}`]: 'pages',
  [`${w.admin}-${w.adDisplay}`]: 'display',
  [`${w.admin}-${w.adPortfolio}`]: 'pages',
  [`${w.admin}-${w.adPortContent}`]: 'pages',
  [`${w.admin}-${w.adPortDesign}`]: 'display',
})
const pageOfTab = (w: RouteWords): Record<CmsTab, string> => ({
  posts: `${w.admin}-${w.adPost}`,
  pages: `${w.admin}-${w.adTree}`,
  display: `${w.admin}-${w.adDisplay}`,
  authors: `${w.admin}-${w.adAuthors}`,
})

const screenPage = (w: RouteWords): Partial<Record<Screen, string>> => ({
  archive: `${w.admin}-${w.adArchive}`,
})

/** `/ad-post/edit=<slug>` and its two siblings. */
const postActions = (w: RouteWords): Record<string, Screen> => ({
  [w.edit]: 'postEdit',
  [w.view]: 'postPreview',
})
const actionOfScreen = (w: RouteWords): Partial<Record<Screen, string>> => ({
  postEdit: w.edit,
  postPreview: w.view,
})

/**
 * The port's about page, `/about`. A fixed word rather than one of the owner's:
 * the API refuses it as a port page slug, so the two can never collide.
 */
const ABOUT = 'about'

/**
 * biz's prefix: its home is `/biz`, its pages `/biz/<slug>` (owner, 2026-10-14).
 * A fixed word like `about`; bean's prefix is the owner's word `bean`.
 */
const BIZ = 'biz'

/**
 * The journal, a site beside biz and bean (owner, 2026-10-15): its front page
 * is `/journal`, everything else of it under it. Before, the blog lived under
 * bean's prefix (`/bean/details`, `/bean/post/…`); those addresses still read
 * and are rewritten here. Its short-lived `/personal-blog` prefix does not:
 * the owner keeps no alias for a renamed address.
 */
const BLOG = 'journal'

/**
 * A post's own page, `/p/<slug>` (owner, 2026-10-15): posts are one store shown
 * on biz, bean and the blog, so their page belongs to none of them. The blog's
 * `/journal/post/<slug>` still reads and is rewritten here.
 */
const POST = 'p'

/**
 * Where the portfolio lived before it became the root (`/portfolio/<slug>`).
 * Only read, never written: links to it are already out there.
 */
const OLD_PORTFOLIO = 'portfolio'

/**
 * Where an address points.
 *
 * The site is a tree: beanweirdo at `/` (home and `/about`), then the child
 * sites, biz at `/biz/…`, bean at `/bean/…` and the journal at `/journal/…`,
 * each with its home at its own prefix. biz's pages were at `/<slug>` before; anything that is not another
 * address is still read as one, and `useRoute` writes it back as `/biz/<slug>`.
 * One that does not exist says so, rather than quietly opening something else.
 */
export function parsePath(pathname: string, search = '', w: RouteWords = activeWords()): Where {
  // Địa chỉ viết bằng một bộ từ cũ vẫn phải mở ra đúng chỗ — đổi tên một trang
  // không được làm chết những link đã phát ra. Đọc được rồi thì `useRoute` viết
  // lại nó bằng bộ từ đang dùng.
  for (const words of [w, DEFAULT_WORDS, ...pastWords()]) {
    const hit = readPath(pathname, search, words)
    if (hit) return hit
  }
  return readPort(pathname.split('/').filter(Boolean))
}

/** `/`, `/about` and `/<slug>`: the portfolio, which owns the root. */
function readPort(seg: string[]): Where {
  if (!seg[0]) return { area: 'public', screen: 'portfolioHome' }
  if (seg[0] === ABOUT) return { area: 'public', screen: 'portfolioAbout' }
  return { area: 'public', screen: 'portfolioPage', slug: seg[0] }
}

/** Một lượt đọc bằng đúng một bộ từ. `null` nghĩa là bộ từ này không nhận ra. */
function readPath(pathname: string, search: string, w: RouteWords): Where | null {
  const seg = pathname.split('/').filter(Boolean)
  const head = seg[0] ?? ''
  const adPrefix = `${w.admin}-`

  if (head === w.practice) return { area: 'practice', screen: 'hours' }

  // ── admin ────────────────────────────────────────────────────────────────
  // `/admin` is the address the back office used to live at. It is still read
  // here — a bookmark from before this table existed should land where it
  // always did — but nothing produces it any more, so opening one rewrites
  // itself to `/ad` on arrival.
  if (head === w.admin || head === 'admin' || head.startsWith(adPrefix)) {
    const preview = new URLSearchParams(search).get('preview')
    if (preview) return { area: 'admin', screen: 'postPreview', slug: preview }

    if (head === `${w.admin}-${w.adPost}` && seg[1]) {
      // `edit=<slug>` rather than `edit/<slug>`: the verb and its object are
      // one step, so the address cannot be truncated into a half-meaning.
      const [verb, slug] = seg[1].split('=')
      const screen = postActions(w)[verb]
      if (screen) return { area: 'admin', screen, slug: slug || undefined }
    }
    const screen = adminPages(w)[head]
    if (screen) return { area: 'admin', screen, tab: cmsTabs(w)[head] }
    return { area: 'admin', screen: 'cms' }
  }

  // ── public ───────────────────────────────────────────────────────────────
  if (head === POST && seg[1]) return { area: 'public', screen: 'article', slug: seg[1], from: originOf(search) }
  if (head === BIZ) return seg[1] ? { area: 'public', screen: 'portfolioPage', slug: seg[1] } : { area: 'public', screen: 'portfolioPage', site: 'biz' }
  if (head === BLOG) return seg[1] ? readBlog(seg.slice(1), search, w, false) : { area: 'public', screen: 'landing' }
  if (head === w.bean && !seg[1]) return { area: 'public', screen: 'portfolioPage', site: 'bean' }
  // The blog's old home under bean wins over a bean page of the same name: those links are out there.
  if (head === w.bean) return readBlog(seg.slice(1), search, w, true) ?? { area: 'public', screen: 'portfolioPage', slug: seg[1], site: 'bean' }
  // The blog used to sit at the root (`/post/<slug>`, `/muc-luc`…) and the
  // portfolio under `/portfolio`. Both moved; their old addresses still read,
  // and `useRoute` rewrites them to where they live now.
  if (head === OLD_PORTFOLIO) return readPort(seg.slice(1))
  return readBlog(seg, search, w, false)
}

/** The blog's pages, read from what follows `/journal/` (or the old `/bean/`). */
function readBlog(seg: string[], search: string, w: RouteWords, underBean: boolean): Where | null {
  const [head, arg] = seg
  // `/bean/details` was the blog's front page until it got its own prefix.
  if (underBean && head === w.details && !arg) return { area: 'public', screen: 'landing' }
  if (head === w.index) return { area: 'public', screen: 'home' }
  if (head === w.notes) return { area: 'public', screen: 'notes' }
  if (head === w.module && arg) return { area: 'public', screen: 'module', moduleId: moduleFromUrl(arg, w) }
  // A tag's own page (migration 0028): the page id is `tag-<id>`.
  if (head === w.tag && arg) return { area: 'public', screen: 'module', moduleId: `${TAG_PAGE}${arg}` }
  if (head === w.post && arg) return { area: 'public', screen: 'article', slug: arg, from: originOf(search) }
  return null
}

const ORIGINS: Origin[] = ['module', 'admin', 'archive', 'biz', 'bean', 'blog']

/**
 * The door a post was opened through. A reader arriving cold came through
 * none, and `module` is the way back that makes sense to show them.
 */
function originOf(search: string): Origin {
  const from = new URLSearchParams(search).get('from') as Origin | null
  return from && ORIGINS.includes(from) ? from : 'module'
}

/** The address for a place. The exact inverse of `parsePath`. */
export function toPath(where: Where, w: RouteWords = activeWords()): string {
  if (where.area === 'practice') return `/${w.practice}`
  const adHome = `/${w.admin}`
  const adPost = `/${w.admin}-${w.adPost}`
  const blog = `/${BLOG}`

  if (where.area === 'admin') {
    const action = actionOfScreen(w)[where.screen]
    if (action) return where.slug ? `${adPost}/${action}=${where.slug}` : `${adPost}/${action}`
    if (where.screen === 'article') return where.slug ? `/${POST}/${where.slug}?from=admin` : adHome
    if (where.screen === 'cms') return where.tab ? `/${pageOfTab(w)[where.tab]}` : adHome
    const page = screenPage(w)[where.screen]
    return page ? `/${page}` : adHome
  }

  switch (where.screen) {
    case 'landing':
      return blog
    case 'home':
      return `${blog}/${w.index}`
    case 'notes':
      return `${blog}/${w.notes}`
    case 'portfolioPage':
      if (where.site && where.slug) return `/${where.site === 'bean' ? w.bean : BIZ}/${where.slug}`
      if (where.site) return where.site === 'bean' ? `/${w.bean}` : `/${BIZ}`
      return where.slug ? `/${BIZ}/${where.slug}` : '/'
    case 'portfolioAbout':
      return `/${ABOUT}`
    case 'module':
      if (where.moduleId?.startsWith(TAG_PAGE)) return `${blog}/${w.tag}/${where.moduleId.slice(TAG_PAGE.length)}`
      return where.moduleId ? `${blog}/${w.module}/${moduleToUrl(where.moduleId, w)}` : blog
    case 'article':
      // The door is worth carrying so the trail reads back the way in, but
      // `module` is the default and does not need saying.
      return where.slug
        ? `/${POST}/${where.slug}${where.from && where.from !== 'module' ? `?from=${where.from}` : ''}`
        : blog
    default:
      return '/'
  }
}

type PortPlace = { id: string; slug: string; parent_id?: string | null; home_of?: PortSite | null }

/**
 * The child site a port page belongs to: the site whose home it sits under.
 * A page under no home is biz's — biz's pages were filed at the top before
 * the homes were flagged, and bean's are filed under its home.
 */
export function portSiteOf(page: PortPlace, pages: PortPlace[]): PortSite {
  const seen = new Set<string>()
  for (let at: PortPlace | undefined = page; at && !seen.has(at.id); at = pages.find((x) => x.id === at!.parent_id)) {
    if (at.home_of) return at.home_of
    seen.add(at.id)
  }
  return 'biz'
}

/**
 * A port page's address: a child site's home is the site's own address, any
 * other page sits under its site (`/biz/<slug>`, `/bean/<slug>`). `pages` is
 * what the page's ancestors are looked up in; without it the page reads as biz's.
 */
export const portPagePath = (page: PortPlace, pages: PortPlace[] = []) =>
  toPath(
    page.home_of
      ? { area: 'public', screen: 'portfolioPage', site: page.home_of }
      : portSiteOf(page, pages) === 'bean'
        ? { area: 'public', screen: 'portfolioPage', slug: page.slug, site: 'bean' }
        : { area: 'public', screen: 'portfolioPage', slug: page.slug },
  )
