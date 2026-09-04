export type NoteKind = 'quan sát' | 'video' | 'cảm nhận' | 'liên ngành'

/** Content length drives the title size — a long note gets a bigger headline. */
export type NoteLength = 'dài' | 'vừa' | 'ngắn' | 'media'

/**
 * A note, as it comes out of the `notes` table.
 *
 * Written and edited in place on the Ghi 01 page itself when signed in — there
 * is no separate form (System conventions, rule 08).
 */
export type Note = {
  /** uuid */
  id: string
  /** date, `YYYY-MM-DD` */
  d: string
  k: NoteKind
  /** title */
  t: string
  /** body */
  b: string
  len: NoteLength
  /** custom caption for the media placeholder — falls back to a generic hint */
  mediaHint?: string | null
  /** vertical clip format — narrower media block, taller aspect ratio */
  portrait?: boolean
  /** Which template reads it — a plain note, or a tasting memo. */
  template?: 'note' | 'memo'
  /** Pinned notes lead Ghi 01 regardless of date (merge notes §6). */
  pinned?: boolean
  /** A memo's structure; null for a plain note. See migration 0011. */
  body?: unknown | null
  /** A memo leads with a photograph rather than a caption placeholder. */
  img?: string | null
}

/** What a fresh note starts as before the writer types into it. */
export const BLANK_NOTE: Omit<Note, 'id'> = {
  d: '',
  k: 'quan sát',
  t: '',
  b: '',
  len: 'ngắn',
  mediaHint: null,
  portrait: false,
}

/** Length options, in the order the picker offers them. */
export const noteLengths: NoteLength[] = ['ngắn', 'vừa', 'dài', 'media']

export const noteKinds: NoteKind[] = ['quan sát', 'video', 'cảm nhận', 'liên ngành']

/** One ink per kind — the only place colour is allowed to carry meaning here. */
export const noteColor: Record<NoteKind, string> = {
  'quan sát': '#B65A3C',
  video: '#172124',
  'cảm nhận': '#285E5B',
  'liên ngành': '#163F42',
}

/** The wash that reveals behind a hovered title, and backs a media tile. */
export const noteBlock: Record<NoteKind, string> = {
  'quan sát': '#E9B79C',
  video: '#8CBAB4',
  'cảm nhận': '#AFC8BC',
  'liên ngành': '#9DBBD4',
}

export type Placement = { col: string; mt: string; ar: string; mw: string }

/**
 * Twelve-column placements, cycled down the filtered list. Each note takes a
 * different span, drop and image ratio, so nothing lines up into rows.
 */
export const notePlacement: Placement[] = [
  { col: 'span 5', mt: '0px', ar: '4/3', mw: '78%' },
  { col: 'span 4', mt: '104px', ar: '5/4', mw: '86%' },
  { col: 'span 4', mt: '18px', ar: '4/3', mw: '92%' },
  { col: 'span 5', mt: '132px', ar: '3/2', mw: '72%' },
  { col: 'span 5', mt: '34px', ar: '5/4', mw: '80%' },
  { col: 'span 4', mt: '150px', ar: '4/3', mw: '88%' },
  { col: 'span 4', mt: '26px', ar: '5/4', mw: '94%' },
  { col: 'span 4', mt: '116px', ar: '4/3', mw: '84%' },
]

/**
 * Ghi 01 holds two kinds of cell, and they are not the same kind of thing.
 *
 *   FEATURE CELLS  belong to the page's layout — colour blocks, a quotation, a
 *                  running count. They are numbered F1…F7 and are set up with
 *                  the page, not with any post.
 *   POSTS          are what the owner publishes into the module. They are
 *                  numbered P1…P8 and are set up where posts are written.
 *
 * Both land in the same grid, so it is easy to read the code as if they were
 * one list. They are not: nobody publishes a feature cell, and no post belongs
 * to the page's furniture. Keeping the numbering separate is what stops the
 * next person conflating them.
 */
/**
 * Ghi 01 khi màn hẹp — hình học riêng, không phải bản co của lưới 12 cột.
 *
 * Lưới desktop mã hoá thứ bậc bằng CHỖ ĐỨNG: `span 4` hay `span 5`, lệch trên
 * 0→150px, lệch trái tới -64px. Ép về một cột thì thứ bậc ấy bay sạch và trang
 * thành một dãy ô đều tăm tắp — đúng thứ chủ site bác: "lệch hết về một bên,
 * trông như tờ giấy lộn cắt ghép".
 *
 * Nên bản hẹp soạn lại như một bản nhạc dọc, đổi nhịp nén — mở — nén:
 *   NÉN  ảnh nhỏ kéo ngược lên bằng `mt` âm, kê ngang tầm bài bên cạnh, có ô
 *        đè vào từ mép phải có ô đè từ mép trái.
 *   MỞ   một câu trích và một tấm băng tràn cả hai mép, mỗi thứ đứng riêng cả
 *        đoạn với khoảng trắng rộng bao quanh.
 *
 * Bề rộng không cái nào lặp lại cái nào, và bài đổi bên liên tục — đó là thứ
 * giữ cho trang không đọc ra như một cột.
 *
 * HAI LUẬT CỨNG chủ site chốt, đừng phá khi chỉnh số:
 *   1. Bài chính LUÔN nằm trên ảnh trang trí (`zIndex` 2 so với 1).
 *   2. Chỗ chồng lớp chỉ được rơi vào ẢNH của bài, không bao giờ rơi vào CHỮ.
 *      Vì thế mỗi `mt` âm dưới đây được tính theo chiều cao ảnh của ô liền
 *      trước, không phải đặt cho đẹp mắt.
 */
export type MobilePlacement = { w: string; side: 'left' | 'right'; mt: string; ar: string }

/** Tám vị trí bài của một dải, cùng thứ tự với `notePlacement`. */
export const notePlacementMobile: MobilePlacement[] = [
  { w: '72%', side: 'left', mt: '0px', ar: '4/3' },
  { w: '64%', side: 'right', mt: '58px', ar: '5/4' },
  { w: '76%', side: 'left', mt: '52px', ar: '4/3' },
  { w: '62%', side: 'right', mt: '66px', ar: '3/2' },
  { w: '70%', side: 'left', mt: '46px', ar: '5/4' },
  { w: '66%', side: 'right', mt: '58px', ar: '4/3' },
  { w: '74%', side: 'left', mt: '30px', ar: '5/4' },
  { w: '68%', side: 'left', mt: '72px', ar: '4/3' },
]

/**
 * Hình học hẹp của bảy ô trang trí, tra theo `n` (F1…F7).
 *
 * `w`: `'full'` là tràn cả hai mép trang, `'auto'` là co theo nội dung (ô đếm).
 * `bleed`: phá mép trang 20px ra tận cạnh màn — đúng cái mà `ml: -52/-64px`
 * của bản desktop đang làm.
 */
export type MobileFeature = {
  w: string
  side: 'left' | 'right'
  mt: string
  bleed: boolean
  /** Ô ảnh lấy tỉ lệ thay cho `h` cố định — bề rộng đã đổi thì chiều cao phải đi theo. */
  ar?: string
}

export const featureMobile: Record<number, MobileFeature> = {
  1: { w: '42%', side: 'left', mt: '-210px', bleed: true, ar: '3/4' },
  2: { w: '84%', side: 'left', mt: '74px', bleed: false },
  3: { w: '32%', side: 'right', mt: '-200px', bleed: true, ar: '1/1' },
  4: { w: 'auto', side: 'left', mt: '-132px', bleed: false },
  5: { w: 'full', side: 'left', mt: '54px', bleed: true, ar: '16/9' },
  6: { w: '26%', side: 'right', mt: '-40px', bleed: true, ar: '2/3' },
  7: { w: '46%', side: 'right', mt: '-196px', bleed: true, ar: '3/2' },
}

export type FeatureCell = {
  /** F1…F7 — this cell's own number, independent of the posts. */
  n: number
  /** Sits directly after post P{afterPost} in the grid. */
  afterPost: number
  col: string
  mt: string
  kind: 'slot' | 'quote' | 'count'
  bg: string
  h: string
  t: string
  ml: string
  pl: string
}

/** Non-note grid cells woven between the cards — colour slots, a quote, a tally. */
export const featureCells: FeatureCell[] = [
  { n: 1, afterPost: 1, col: 'span 3', mt: '250px', kind: 'slot', bg: '#9DBBD4', h: '330px', t: 'ảnh dọc — bàn làm việc, dụng cụ bày ra', ml: '-52px', pl: '80px' },
  { n: 2, afterPost: 2, col: 'span 3', mt: '54px', kind: 'quote', bg: '', h: '', t: 'Ghi lại thì mới thấy mình đã nghĩ gì.', ml: '0px', pl: '14px' },
  { n: 3, afterPost: 4, col: 'span 3', mt: '86px', kind: 'slot', bg: '#E9B79C', h: '210px', t: 'ảnh vụn — mảnh cắt nhỏ, chèn đè lên bài bên cạnh', ml: '-64px', pl: '92px' },
  { n: 4, afterPost: 5, col: 'span 3', mt: '190px', kind: 'count', bg: '', h: '', t: '', ml: '0px', pl: '14px' },
  { n: 5, afterPost: 6, col: 'span 4', mt: '68px', kind: 'slot', bg: '#AFC8BC', h: '268px', t: 'ảnh cận cảnh — kết cấu, bề mặt, chất liệu', ml: '0px', pl: '14px' },
  { n: 6, afterPost: 5, col: 'span 3', mt: '46px', kind: 'slot', bg: '#9DBBD4', h: '242px', t: 'ảnh dọc hẹp — một vật thể đơn lẻ', ml: '0px', pl: '14px' },
  { n: 7, afterPost: 7, col: 'span 3', mt: '200px', kind: 'slot', bg: '#E9B79C', h: '176px', t: 'ảnh vụn — chi tiết nhỏ lặp lại', ml: '0px', pl: '14px' },
]

/**
 * What the CMS may change about one feature cell.
 *
 * Only content moves: the photo and the words. Where a cell sits, how tall it
 * is and which tint it wears stay in `featureCells` above, because those are
 * the drawing, not the writing — the batch layout only holds together if the
 * geometry is fixed. Stored on `modules.feature_cells` for Ghi 01.
 */
export type FeatureOverride = {
  n: number
  /** Photo for a `slot` cell; a cell without one stays a colour box. */
  img?: string | null
  /** Caption for a `slot`, or the sentence for a `quote`. */
  t?: string
}

/** Design cells with the admin's words and photos folded in. */
export function withOverrides(
  cells: readonly FeatureCell[],
  overrides: readonly FeatureOverride[] | null | undefined,
): (FeatureCell & { img?: string | null })[] {
  if (!overrides?.length) return cells.map((c) => ({ ...c }))
  return cells.map((c) => {
    const o = overrides.find((x) => x.n === c.n)
    if (!o) return { ...c }
    return { ...c, t: o.t ?? c.t, img: o.img ?? null }
  })
}

export const noteTitleSize = (len: NoteLength) =>
  len === 'dài' ? '62px' : len === 'vừa' ? '46px' : len === 'media' ? '40px' : '36px'

/** Split the body into reading paragraphs — two sentences apiece. */
export function paragraphs(body: string): string[] {
  return body.split('. ').reduce<string[]>((acc, sentence, i, arr) => {
    const t = sentence + (i < arr.length - 1 ? '.' : '')
    if (i % 2 === 0) acc.push(t)
    else acc[acc.length - 1] += ' ' + t
    return acc
  }, [])
}
