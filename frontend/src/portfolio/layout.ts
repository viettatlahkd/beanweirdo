/**
 * Luật bố cục của Portfolio — viết thẳng trong code, chủ site không chỉnh.
 *
 * Mọi ảnh của khối series nằm trong một hình chữ nhật fibonacci 13 × 8, chia
 * thành các ô vuông 8 · 5 · 3 · 2 · 1 · 1. Ảnh to luôn đặt vào ô 8 hoặc 5, ảnh
 * nhỏ vào một ô nhỏ hơn, nên tỉ lệ cạnh hai ảnh luôn là số fibonacci.
 */

/** Ô vuông trong khung 13 × 8, hướng gốc: [cột, hàng, cạnh]. */
export const CELLS = {
  '8': [1, 1, 8],
  '5': [9, 1, 5],
  '3': [11, 6, 3],
  '2': [9, 7, 2],
  '1': [9, 6, 1],
  '1b': [10, 6, 1],
} as const satisfies Record<string, readonly [number, number, number]>

export type CellKey = keyof typeof CELLS

/** 0 gốc · 1 lật ngang · 2 lật dọc · 3 lật cả hai. */
const ORIENT = [0, 3, 1, 2] as const
const PAIRS: [CellKey, CellKey][] = [['8', '3'], ['5', '2'], ['8', '2'], ['5', '3'], ['8', '5']]

export type Placed = { col: number; row: number; size: number }

/**
 * Khối series thứ `i` trên trang — 06.6.
 *
 * Hướng xoay vòng qua 4 hướng, cặp ô xoay vòng qua 5 cặp: hai khối đứng cạnh
 * nhau không bao giờ trùng bố cục, và tổng cộng có 20 biến thể.
 */
export function seriesLayout(i: number): [Placed, Placed] {
  const flip = ORIENT[i % 4]
  const pair = PAIRS[i % 5]
  return pair.map((k) => {
    let [col, row, size] = CELLS[k]
    if (flip & 1) col = 15 - col - size
    if (flip & 2) row = 10 - row - size
    return { col, row, size }
  }) as [Placed, Placed]
}

const STORY_SMALL: CellKey[] = ['3', '5', '2']

/**
 * Khối kể chuyện thứ `i` — 06.7.
 *
 * Khung đứng 8 × 13 (khung 13 × 8 xoay 90°) với một trục hoành ở điểm cắt vàng,
 * giữa hàng 8 và 9. Ảnh to luôn là ô 8 trên trục; ảnh nhỏ luôn dưới trục,
 * xoay vòng ô 3 → 5 → 2. Chỉ lật ngang. Ảnh nhỏ nghiêng về phía chữ (gương):
 * các khối xen kẽ trái phải đối xứng qua giữa trang.
 */
export function storyLayout(i: number, imageLeft: boolean): [Placed, Placed] {
  const small = STORY_SMALL[i % 3]
  const at = (k: CellKey, mirror: boolean): Placed => {
    const [c, r, size] = CELLS[k]
    let col = r
    const row = c
    if (mirror) col = 10 - col - size
    return { col, row, size }
  }
  const raw = at(small, false)
  const smallRight = raw.col + raw.size / 2 > 5
  const mirror = smallRight !== imageLeft
  return [at('8', mirror), at(small, mirror)]
}

/** Vị trí lưới CSS của một ô. */
export const gridArea = (p: Placed) => `${p.row} / ${p.col} / span ${p.size} / span ${p.size}`

/**
 * Điểm canh ảnh lưu kèm URL (`…jpg#focus=50,25`), như ảnh bìa bài viết đang
 * lưu. Trả về URL sạch và `object-position`.
 */
export function imageOf(url: string | null | undefined): { src: string; position?: string } | null {
  if (!url) return null
  const [src, frag] = url.split('#')
  const m = /focus=([\d.]+),([\d.]+)/.exec(frag ?? '')
  return { src, position: m ? `${m[1]}% ${m[2]}%` : undefined }
}
