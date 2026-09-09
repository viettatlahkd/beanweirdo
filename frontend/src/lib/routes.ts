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
  /** The template open inside the Templates screen. */
  templateId?: string
  /** Which tab of Content management is open. */
  tab?: CmsTab
  /** Which door an article was opened through — see `Origin`. */
  from?: Origin
}

/**
 * Module ids are short in the database (`biochem`) and spelled out in the
 * address (`biochemistry`). Only the ones that differ are listed; the rest pass
 * through, which keeps this from becoming a list nobody remembers to update.
 */
export const moduleToUrl = (id: string, w: RouteWords = activeWords()) => w.modules[id] ?? id

export function moduleFromUrl(name: string, w: RouteWords = activeWords()): string {
  for (const [id, spelt] of Object.entries(w.modules)) if (spelt === name) return id
  return name
}

/** The admin screens that live at their own `/ad-…` address. */
const adminPages = (w: RouteWords): Record<string, Screen> => ({
  [`${w.admin}-${w.adPost}`]: 'cms',
  [`${w.admin}-${w.adSitemap}`]: 'cms',
  [`${w.admin}-${w.adPageContent}`]: 'cms',
  [`${w.admin}-${w.adDesignSystem}`]: 'art',
  [`${w.admin}-${w.adConvention}`]: 'logic',
  [`${w.admin}-${w.adTemplate}`]: 'templates',
  [`${w.admin}-${w.adArchive}`]: 'archive',
})

export type CmsTab = 'posts' | 'map' | 'content'

/**
 * Which tab of Content management an `/ad-…` address opens on.
 *
 * `/ad` names the screen without naming a tab, and opens on the first one. The
 * three tabs are separate addresses because they are separate places to be —
 * a link to the site map should not open the post list.
 */
export const cmsTabs = (w: RouteWords = activeWords()): Record<string, CmsTab> => ({
  [`${w.admin}-${w.adPost}`]: 'posts',
  [`${w.admin}-${w.adSitemap}`]: 'map',
  [`${w.admin}-${w.adPageContent}`]: 'content',
})
const pageOfTab = (w: RouteWords): Record<CmsTab, string> => ({
  posts: `${w.admin}-${w.adPost}`,
  map: `${w.admin}-${w.adSitemap}`,
  content: `${w.admin}-${w.adPageContent}`,
})

const screenPage = (w: RouteWords): Partial<Record<Screen, string>> => ({
  art: `${w.admin}-${w.adDesignSystem}`,
  logic: `${w.admin}-${w.adConvention}`,
  templates: `${w.admin}-${w.adTemplate}`,
  archive: `${w.admin}-${w.adArchive}`,
})

/** `/ad-post/edit=<slug>` and its two siblings. */
const postActions = (w: RouteWords): Record<string, Screen> => ({
  [w.create]: 'postNew',
  [w.edit]: 'postEdit',
  [w.view]: 'postPreview',
})
const actionOfScreen = (w: RouteWords): Partial<Record<Screen, string>> => ({
  postNew: w.create,
  postEdit: w.edit,
  postPreview: w.view,
})

/**
 * Where an address points.
 *
 * Anything unrecognised lands on the public front page rather than an error:
 * a mistyped address is a reader who took a wrong turn, not a fault to report.
 */
export function parsePath(pathname: string, search = '', w: RouteWords = activeWords()): Where {
  const hit = readPath(pathname, search, w)
  if (hit) return hit

  // Địa chỉ viết bằng một bộ từ cũ vẫn phải mở ra đúng chỗ — đổi tên một trang
  // không được làm chết những link đã phát ra. Đọc được rồi thì `useRoute` viết
  // lại nó bằng bộ từ đang dùng.
  for (const old of [DEFAULT_WORDS, ...pastWords()]) {
    const back = readPath(pathname, search, old)
    if (back) return back
  }
  return { area: 'public', screen: 'landing' }
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
    if (head === `${w.admin}-${w.adTemplate}` && seg[1]) {
      return { area: 'admin', screen: 'templates', templateId: seg[1] }
    }
    const screen = adminPages(w)[head]
    if (screen) return { area: 'admin', screen, tab: cmsTabs(w)[head] }
    return { area: 'admin', screen: 'cms' }
  }

  // ── public ───────────────────────────────────────────────────────────────
  if (head === w.index) return { area: 'public', screen: 'home' }
  if (head === w.notes) return { area: 'public', screen: 'notes' }
  if (head === w.module && seg[1]) {
    return { area: 'public', screen: 'module', moduleId: moduleFromUrl(seg[1], w) }
  }
  if (head === w.post && seg[1]) {
    // A reader arriving cold came through neither a module nor the admin list,
    // and `module` is the trail that makes sense to show them.
    const from = (new URLSearchParams(search).get('from') as Origin | null) ?? 'module'
    return { area: 'public', screen: 'article', slug: seg[1], from }
  }

  return null
}

/** The address for a place. The exact inverse of `parsePath`. */
export function toPath(where: Where, w: RouteWords = activeWords()): string {
  if (where.area === 'practice') return `/${w.practice}`
  const adHome = `/${w.admin}`
  const adPost = `/${w.admin}-${w.adPost}`

  if (where.area === 'admin') {
    const action = actionOfScreen(w)[where.screen]
    if (action) return where.slug ? `${adPost}/${action}=${where.slug}` : `${adPost}/${action}`
    if (where.screen === 'templates') {
      const list = `/${w.admin}-${w.adTemplate}`
      return where.templateId ? `${list}/${where.templateId}` : list
    }
    if (where.screen === 'article') return where.slug ? `/${w.post}/${where.slug}?from=admin` : adHome
    if (where.screen === 'cms') return where.tab ? `/${pageOfTab(w)[where.tab]}` : adHome
    const page = screenPage(w)[where.screen]
    return page ? `/${page}` : adHome
  }

  switch (where.screen) {
    case 'home':
      return `/${w.index}`
    case 'notes':
      return `/${w.notes}`
    case 'module':
      return where.moduleId ? `/${w.module}/${moduleToUrl(where.moduleId, w)}` : '/'
    case 'article':
      // The door is worth carrying so the trail reads back the way in, but
      // `module` is the default and does not need saying.
      return where.slug
        ? `/${w.post}/${where.slug}${where.from && where.from !== 'module' ? `?from=${where.from}` : ''}`
        : '/'
    default:
      return '/'
  }
}

/** Whether two places are the same address — used to avoid stacking history. */
export const samePath = (a: Where, b: Where) => toPath(a) === toPath(b)
