/**
 * Field-report sample content — the blank template's starting blocks.
 *
 * Lifted from the prototype (`design/prototype/Coffee Study Blog v4.dc.html`,
 * `state.rBlocks` / `rNotes` / `rMemos`). A report is a flat list of typed
 * blocks in the main column plus notes in the rail; the rail runs in two modes
 * — Explorations stack top-down, Memo notes pin to the block they belong to.
 */

export type ReportBlockType = 'meta' | 'h' | 'p' | 'metrics' | 'chart' | 'table' | 'image'

export type Metric = { k: string; v: string }
export type ChartPoint = { l: string; v: number }

export type ReportBlock = {
  id: number
  t: ReportBlockType
  /** text blocks (meta / h / p / image caption) */
  v?: string
  /** metrics */
  m?: Metric[]
  /** chart */
  c?: ChartPoint[]
  /** table header + rows */
  th?: string[]
  tr?: string[][]
  /** per-column widths in %, set by dragging a header divider */
  cols?: number[]
  /** per-row heights in px, set by dragging a row divider */
  rowH?: number[]
}

/** A free note in the rail (Explorations mode). */
export type ReportNote = { id: number; v: string }

/** A note pinned to block index `at` (Memo notes mode). */
export type ReportMemo = { id: number; at: number; v: string }

export const SAMPLE_BLOCKS: ReportBlock[] = [{ id: 1, t: 'meta', v: 'Trại Cầu Đất · lô A2 · 2026.02.11 · 14:20' },
  { id: 2, t: 'h', v: 'Rang thử — Sơn La natural, 900g' },
  { id: 3, t: 'metrics', m: [
    { k: 'Charge', v: '196°C' }, { k: 'Turning point', v: '1:42 / 91°C' },
    { k: 'First crack', v: '8:54 / 197°C' }, { k: 'Drop', v: '10:36 / 208°C' },
    { k: 'Development', v: '19.8%' }, { k: 'Weight loss', v: '14.2%' }
  ] },
  { id: 4, t: 'p', v: 'Mẻ này đẩy lửa cao hơn mẻ trước 8% trong bốn phút đầu để rút ngắn giai đoạn sấy. Turning point đến sớm hơn 11 giây, nhưng first crack lại muộn hơn — nghi do độ ẩm nhân cao hơn lô trước, chưa đo lại được.' },
  { id: 5, t: 'chart', c: [
    { l: '0:00', v: 34 }, { l: '2:00', v: 46 }, { l: '4:00', v: 58 },
    { l: '6:00', v: 71 }, { l: '8:00', v: 86 }, { l: '8:54', v: 92 }, { l: '10:36', v: 100 }
  ] },
  { id: 6, t: 'table', th: ['Mốc', 'Thời gian', 'Nhiệt', 'Ghi chú'], tr: [
    ['Sấy', '0:00 — 4:10', '196 → 148°C', 'màu nhân chuyển vàng nhạt'],
    ['Maillard', '4:10 — 8:54', '148 → 197°C', 'mùi bánh mì, khói mảnh'],
    ['Development', '8:54 — 10:36', '197 → 208°C', 'crack rời, không dồn dập']
  ] },
  { id: 7, t: 'h', v: 'Cupping sau 48 giờ nghỉ' },
  { id: 8, t: 'table', th: ['Tiêu chí', 'Điểm', 'Mô tả'], tr: [
    ['Hương khô', '7.75', 'mật mía, vỏ cam'],
    ['Vị', '8.00', 'chua táo đỏ, hậu ngọt dài'],
    ['Body', '7.50', 'vừa, hơi mỏng ở cuối'],
    ['Cân bằng', '7.75', 'chua và ngọt khớp nhau']
  ] },
  { id: 9, t: 'image', v: 'ảnh — nhân sau khi drop, chụp trên nền trắng' }
]

export const SAMPLE_NOTES: ReportNote[] = [{ id: 101, v: 'Lần sau hạ lửa ở phút 6 thay vì phút 7 — thử giữ development dưới 19%.' },
  { id: 102, v: 'Cần mua ẩm kế nhân. Không đo được độ ẩm thì mọi so sánh giữa lô đều là phỏng đoán.' },
  { id: 103, v: 'Vị mỏng ở cuối có thể do drop sớm, cũng có thể do nước pha. Tách hai biến ra thử riêng.' }
]

export const SAMPLE_MEMOS: ReportMemo[] = [{ id: 201, at: 4, v: 'Vì sao first crack muộn hơn dù lửa cao hơn?' },
  { id: 202, at: 6, v: 'Maillard dài 4:44 — có phải quá dài cho lô natural?' },
  { id: 203, at: 8, v: 'Điểm body thấp nhất bảng. Đối chiếu với mẻ 09.02.' }
]

/** The block types the `+` menu can insert, and what a fresh one starts as. */
export const BLOCK_MENU: { label: string; t: ReportBlockType }[] = [
  { label: 'văn bản', t: 'p' },
  { label: 'tiêu đề', t: 'h' },
  { label: 'bảng', t: 'table' },
  { label: 'số liệu', t: 'metrics' },
  { label: 'biểu đồ', t: 'chart' },
  { label: 'ảnh', t: 'image' },
]

export function blankBlock(id: number, t: ReportBlockType): ReportBlock {
  if (t === 'table') return { id, t, th: ['Cột 1', 'Cột 2', 'Cột 3'], tr: [['', '', ''], ['', '', '']] }
  if (t === 'metrics') return { id, t, m: [{ k: 'Chỉ số', v: '—' }, { k: 'Chỉ số', v: '—' }] }
  if (t === 'chart') return { id, t, c: [{ l: '1', v: 40 }, { l: '2', v: 70 }] }
  return { id, t, v: '' }
}
