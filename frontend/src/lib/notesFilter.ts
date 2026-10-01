import { noteColor, noteBlock } from '../content/notes'

/**
 * Thanh lọc trang Ghi chép.
 *
 * Trang từng bày hai thứ cạnh nhau: ghi chép (bảng `notes`, mang tag ở `k`) và
 * bài đăng dưới Ghi 01 (mang tag ở `kind`), mỗi bên một danh sách tag riêng —
 * nên bấm một chip thì ghi chép biến mất còn bài vẫn nằm nguyên đó. Bước một là
 * cho cả hai cùng đọc bảng `tags`. Bước hai, ở đây, là bỏ hẳn bên ghi chép: một
 * ghi chép dưới Ghi 01 chính là một bài đăng dưới Ghi 01. Nên thanh này chỉ còn
 * đếm và lọc bài.
 */
export type NoteFilter = 'tất cả' | string

/** Bài đăng đủ để xếp vào một tag. */
export type TaggedPost = { kind?: string | null }

/**
 * `f` is the tag id — what `posts.kind` stores and what the filter compares.
 * `label` is what the chip shows; ids are slugs and read badly on the page.
 */
export type FilterChip = { f: NoteFilter; label: string; on: boolean; n: number; color: string; wash: string }

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
  return noteColor[label] ?? pick(label, GARDEN)
}

export function tagWash(label: string): string {
  return noteBlock[label] ?? pick(label, WASH)
}

export function noteFilterBar(
  posts: readonly TaggedPost[],
  tags: readonly { id: string; label: string }[],
  active: NoteFilter,
): { visiblePosts: readonly TaggedPost[]; chips: FilterChip[] } {
  const wears = (tag: string) => posts.filter((p) => p.kind === tag).length

  /*
   * Chỉ bày tag đang có thứ đeo nó.
   *
   * Bộ từ vựng dùng chung cho cả trang, nên nó chứa cả tag của những bài không
   * nằm ở đây. Bày hết thì thanh lọc thành một hàng chip số không kéo dài.
   */
  const used = tags.filter((t) => wears(t.id) > 0)

  return {
    visiblePosts: active === 'tất cả' ? posts : posts.filter((p) => p.kind === active),
    chips: [
      { f: 'tất cả', label: 'tất cả', on: active === 'tất cả', n: posts.length, color: '#172124', wash: '#EFEDE4' },
      // Colour stays keyed by label: the design's inks in `noteColor` are
      // written against labels, and the garden pick is seeded by the label.
      ...used.map((t) => ({
        f: t.id,
        label: t.label,
        on: t.id === active,
        n: wears(t.id),
        color: tagColor(t.label),
        wash: tagWash(t.label),
      })),
    ],
  }
}
