/**
 * Design tokens shared by every post template.
 *
 * Copied verbatim from `frontend/src/design/tokens.ts` (the "garden palette").
 * This package cannot depend on `frontend/` (frontend depends on it, not the
 * reverse), so the specific subset of tokens the three templates need is
 * duplicated here. Keep in sync with frontend/src/design/tokens.ts by hand —
 * do not invent new colors or fonts when extending these components.
 */

export const serif = "'Playfair Display', serif"
export const sans = "'Be Vietnam Pro', system-ui, sans-serif"

export const paper = {
  cream: '#FDFBF2',
  white: '#FFFFFF',
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
  green: '#3E7A4E',
  moss: '#2B4B33',
} as const

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

export const layout = {
  measure: 1140,
  railMin: 200,
  railMax: 260,
} as const
