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

/**
 * Tiêu đề dài tự xuống dòng, và gãy đúng chỗ tiếng Anh cho phép gãy.
 *
 * "biochemistry 101" ở cỡ 92px không vừa bề ngang mảng màu, và HTML mặc định
 * không cắt một từ dài — nên nó tràn ra và bị ô bên cạnh che mất phần đuôi.
 *
 * `hyphens: auto` để trình duyệt tự chèn gạch nối, dùng chính bộ luật ngắt
 * âm tiết của từ điển — nhưng nó chỉ chạy khi biết chữ này thuộc tiếng nào,
 * nên chỗ nào dùng cái này phải kèm `lang="en"` trên thẻ. Trang khai
 * `lang="vi"`, mà tiếng Việt không ngắt âm tiết giữa từ.
 *
 * `8 4 4`: chỉ cắt từ dài từ 8 chữ cái trở lên, và mỗi bên gạch nối phải còn
 * ít nhất 4 chữ — để không ra "bi-ochemistry".
 *
 * `overflowWrap` là lưới hứng: từ nào bộ luật không biết cách ngắt thì vẫn
 * xuống dòng, còn hơn tràn ra ngoài.
 */
export const wrapTitle = {
  maxWidth: '100%',
  hyphens: 'auto',
  WebkitHyphens: 'auto',
  hyphenateLimitChars: '8 4 4',
  overflowWrap: 'break-word',
} as const
