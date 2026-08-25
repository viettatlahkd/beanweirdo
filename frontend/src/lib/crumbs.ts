import type { ModuleRow } from '../data/useModules'
import { navLabel } from '../content/navItems'
import type { NavGroup } from '../content/site'
import { goToArea } from './area'
import type { Nav } from './nav'

export type Crumb = {
  label: string
  /** Absent on the trailing crumb and on the section headings, which aren't pages. */
  go?: () => void
}

/**
 * The breadcrumb trail, per screen.
 *
 * It reflects the route the reader actually walked, not the file tree: the same
 * template screen shows `Trang chủ › Mục lục › sensory › Sensory Lexicon` when
 * opened from a module, and `Admin › Notes › Templates › Info cards` when
 * opened from the Templates list. See System conventions, rule 05.
 */
export function buildCrumbs(
  nav: Nav,
  modules: ModuleRow[],
  sections: Record<NavGroup, string>,
  /** What the screen itself cannot know: which post is open, and under which module. */
  ctx: {
    trailing?: string
    moduleId?: string
    /**
     * How to get back to the screen's own top level, when the screen holds a
     * layer the router does not know about. Templates opens a template without
     * changing screen, so the trail cannot reach the list by routing to it —
     * the screen has to hand over the way back.
     */
    parentGo?: () => void
  } = {},
): Crumb[] {
  /**
   * Crumbs pointing at the public journal have to leave the area when we're
   * not in it — following one from /practice must land on the real site, not
   * render the landing page inside the private area.
   */
  const toPublic = (screenKey: string, inArea: () => void) =>
    nav.area === 'public' ? inArea : () => goToArea('public', screenKey)

  const landing: Crumb = { label: navLabel('landing'), go: toPublic('landing', nav.goLanding) }
  const index: Crumb = { label: navLabel('home'), go: toPublic('home', nav.goHome) }
  /*
   * Admin's crumbs were labels and nothing else — every one of them, on every
   * admin screen. The trail read like a trail and did not walk, so the only way
   * back was the sidebar or the browser's own button.
   *
   * A crumb that names a page it can reach now carries `go`. `Backend` and
   * `Notes` name groupings rather than pages, so they point at where their
   * group starts: Content management.
   */
  /*
   * ...but not when that page is the one already open. On Content management
   * itself both `Admin` and `Backend` point at Content management, so they
   * would take the pointer cursor and then go nowhere. A crumb that promises a
   * step and does not take it is the same lie as one that cannot be clicked,
   * facing the other way.
   */
  const atCms = nav.screen === 'cms'
  const admin: Crumb = atCms ? { label: sections.Admin } : { label: sections.Admin, go: nav.goCms }
  const backend: Crumb = atCms ? { label: 'Backend' } : { label: 'Backend', go: nav.goCms }
  const templates: Crumb = { label: navLabel('templates'), go: nav.goTemplates }
  const mod = (id: string): Crumb => ({
    label: modules.find((m) => m.id === id)?.title ?? id,
    go: toPublic('landing', () => nav.openModule(id)),
  })

  switch (nav.screen) {
    case 'home':
      return [landing, { label: navLabel('home') }]
    case 'module':
      return [landing, index, { label: modules.find((m) => m.id === nav.moduleId)?.title ?? nav.moduleId }]
    case 'article':
      // The trail ends on the post's own name. 'Bài viết' told the reader
      // nothing they could not already see.
      // Three doors, three trails. Opened from Archive it used to read
      // `Admin › Templates › …` — a route through a screen the reader never
      // touched, on the way from one they did.
      if (nav.articleFrom === 'module')
        return [landing, index, mod(ctx.moduleId ?? nav.moduleId), { label: ctx.trailing ?? 'Bài viết' }]
      if (nav.articleFrom === 'archive')
        return [admin, { label: navLabel('archive'), go: nav.goArchive }, { label: ctx.trailing ?? 'Bài viết' }]
      return [admin, templates, { label: ctx.trailing ?? 'Bài viết' }]
    case 'templates':
      // With a template open the list becomes a place to return to, so the
      // trail grows a stop and `Templates` stops being the current page.
      return ctx.trailing
        ? [admin, { label: navLabel('templates'), go: ctx.parentGo ?? nav.goTemplates }, { label: ctx.trailing }]
        : [admin, { label: navLabel('templates') }]
    case 'notes':
      return [landing, { label: `beӕn weirdo — ${navLabel('notes')}` }]
    case 'hours':
      return [landing, { label: `beӕn weirdo — ${navLabel('hours')}` }]
    case 'archive':
      return [admin, { label: 'Notes', go: nav.goCms }, { label: navLabel('archive') }]
    case 'art':
      return [admin, backend, { label: navLabel('art') }]
    case 'logic':
      return [admin, backend, { label: navLabel('logic') }]
    case 'cms':
      return [admin, backend, { label: navLabel('cms') }]
    default:
      return [landing]
  }
}

/**
 * Where the `←` goes — one step back along the trail the reader walked.
 *
 * From a private area the step back leads out to the public journal, which is
 * a different entry point rather than a different screen.
 */
export function crumbBack(nav: Nav, moduleId?: string, parentGo?: () => void): () => void {
  /*
   * A screen holding a layer of its own owns the first step back: from an open
   * template, one step is the list, and only the step after that leaves for
   * Content management. Without this the arrow cleared both at once — the
   * layer the reader was in was not on the way out at all.
   */
  if (parentGo) return parentGo

  const out = nav.area === 'public' ? nav.goLanding : () => goToArea('public')

  switch (nav.screen) {
    /*
     * Inside admin the step back is to admin's own front door. It used to leave
     * the area entirely, so `←` from Templates landed on the public journal —
     * a long way from one step back.
     */
    case 'templates':
    case 'art':
    case 'logic':
      return nav.goCms
    case 'module':
      return nav.goHome
    case 'article':
      // Back goes to the module this post is actually filed under. It used to
      // go to 'biochem' whatever you were reading.
      if (nav.articleFrom === 'module') return () => nav.openModule(moduleId ?? nav.moduleId)
      if (nav.articleFrom === 'archive') return nav.goArchive
      return out
    case 'archive':
      return nav.goCms
    default:
      return out
  }
}
