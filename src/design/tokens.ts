/**
 * Design tokens — v4 "garden palette".
 *
 * Lifted verbatim from the Design-system screen of the prototype
 * (`design/prototype/Coffee Study Blog v4.dc.html`). Two typefaces only:
 * Playfair Display for headings, Figtree Light 300 for everything else.
 */

export const serif = "'Playfair Display', serif"
export const sans = "'Figtree', system-ui, sans-serif"

/** Paper, ink and rules — the shared substrate of every blog screen. */
export const paper = {
  cream: '#FDFBF2',
  white: '#FFFFFF',
  /** sidebar row hover */
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

/** Practice — 01 / Hours runs its own cool grey-green language. */
export const hoursTheme = {
  bg: '#E9EBE4',
  ink: '#212520',
  muted: '#767C70',
  soft: '#5E645A',
  dim: '#8A8F84',
  card: '#F7F7F2',
  border: '#D3D6CB',
  borderSoft: '#C6CABC',
  track: '#DDE0D6',
  accent: '#2E8C74',
  cellIdle: '#F4F4EF',
  cellDone: '#EAEEE4',
  cellStrong: '#DDE3D6',
  chartIdle: '#D3D6CB',
  chartMid: '#9DBFAF',
  onInk: '#F1F2EC',
} as const

/** Practice — 02 / Notes: cold white editorial, four ink colours. */
export const notesTheme = {
  bg: '#FCFCFA',
  ink: '#12120F',
  body: '#33332C',
  soft: '#5A5A50',
  mid: '#4A4A42',
  muted: '#8A8A80',
  faint: '#9A9A90',
  ghost: '#B0B0A6',
  arcStrong: '#E2E2DC',
  arcSoft: '#E8E8E2',
  carmine: '#C0143C',
} as const

/**
 * Spacing rhythm — 8 / 20 / 40 / 64 / 96.
 * Section padding is 56px on the sides, 44 top / 72 bottom.
 */
export const space = {
  gap: 8,
  inner: 20,
  column: 40,
  section: 64,
  block: 96,
} as const

export const layout = {
  /** sidebar: 64px closed, 268px on hover */
  sidebarClosed: 64,
  sidebarOpen: 268,
  /** body measure */
  measure: 1140,
  page: 1240,
  /** article side rail */
  railMin: 200,
  railMax: 260,
  /** module image band height */
  band: 310,
} as const
