/**
 * Design tokens — v4 "garden palette".
 *
 * Lifted verbatim from the Design-system screen of the prototype
 * (`design/prototype/Coffee Study Blog v4.dc.html`). Two typefaces only:
 * Playfair Display for headings, Figtree Light 300 for everything else.
 */

export const serif = "'Playfair Display', serif"
export const sans = "'Be Vietnam Pro', system-ui, sans-serif"

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

/**
 * Chữ do chủ site gõ trong ô nhiều dòng.
 *
 * Ô soạn là `<textarea>`, nên Enter tạo ra một dòng mới thật trong dữ liệu —
 * nhưng HTML mặc định gộp mọi khoảng trắng, nên trên trang hai dòng dán liền
 * vào nhau. Chủ site gõ xuống dòng rồi không thấy nó đâu.
 */
export const prose = { whiteSpace: 'pre-line' } as const

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
  /**
   * Chiều cao dải ảnh module — một con số, dùng ở mọi nơi.
   *
   * Trước đây nó được viết ba lần: ở đây, ở ô xem trước trong CMS (một số
   * literal), và một con số thứ ba cho ảnh đầu trang module. Sửa trang mà ô xem
   * trước giữ nguyên thì ô ấy nói dối — nó hứa cho thấy trang sẽ ra sao.
   *
   * 420 chứ không phải 310: ở bề ngang thật của trang chủ, 310 cho tỉ lệ ~3,6:1
   * — một dải bẹt đến mức gần như không ảnh nào cắt cho vừa mà còn đẹp. 420 đưa
   * về ~2,7:1, vẫn là dải ngang nhưng đủ cao để một khung hình có chỗ thở.
   */
  band: 420,
  /** Ảnh đầu trang module, cùng lý do và cùng tỉ lệ. */
  moduleHero: 280,
  /**
   * Dưới ngưỡng này dùng bố cục mobile. **Một** ngưỡng duy nhất.
   *
   * 899 chứ không phải 767: bố cục desktop cần `measure` 1140 cộng rail 64, nó
   * bắt đầu vỡ quanh 900. Máy tính bảng 834px vì thế nhận bố cục mobile — với
   * một trang để đọc thì đấy là kết quả đúng, và hai ngưỡng thì gấp đôi việc mà
   * không thêm được gì.
   */
  mobileMax: 899,
  /** Lề hai bên trên mobile; desktop là 56. */
  padMobile: 20,
  /** Thanh điều hướng dưới màn, chỉ có ở mobile. */
  barMobile: 56,
  /** Dải ảnh trang chủ trên mobile; desktop là `band`. */
  bandMobile: 220,
  /**
   * Khối bốn ô ở đầu trang module dạng "specimen".
   *
   * 373 với hai hàng 1,7fr / 0,75fr cho hàng dưới đúng 114px trên bề ngang
   * 200 — tỉ lệ 1,75:1, bẹt cùng một kiểu như dải 310 ngày trước, và cắt ảnh
   * cho vừa nó thì mất hết chủ thể. 480 với hai hàng cân hơn cho 271 và 209:
   * ô trên hơi dọc, ô dưới gần vuông, cả hai đều còn chỗ để căn.
   */
  moduleSpecimen: 480,
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
