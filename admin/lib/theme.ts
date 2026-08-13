/**
 * Design tokens — admin app.
 *
 * Copied verbatim from the shipping public-site tokens
 * (`frontend/src/design/tokens.ts`) and the approved admin mockup
 * (`.superpowers/brainstorm/2212-1786598470/content/full-mockup.html`).
 * Kept as a standalone copy on purpose — admin/ and frontend/ are two
 * separate deployments and shouldn't share a runtime import — but the
 * values must stay in sync with the source of truth above.
 */

export const serif = "'Playfair Display', serif"
export const sans = "'Be Vietnam Pro', system-ui, sans-serif"

/** Paper, ink and rules — the shared substrate of every admin screen. */
export const paper = {
  cream: '#FDFBF2',
  white: '#FFFFFF',
  /** sidebar / row hover */
  hover: '#F6F2E2',
  rule: '#EBE5D3',
} as const

export const ink = {
  base: '#23211A',
  body: '#262319',
  strong: '#3B3729',
  mid: '#4B463A',
  soft: '#5C5745',
  muted: '#8C8674',
  faint: '#B5AE99',
  /** links + hover across the whole site */
  green: '#3E7A4E',
  /** anchor colour: quote block, deep accents */
  moss: '#2B4B33',
} as const

/** The five garden hues plus their supporting tints. */
export const garden = {
  blush: '#F2A0A5',
  leaf: '#7FB87E',
  apricot: '#F0B45C',
  moss: '#2B4B33',
  cinnamon: '#8A5A33',
  petalTint: '#FBE7E5',
  petalTint2: '#F6D2D4',
  leafTint: '#E4F0DF',
  leafTint2: '#CFE6C8',
  honeyTint: '#F9EBD2',
  honeyTint2: '#F3DCAE',
} as const

export const theme = { serif, sans, paper, ink, garden } as const

export default theme
