import { noteKinds, type Note } from '../content/notes'

/**
 * Thanh lọc ở trang Ghi chép, và bài đăng đứng ngoài mọi bộ đếm.
 *
 * Trang bày hai thứ cạnh nhau: ghi chép (bảng `notes`, bốn dạng ghi) và bài
 * đăng dưới Ghi 01 (mang tag riêng — `note · essay · ref · log`). Thanh lọc chỉ
 * đếm ghi chép, nên "tất cả — 12" trong khi trang bày 12 ghi chép *và* một bài;
 * và bấm một dạng ghi thì ghi chép biến mất còn bài vẫn nằm nguyên đó, làm
 * thanh lọc trông như hỏng.
 *
 * Hai từ vựng ấy chưa hợp nhất — chờ chủ site chốt danh sách phẳng hay có nhóm.
 * Trong lúc chờ, chỗ này làm đúng hai việc nói được thành lời: "tất cả" đếm cả
 * bài, và lọc theo một dạng ghi thì bài lùi ra cùng, vì bài không xếp được vào
 * ô nào trong bốn dạng ghi.
 */
export type NoteFilter = 'tất cả' | Note['k']

export function noteFilterBar(
  notes: readonly { k: Note['k'] }[],
  filedCount: number,
  active: NoteFilter,
): { showFiled: boolean; chips: { f: NoteFilter; on: boolean; n: number }[] } {
  return {
    showFiled: active === 'tất cả',
    chips: (['tất cả', ...noteKinds] as NoteFilter[]).map((f) => ({
      f,
      on: f === active,
      n: f === 'tất cả' ? notes.length + filedCount : notes.filter((x) => x.k === f).length,
    })),
  }
}
