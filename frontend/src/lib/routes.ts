import type { Area } from './area'
import type { Origin, Screen } from './nav'

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
const MODULE_IN_URL: Record<string, string> = { biochem: 'biochemistry', ghi01: 'ghi' }
const MODULE_FROM_URL: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_IN_URL).map(([id, name]) => [name, id]),
)

export const moduleToUrl = (id: string) => MODULE_IN_URL[id] ?? id
export const moduleFromUrl = (name: string) => MODULE_FROM_URL[name] ?? name

/** The admin screens that live at their own `/ad-…` address. */
const ADMIN_PAGES: Record<string, Screen> = {
  'ad-post': 'cms',
  'ad-sitemap': 'cms',
  'ad-page-content': 'cms',
  'ad-design-system': 'art',
  'ad-convention': 'logic',
  'ad-template': 'templates',
  'ad-archive': 'archive',
}

export type CmsTab = 'posts' | 'map' | 'content'

/**
 * Which tab of Content management an `/ad-…` address opens on.
 *
 * `/ad` names the screen without naming a tab, and opens on the first one. The
 * three tabs are separate addresses because they are separate places to be —
 * a link to the site map should not open the post list.
 */
export const CMS_TAB: Record<string, CmsTab> = {
  'ad-post': 'posts',
  'ad-sitemap': 'map',
  'ad-page-content': 'content',
}
const PAGE_OF_TAB: Record<CmsTab, string> = {
  posts: 'ad-post',
  map: 'ad-sitemap',
  content: 'ad-page-content',
}

const SCREEN_PAGE: Partial<Record<Screen, string>> = {
  art: 'ad-design-system',
  logic: 'ad-convention',
  templates: 'ad-template',
  archive: 'ad-archive',
}

/** `/ad-post/edit=<slug>` and its two siblings. */
const POST_ACTION: Record<string, Screen> = {
  create: 'postNew',
  edit: 'postEdit',
  view: 'postPreview',
}
const ACTION_OF_SCREEN: Partial<Record<Screen, string>> = {
  postNew: 'create',
  postEdit: 'edit',
  postPreview: 'view',
}

/**
 * Where an address points.
 *
 * Anything unrecognised lands on the public front page rather than an error:
 * a mistyped address is a reader who took a wrong turn, not a fault to report.
 */
export function parsePath(pathname: string, search = ''): Where {
  const seg = pathname.split('/').filter(Boolean)
  const head = seg[0] ?? ''

  if (head === 'practice') return { area: 'practice', screen: 'hours' }

  // ── admin ────────────────────────────────────────────────────────────────
  // `/admin` is the address the back office used to live at. It is still read
  // here — a bookmark from before this table existed should land where it
  // always did — but nothing produces it any more, so opening one rewrites
  // itself to `/ad` on arrival.
  if (head === 'ad' || head === 'admin' || head.startsWith('ad-')) {
    const preview = new URLSearchParams(search).get('preview')
    if (preview) return { area: 'admin', screen: 'postPreview', slug: preview }

    if (head === 'ad-post' && seg[1]) {
      // `edit=<slug>` rather than `edit/<slug>`: the verb and its object are
      // one step, so the address cannot be truncated into a half-meaning.
      const [verb, slug] = seg[1].split('=')
      const screen = POST_ACTION[verb]
      if (screen) return { area: 'admin', screen, slug: slug || undefined }
    }
    if (head === 'ad-template' && seg[1]) {
      return { area: 'admin', screen: 'templates', templateId: seg[1] }
    }
    const screen = ADMIN_PAGES[head]
    if (screen) return { area: 'admin', screen, tab: CMS_TAB[head] }
    return { area: 'admin', screen: 'cms' }
  }

  // ── public ───────────────────────────────────────────────────────────────
  if (head === 'muc-luc') return { area: 'public', screen: 'home' }
  if (head === 'ghi') return { area: 'public', screen: 'notes' }
  if (head === 'module' && seg[1]) {
    return { area: 'public', screen: 'module', moduleId: moduleFromUrl(seg[1]) }
  }
  if (head === 'post' && seg[1]) {
    // A reader arriving cold came through neither a module nor the admin list,
    // and `module` is the trail that makes sense to show them.
    const from = (new URLSearchParams(search).get('from') as Origin | null) ?? 'module'
    return { area: 'public', screen: 'article', slug: seg[1], from }
  }

  return { area: 'public', screen: 'landing' }
}

/** The address for a place. The exact inverse of `parsePath`. */
export function toPath(w: Where): string {
  if (w.area === 'practice') return '/practice'

  if (w.area === 'admin') {
    const action = ACTION_OF_SCREEN[w.screen]
    if (action) return w.slug ? `/ad-post/${action}=${w.slug}` : `/ad-post/${action}`
    if (w.screen === 'templates') return w.templateId ? `/ad-template/${w.templateId}` : '/ad-template'
    if (w.screen === 'article') return w.slug ? `/post/${w.slug}?from=admin` : '/ad'
    if (w.screen === 'cms') return w.tab ? `/${PAGE_OF_TAB[w.tab]}` : '/ad'
    return SCREEN_PAGE[w.screen] ? `/${SCREEN_PAGE[w.screen]}` : '/ad'
  }

  switch (w.screen) {
    case 'home':
      return '/muc-luc'
    case 'notes':
      return '/ghi'
    case 'module':
      return w.moduleId ? `/module/${moduleToUrl(w.moduleId)}` : '/'
    case 'article':
      // The door is worth carrying so the trail reads back the way in, but
      // `module` is the default and does not need saying.
      return w.slug ? `/post/${w.slug}${w.from && w.from !== 'module' ? `?from=${w.from}` : ''}` : '/'
    default:
      return '/'
  }
}

/** Whether two places are the same address — used to avoid stacking history. */
export const samePath = (a: Where, b: Where) => toPath(a) === toPath(b)
