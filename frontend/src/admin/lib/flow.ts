/**
 * Thân bài như một **dải chữ liền mạch**, có mấy thứ cắm vào giữa.
 *
 * Chủ site: *"cho nó thành liền mạch đi, chia khối này ẻ quá"*, và *"bản chất
 * là ở dòng nào ở đâu bạn cũng tạo được kiểu đó và nó sẽ là 1 phần của văn
 * bản liền mạch"*.
 *
 * Cái sai của bản cũ không phải ở chỗ lưu thành khối — lưu thế là đúng, vì
 * bảng có bề rộng cột, ảnh có điểm căn, ghi chú neo vào `id` khối. Cái sai là
 * **mỗi khối một ô nhập**: trình duyệt không cho một vùng chọn trải qua hai ô
 * nhập, nên bôi đen ba đoạn liền nhau là chuyện không làm được.
 *
 * Nên chỗ này gom lại: mọi khối liền nhau mà markdown viết ra được thì nhập
 * vào **một** ô duy nhất, chữ của chúng nối thành một dải. Thứ markdown không
 * đựng nổi — bảng, số liệu, biểu đồ, ảnh — vẫn là chính nó, cắm vào giữa dải
 * chữ đúng chỗ nó đứng.
 *
 * Cách lưu **không đổi một chữ**. Đây thuần tuý là cách bày ra để sửa.
 */
import { bodyToMarkdown, markdownToBlocks, type ReportBlock } from 'post-renderer'

/** Khối nào markdown viết ra rồi đọc lại được mà không mất gì. */
const FLOWING = new Set(['paragraph', 'heading', 'list', 'quote'])

export type Run =
  /** Một dải chữ liền, gộp từ các khối `at[0]`…`at[1]`. */
  | { kind: 'text'; at: [number, number]; text: string }
  /** Một thứ đứng riêng giữa dải chữ, vẫn giữ nguyên khối của nó. */
  | { kind: 'thing'; at: number; block: ReportBlock }

export const flows = (block: ReportBlock | undefined) => block !== undefined && FLOWING.has(block.type)

/**
 * Thân bài thành các dải.
 *
 * Ghi chú cạnh bài đi đường riêng và không nằm trong dòng chảy, nên chỗ gọi
 * lọc nó ra trước.
 */
export function toRuns(blocks: ReportBlock[]): Run[] {
  /*
   * Bài rỗng vẫn có **một** dải để gõ vào.
   *
   * Không có nó thì một bài mới vẽ ra chỉ còn cái nút `+`, và người viết phải
   * chọn loại khối trước khi được viết chữ đầu tiên. Trong một trình soạn thì
   * chỗ để gõ phải có sẵn.
   */
  if (blocks.length === 0) return [{ kind: 'text', at: [0, -1], text: '' }]
  const out: Run[] = []
  let i = 0
  while (i < blocks.length) {
    if (!flows(blocks[i])) {
      out.push({ kind: 'thing', at: i, block: blocks[i] })
      i += 1
      continue
    }
    const start = i
    while (i < blocks.length && flows(blocks[i])) i += 1
    out.push({ kind: 'text', at: [start, i - 1], text: bodyToMarkdown(blocks.slice(start, i)).text })
  }
  return out
}

/**
 * Người viết vừa sửa xong một dải chữ — dựng lại phần thân bài của dải ấy.
 *
 * Dải rỗng thì **biến mất** chứ không để lại một đoạn văn trống: xoá hết chữ
 * của một dải là nói rằng chỗ ấy không còn gì.
 */
export function writeRun(blocks: ReportBlock[], at: [number, number], text: string): ReportBlock[] {
  const born = text.trim() === '' ? [] : (markdownToBlocks(text) as unknown as ReportBlock[])
  /*
   * Giữ lại `id` cũ theo thứ tự.
   *
   * Ghi chú cạnh bài neo vào `id` khối. Dựng lại cả dải mà cấp id mới hết thì
   * mọi ghi chú trong dải ấy mất chỗ bám — người viết sửa một chữ và mất cả
   * cột ghi chú. Khối nào thừa ra so với trước thì mới cần id mới.
   */
  const keep = blocks.slice(at[0], at[1] + 1).map((b) => b.id)
  const named = born.map((b, k) => (keep[k] ? { ...b, id: keep[k] } : b))

  const next = [...blocks]
  next.splice(at[0], at[1] - at[0] + 1, ...named)
  return next
}

/**
 * Chèn một thứ vào **giữa** một dải chữ, tại đúng chỗ con trỏ đang đứng.
 *
 * Chữ trước con trỏ ở lại thành một dải, thứ vừa chèn đứng sau nó, chữ còn
 * lại thành dải tiếp theo. Đó là nghĩa của "ở dòng nào ở đâu cũng tạo được".
 */
export function splitForThing(
  blocks: ReportBlock[],
  at: [number, number],
  text: string,
  caret: number,
  thing: ReportBlock,
): { blocks: ReportBlock[]; thingAt: number } {
  /*
   * Con trỏ ở **đầu** một dòng thì thứ chèn vào đứng trước dòng ấy; ở bất kỳ
   * đâu khác trong dòng thì đứng **sau** cả dòng.
   *
   * Không bao giờ cắt giữa câu: một cái bảng chen vào giữa một câu làm câu ấy
   * gãy làm đôi, mà người viết không hề ra lệnh cho việc đó.
   */
  const lineStart = text.lastIndexOf('\n', Math.max(0, caret - 1)) + 1
  const lineEnd = text.indexOf('\n', caret)
  const cut = caret === lineStart ? lineStart : lineEnd === -1 ? text.length : lineEnd
  const before = text.slice(0, cut).replace(/\s+$/, '')
  const after = text.slice(cut)

  const head = before.trim() === '' ? [] : (markdownToBlocks(before) as unknown as ReportBlock[])
  const tail = after.trim() === '' ? [] : (markdownToBlocks(after) as unknown as ReportBlock[])

  const keep = blocks.slice(at[0], at[1] + 1).map((b) => b.id)
  const named = [...head, thing, ...tail].map((b, k) => (keep[k] ? { ...b, id: keep[k] } : b))

  const next = [...blocks]
  next.splice(at[0], at[1] - at[0] + 1, ...named)
  return { blocks: next, thingAt: at[0] + head.length }
}
