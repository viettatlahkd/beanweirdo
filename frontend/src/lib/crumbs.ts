import type { ModuleRow } from '../data/useModules'
import { navLabel } from '../content/navItems'
import { ancestorsOf } from './contentTree'
import { SECTION_NAMES } from '../content/site'
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
  const admin: Crumb = atCms ? { label: SECTION_NAMES.Admin } : { label: SECTION_NAMES.Admin, go: nav.goCms }
  const backend: Crumb = atCms ? { label: 'Backend' } : { label: 'Backend', go: nav.goCms }
  const titleOf = (id: string) => modules.find((m) => m.id === id)?.title ?? id
  const mod = (id: string): Crumb => ({
    label: titleOf(id),
    go: toPublic('landing', () => nav.openModule(id)),
  })

  /**
   * The branches a module hangs from, outermost first.
   *
   * This is the whole reason the trail can grow: the depth is not written here
   * but read from the data, so `Trang chủ › Mục lục › bean weirdo › Roasting ›
   * Heat Transfer` and a trail two levels deeper are the same line of code.
   * While every module sits at the top this is empty, and the trail reads
   * exactly as it did before the tree existed.
   */
  const branches = (id: string): Crumb[] => ancestorsOf(modules, id).map((m) => mod(m.id))

  switch (nav.screen) {
    case 'home':
      return [landing, { label: navLabel('home') }]
    case 'module':
      return [landing, index, ...branches(nav.moduleId), { label: titleOf(nav.moduleId) }]
    case 'article':
      // The trail ends on the post's own name. 'Bài viết' told the reader
      // nothing they could not already see.
      // Three doors, three trails. Opened from Archive it used to read
      // `Admin › Templates › …` — a route through a screen the reader never
      // touched, on the way from one they did.
      if (nav.articleFrom === 'module') {
        const filedUnder = ctx.moduleId ?? nav.moduleId
        return [
          landing,
          index,
          ...branches(filedUnder),
          mod(filedUnder),
          { label: ctx.trailing ?? 'Bài viết' },
        ]
      }
      if (nav.articleFrom === 'archive')
        return [admin, { label: navLabel('archive'), go: nav.goArchive }, { label: ctx.trailing ?? 'Bài viết' }]
      // Cửa thứ ba từng là màn Templates; màn ấy đã bỏ, nên đường về chỉ còn
      // tới khu quản trị.
      return [admin, { label: ctx.trailing ?? 'Bài viết' }]
    case 'notes':
      return [landing, { label: `beӕn weirdo — ${navLabel('notes')}` }]
    case 'hours':
      return [landing, { label: `beӕn weirdo — ${navLabel('hours')}` }]
    case 'archive':
      return [admin, { label: 'Notes', go: nav.goCms }, { label: navLabel('archive') }]
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
export function crumbBack(
  nav: Nav,
  moduleId?: string,
  parentGo?: () => void,
  /**
   * The table of contents, when the caller has it.
   *
   * Only the module screen needs it, and only to find the branch one level up.
   * Optional because the answer without it — the index — is exactly what the
   * arrow did before modules could hold modules, and is still right for a
   * module at the top.
   */
  modules: ModuleRow[] = [],
): () => void {
  /*
   * A screen holding a layer of its own owns the first step back: from an open
   * template, one step is the list, and only the step after that leaves for
   * Content management. Without this the arrow cleared both at once — the
   * layer the reader was in was not on the way out at all.
   */
  if (parentGo) return parentGo

  const out = nav.area === 'public' ? nav.goLanding : () => goToArea('public')

  switch (nav.screen) {
    case 'module': {
      // One step back out of Roasting is bean weirdo, not the index. The arrow
      // used to skip every branch in between, because it only knew about a
      // world two levels deep.
      const branch = ancestorsOf(modules, nav.moduleId).at(-1)
      return branch ? () => nav.openModule(branch.id) : nav.goHome
    }
    case 'article':
      // Back goes to the module this post is actually filed under. It used to
      // go to 'biochem' whatever you were reading.
      if (nav.articleFrom === 'module') return () => nav.openModule(moduleId ?? nav.moduleId)
      if (nav.articleFrom === 'archive') return nav.goArchive
      return out
    /*
     * Inside admin the step back is to admin's own front door. It used to leave
     * the area entirely, so `←` from Archive landed on the public journal — a
     * long way from one step back.
     */
    case 'archive':
      return nav.goCms
    default:
      return out
  }
}
