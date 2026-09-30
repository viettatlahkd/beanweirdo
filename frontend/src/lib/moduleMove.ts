/**
 * Thả một module vào một chỗ khác trong cây — phép tính, không phải giao diện.
 *
 * Kéo thả trong cây khác kéo thả trong danh sách ở chỗ nó trả lời **hai** câu
 * một lúc: module này về nằm trong ai, và nó đứng thứ mấy giữa các anh em. Màn
 * quản trị trước đây chỉ có câu thứ hai — `dropModule` hoán vị hai phần tử của
 * một mảng phẳng — còn câu thứ nhất phải trả lời bằng ô chọn "Nằm trong".
 *
 * Tách ra đây vì hai lý do:
 *
 * - Nó thuần tính toán trên một mảng, nên kiểm được mà không cần dựng DOM và
 *   không cần giả lập chuột. Kéo thả là thứ jsdom không dựng nổi, nên nếu phép
 *   tính nằm lẫn trong `Cms.tsx` thì nó không có bài kiểm nào cả.
 * - Nó phải khớp với luật của máy chủ. `canReparent` trong `contentTree.ts` là
 *   luật ấy, và ở đây gọi thẳng nó chứ không chép lại.
 */
import { buildTree, canReparent, descendantIds, flattenTree, type TreeRow } from './contentTree'

/** Chỗ con trỏ đang chỉ tới, so với thẻ nó đang nằm trên. */
export type DropWhere = 'before' | 'after' | 'inside'

type MovePlan = {
  /** Cha mới của module vừa kéo; `null` là đưa nó lên tầng trên cùng. */
  parentId: string | null
  /**
   * Toàn bộ id theo thứ tự hiển thị mới, cha đứng trước con của nó.
   *
   * `PUT /api/modules` ghi `sort_order` 1..N đè lên đúng mảng này. Viết cả cây
   * đã duỗi thẳng — chứ không chỉ mấy anh em vừa đổi chỗ — vì `sort_order` là
   * một dãy số chung cho cả bảng, nên số của một nhánh mà không xét nhánh khác
   * thì hai nhánh giẫm lên nhau.
   */
  order: string[]
}

type MoveResult = MovePlan | { error: string }

/** Cha thật của một hàng: một `parent_id` trỏ ra ngoài mảng đọc như không có cha. */
const parentOf = <T extends TreeRow>(rows: readonly T[], id: string): string | null => {
  const row = rows.find((r) => r.id === id)
  const parent = row?.parent_id
  if (!parent || parent === id) return null
  return rows.some((r) => r.id === parent) ? parent : null
}

/**
 * Cây sau khi thả `dragId` vào `where` của `targetId`.
 *
 * `rows` phải **đã** ở đúng thứ tự màn hình đang bày: hàm này giữ nguyên thứ
 * tự ấy cho mọi thứ nó không phải động tới, nên đưa vào một mảng chưa sắp là
 * ghi đè thứ tự của chủ site bằng thứ tự của database.
 */
export function planModuleMove<T extends TreeRow>(
  rows: readonly T[],
  dragId: string,
  targetId: string,
  where: DropWhere,
): MoveResult {
  if (dragId === targetId) return { error: 'không thả một module lên chính nó' }
  if (!rows.some((r) => r.id === dragId)) return { error: `không có module "${dragId}"` }
  if (!rows.some((r) => r.id === targetId)) return { error: `không có module "${targetId}"` }

  const parentId = where === 'inside' ? targetId : parentOf(rows, targetId)

  const allowed = canReparent(rows, dragId, parentId)
  if (!allowed.ok) return { error: allowed.reason }

  // Cả cây duỗi thẳng, cha trước con — chính là thứ tự các thẻ trên màn.
  const shown = flattenTree(buildTree(rows)).map((n) => n.row.id)

  /*
   * Kéo một module là kéo cả những gì nằm trong nó. Cắt nguyên cụm ra rồi cắm
   * lại nguyên cụm: nhấc mỗi cái cha ra thì lũ con ở lại chỗ cũ, và `sort_order`
   * ghi xong sẽ dựng ra một cây khác hẳn cái người ta vừa nhìn thấy.
   */
  const moving = new Set(descendantIds(rows, dragId))
  const block = shown.filter((id) => moving.has(id))
  const rest = shown.filter((id) => !moving.has(id))

  const at = rest.indexOf(targetId)
  // `targetId` không thể nằm trong cụm vừa cắt: `canReparent` đã loại đúng
  // trường hợp ấy cho `inside`, và với before/after thì nó là anh em, không
  // phải con cháu.
  if (at < 0) return { error: 'không thả một module vào bên trong chính nó' }

  /*
   * `after` và `inside` đều cắm xuống *dưới* cả cụm của `targetId`, không phải
   * ngay sau một dòng: thả xuống dưới "bean weirdo" mà cắm trên "roasting" thì
   * thẻ vừa thả nhảy vào giữa ruột nhà người ta.
   *
   * `inside` cắm cuối, như thêm một dòng vào cuối danh sách đang mở — chứ
   * không chen lên đầu trước những mục đã có.
   */
  const below = descendantIds(rows, targetId).filter((id) => !moving.has(id))
  const cut = where === 'before' ? at : at + below.length

  return { parentId, order: [...rest.slice(0, cut), ...block, ...rest.slice(cut)] }
}
