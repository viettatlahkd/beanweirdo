import type { ModuleRow } from '../data/useModules'
import { navLabel } from '../content/navItems'
import type { NavGroup } from '../content/site'
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
): Crumb[] {
  const landing: Crumb = { label: navLabel('landing'), go: nav.goLanding }
  const index: Crumb = { label: navLabel('home'), go: nav.goHome }
  const admin: Crumb = { label: sections.Admin }
  const mod = (id: string): Crumb => ({
    label: modules.find((m) => m.id === id)?.title ?? id,
    go: () => nav.openModule(id),
  })
  const template = (title: string): Crumb[] => [admin, { label: 'Notes' }, { label: 'Templates' }, { label: title }]

  switch (nav.screen) {
    case 'home':
      return [landing, { label: navLabel('home') }]
    case 'module':
      return [landing, index, { label: modules.find((m) => m.id === nav.moduleId)?.title ?? nav.moduleId }]
    case 'cards':
      return nav.cardsFrom === 'module'
        ? [landing, index, mod('sensory'), { label: 'Sensory Lexicon' }]
        : template('Info cards')
    case 'report':
      return nav.reportFrom === 'module'
        ? [landing, index, mod('roasting'), { label: 'Heat Transfer' }]
        : template('Field report')
    case 'article':
      return nav.articleFrom === 'module'
        ? [landing, index, mod('biochem'), { label: 'Chlorogenic Acids · 2026.02' }]
        : template('Article')
    case 'notes':
      return [landing, { label: `beӕn weirdo — ${navLabel('notes')}` }]
    case 'hours':
      return [landing, { label: `beӕn weirdo — ${navLabel('hours')}` }]
    case 'archive':
      return [admin, { label: 'Notes' }, { label: navLabel('archive') }]
    case 'art':
      return [admin, { label: 'Backend' }, { label: navLabel('art') }]
    case 'logic':
      return [admin, { label: 'Backend' }, { label: navLabel('logic') }]
    case 'cms':
      return [admin, { label: 'Backend' }, { label: navLabel('cms') }]
    default:
      return [landing]
  }
}

/** Where the `←` goes — one step back along the trail the reader walked. */
export function crumbBack(nav: Nav): () => void {
  switch (nav.screen) {
    case 'module':
      return nav.goHome
    case 'cards':
      return nav.cardsFrom === 'module' ? () => nav.openModule('sensory') : nav.goLanding
    case 'report':
      return nav.reportFrom === 'module' ? () => nav.openModule('roasting') : nav.goLanding
    case 'article':
      return nav.articleFrom === 'module' ? () => nav.openModule('biochem') : nav.goLanding
    case 'archive':
      return nav.goHome
    default:
      return nav.goLanding
  }
}
