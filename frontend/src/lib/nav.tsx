import { createContext, useContext } from 'react'

export type Screen =
  | 'art'
  | 'landing'
  | 'home'
  | 'module'
  | 'article'
  | 'archive'
  | 'hours'
  | 'notes'
  | 'cms'
  | 'logic'
  | 'cards'
  | 'report'

/** Two shapes for the index screen — a ledger (A) and three columns (B). */
export type Variant = 'A' | 'B'

/**
 * How the reader reached a template screen. The three templates (Article,
 * Field report, Info cards) each serve two roles: a real post under a module,
 * and the blank sample reachable from Admin › Templates. Same screen, but the
 * colour block, labels and breadcrumb trail differ — so the screen has to know
 * which door was used.
 */
export type Origin = 'module' | 'admin'

export type Nav = {
  screen: Screen
  variant: Variant
  moduleId: string
  /** The post currently open on the article screen — null until one is picked. */
  postId: string | null
  articleFrom: Origin
  reportFrom: Origin
  cardsFrom: Origin
  goArt(): void
  goLanding(): void
  goHome(): void
  goArchive(): void
  goHours(): void
  goNotes(): void
  goCms(): void
  goLogic(): void
  goCards(from?: Origin): void
  goReport(from?: Origin): void
  openModule(id: string): void
  /**
   * Optional id: some call sites (the sidebar's Templates links) don't have a
   * real post to hand over — the article screen falls back to the one post
   * that has a full essay written when none is given.
   */
  openArticle(id?: string, from?: Origin): void
  toggleVariant(): void
}

/**
 * Prototype knobs, carried over as app settings.
 *
 * `showPlates` toggles every image placeholder — with real photography dropped
 * in, these blocks become the `<img>` slots. `density` tightens the index rows.
 */
export type Settings = {
  density: 'compact' | 'roomy'
  showPlates: boolean
}

export const NavContext = createContext<Nav | null>(null)
export const SettingsContext = createContext<Settings>({
  density: 'roomy',
  showPlates: true,
})

export function useNav(): Nav {
  const nav = useContext(NavContext)
  if (!nav) throw new Error('useNav must be used inside <NavContext.Provider>')
  return nav
}

export const useSettings = () => useContext(SettingsContext)

/** Index rows breathe more in `roomy`. */
export const rowPad = (density: Settings['density']) =>
  density === 'compact' ? '12px' : '17px'
