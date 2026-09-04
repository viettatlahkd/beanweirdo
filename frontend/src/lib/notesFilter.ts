import { noteColor, noteBlock, type Note } from '../content/notes'

/**
 * Thanh lọc trang Ghi chép, trên **một** bộ từ vựng.
 *
 * Trang bày hai thứ cạnh nhau: ghi chép (bảng `notes`, mang tag ở `k`) và bài
 * đăng dưới Ghi 01 (mang tag ở `kind`). Trước đây mỗi bên có danh sách riêng —
 * bốn dạng ghi viết cứng trong code, bốn tag khác trong bảng — nên thanh lọc và
 * ô chọn tag ở "bài mới" nói hai thứ tiếng, và bấm một chip thì ghi chép biến
 * mất còn bài vẫn nằm nguyên đó.
 *
 * Giờ cả hai đọc bảng `tags`. Một chip đếm cả ghi chép lẫn bài mang tag ấy, và
 * lọc thì lọc cả hai.
 */
export type NoteFilter = 'tất cả' | string

/** Bài đăng đủ để xếp vào một tag. */
export type TaggedPost = { kind?: string | null }

export type FilterChip = { f: NoteFilter; on: boolean; n: number; color: string; wash: string }

/**
 * Màu của một tag.
 *
 * Bốn dạng ghi đầu tiên có mực riêng do bên design đặt; tag chủ site tự thêm
 * lấy màu từ vườn, chọn theo tên nên cùng một tag luôn ra cùng một màu — không
 * đổi màu mỗi lần tải trang.
 */
const GARDEN = ['#B65A3C', '#172124', '#285E5B', '#163F42', '#8A5A33', '#4C3A8E', '#7A5A04']
const WASH = ['#E9B79C', '#8CBAB4', '#AFC8BC', '#9DBBD4', '#EFE5DB', '#EDE9FB', '#FCF3D4']

function pick(label: string, palette: string[]): string {
  let sum = 0
  for (let i = 0; i < label.length; i++) sum = (sum + label.charCodeAt(i) * (i + 1)) % 9973
  return palette[sum % palette.length]
}

export function tagColor(label: string): string {
  return noteColor[label as Note['k']] ?? pick(label, GARDEN)
}

export function tagWash(label: string): string {
  return noteBlock[label as Note['k']] ?? pick(label, WASH)
}

export function noteFilterBar(
  notes: readonly { k: string }[],
  posts: readonly TaggedPost[],
  tags: readonly { label: string }[],
  active: NoteFilter,
): { visibleNotes: readonly { k: string }[]; visiblePosts: readonly TaggedPost[]; chips: FilterChip[] } {
  const wears = (tag: string) => ({
    notes: notes.filter((n) => n.k === tag).length,
    posts: posts.filter((p) => p.kind === tag).length,
  })

  /*
   * Chỉ bày tag đang có thứ đeo nó.
   *
   * Bộ từ vựng dùng chung cho cả trang, nên nó chứa cả tag của những bài không
   * nằm ở đây. Bày hết thì thanh lọc thành một hàng chip số không kéo dài.
   */
  const used = tags.map((t) => t.label).filter((label) => {
    const w = wears(label)
    return w.notes + w.posts > 0
  })

  return {
    visibleNotes: active === 'tất cả' ? notes : notes.filter((n) => n.k === active),
    visiblePosts: active === 'tất cả' ? posts : posts.filter((p) => p.kind === active),
    chips: (['tất cả', ...used] as NoteFilter[]).map((f) => {
      const w = f === 'tất cả' ? null : wears(f)
      return {
        f,
        on: f === active,
        n: w ? w.notes + w.posts : notes.length + posts.length,
        color: f === 'tất cả' ? '#172124' : tagColor(f),
        wash: f === 'tất cả' ? '#EFEDE4' : tagWash(f),
      }
    }),
  }
}
