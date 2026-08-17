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

/** Two shapes for the index screen — a ledger (A) and three columns (B). */
export type Variant = 'A' | 'B'

export type Nav = {
  screen: Screen
  variant: Variant
  moduleId: string
  /** The post currently open on the article screen — null until one is picked. */
  postId: string | null
  goArt(): void
  goLanding(): void
  goHome(): void
  goArchive(): void
  goHours(): void
  goNotes(): void
  openModule(id: string): void
  /**
   * Optional id: some call sites (the sidebar's static "sample post" link)
   * don't have a real post to hand over — the article screen falls back to
   * the one post that has a full essay written when none is given.
   */
  openArticle(id?: string): void
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
