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
  goArt(): void
  goLanding(): void
  goHome(): void
  goArchive(): void
  goHours(): void
  goNotes(): void
  openModule(id: string): void
  openArticle(): void
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
