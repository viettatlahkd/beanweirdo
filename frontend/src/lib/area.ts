import { navByKey } from '../content/navItems'
import type { NavGroup } from '../content/site'
import type { Screen } from './nav'
import { toPath } from './routes'

/**
 * The three areas of the site, each its own entry point.
 *
 * `public` is the journal anyone can read. `practice` (the daily journal) and
 * `admin` (the back office) sit behind one shared login — they are not just
 * hidden rows in a sidebar, they are separate URLs, so an unauthenticated
 * visitor has no route into them at all.
 */
export type Area = 'public' | 'practice' | 'admin'

export const AREA_PATH: Record<Area, string> = {
  public: '/',
  practice: '/practice',
  admin: '/ad',
}

/** Which area a sidebar group belongs to. */
export function areaOfGroup(group: NavGroup): Area {
  if (group === 'Practice') return 'practice'
  if (group === 'Admin') return 'admin'
  return 'public'
}

/** Everything except the public journal is behind the login wall. */
export const isPrivate = (area: Area) => area !== 'public'

/**
 * Which area an address belongs to.
 *
 * Read before React starts, so it works off the string alone. `/admin` is the
 * address the back office used to live at and is still recognised; everything
 * the site writes now begins `/ad` or `/ad-`.
 */
export function areaFromPath(pathname: string = window.location.pathname): Area {
  const path = pathname.split('?')[0]
  if (path.startsWith('/admin') || path === '/ad' || path.startsWith('/ad/') || path.startsWith('/ad-')) {
    return 'admin'
  }
  if (path.startsWith('/practice')) return 'practice'
  return 'public'
}

/** The screen an area opens on when no `?screen=` is given. */
export const AREA_HOME: Record<Area, string> = {
  public: 'landing',
  practice: 'hours',
  admin: 'cms',
}

/**
 * Which screens each area may render.
 *
 * The sidebar already only offers what belongs here, but `?screen=` is typed
 * into the address bar by anyone — without this, `/?screen=cms` would draw the
 * whole back office on the public site. The API still refuses to feed it, so
 * no data leaks either way; this stops the interface itself from showing.
 *
 * The three templates appear twice on purpose: under `public` they render a
 * real post opened from a module, under `admin` the blank sample (see `Origin`).
 */
const AREA_SCREENS: Record<Area, readonly string[]> = {
  public: ['landing', 'home', 'module', 'notes', 'article'],
  practice: ['hours'],
  admin: [
    'cms',
    'art',
    'logic',
    'archive',
    'article',
    'templates',
    'postNew',
    'postEdit',
    'postPreview',
  ],
}

export const screenAllowed = (area: Area, screen: string) => AREA_SCREENS[area].includes(screen)

/**
 * Which sidebar sections a visitor may see.
 *
 * The public journal shows the Public section and nothing else — being signed
 * in must not change what the public site looks like. Someone reading over
 * your shoulder, or a screenshot, should give away nothing about what sits
 * behind the login.
 *
 * The private areas keep Public listed so there is a way back out.
 */
export function visibleGroups(area: Area, authed: boolean): NavGroup[] {
  if (area === 'public' || !authed) return ['Public']
  return ['Public', 'Practice', 'Admin']
}

/**
 * Move between areas.
 *
 * This is a real page load, not a client-side transition: each area is its own
 * entry point with its own auth check, and crossing that boundary should
 * re-run it rather than trusting state carried over from the previous area.
 */
export function goToArea(area: Area, screenKey?: string): void {
  const item = screenKey ? navByKey(screenKey) : undefined
  const screen = (item?.screen ?? AREA_HOME[area]) as Screen
  window.location.assign(toPath({ area, screen, moduleId: item?.moduleId }))
}
