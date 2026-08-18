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

export type Filler = {
  /** insert right after this index in the (filtered) note stream */
  after: number
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
export const fillers: Filler[] = [
  { after: 1, col: 'span 3', mt: '250px', kind: 'slot', bg: '#9DBBD4', h: '330px', t: 'ảnh dọc — bàn làm việc, dụng cụ bày ra', ml: '-52px', pl: '80px' },
  { after: 2, col: 'span 3', mt: '54px', kind: 'quote', bg: '', h: '', t: 'Ghi lại thì mới thấy mình đã nghĩ gì.', ml: '0px', pl: '14px' },
  { after: 4, col: 'span 3', mt: '86px', kind: 'slot', bg: '#E9B79C', h: '210px', t: 'ảnh vụn — mảnh cắt nhỏ, chèn đè lên bài bên cạnh', ml: '-64px', pl: '92px' },
  { after: 5, col: 'span 3', mt: '190px', kind: 'count', bg: '', h: '', t: '', ml: '0px', pl: '14px' },
  { after: 6, col: 'span 4', mt: '68px', kind: 'slot', bg: '#AFC8BC', h: '268px', t: 'ảnh cận cảnh — kết cấu, bề mặt, chất liệu', ml: '0px', pl: '14px' },
  { after: 5, col: 'span 3', mt: '46px', kind: 'slot', bg: '#9DBBD4', h: '242px', t: 'ảnh dọc hẹp — một vật thể đơn lẻ', ml: '0px', pl: '14px' },
  { after: 7, col: 'span 3', mt: '200px', kind: 'slot', bg: '#E9B79C', h: '176px', t: 'ảnh vụn — chi tiết nhỏ lặp lại', ml: '0px', pl: '14px' },
]

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
