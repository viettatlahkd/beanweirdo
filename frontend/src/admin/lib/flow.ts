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
import { splitAtLine } from './mdBlocks'

/**
 * Khối nào là **chữ**, tức nhập chung một ô với đoạn văn bên cạnh.
 *
 * Trích dẫn từng nằm trong đây: markdown viết nó ra được (`> `) nên gộp vào
 * dải chữ là gộp được. Nhưng chủ site đòi kéo nó: *"quote cũng phải được di
 * chuyển chứ"* — mà thứ nằm trong dải chữ thì không có tay nắm, vì dải chữ là
 * một dòng chảy chứ không phải một chuỗi khối.
 *
 * Nên trích dẫn ra đứng riêng. Gõ `> ` vẫn tạo ra nó như cũ; chỉ khác là lúc
 * ghi lại, nó tách khỏi dải thành một khối có tay nắm, đúng như ảnh và bảng.
 */
const FLOWING = new Set(['paragraph', 'heading', 'list'])

type Run =
  /** Một dải chữ liền, gộp từ các khối `at[0]`…`at[1]`. */
  | { kind: 'text'; at: [number, number]; text: string }
  /** Một thứ đứng riêng giữa dải chữ, vẫn giữ nguyên khối của nó. */
  | { kind: 'thing'; at: number; block: ReportBlock }

const flows = (block: ReportBlock | undefined) => block !== undefined && FLOWING.has(block.type)

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
 * Chèn một thứ vào **giữa** một dải chữ, ngay sau khối con trỏ đang đứng.
 *
 * Trước 2026-09-21 chỗ gọi tự cộng: `run.at[0] + khối thứ mấy + 1`. Phép cộng
 * ấy giả định mỗi khối trong kho vẽ ra đúng một khối trên mặt soạn, và giả
 * định ấy sai ở article lẫn longform — xem `mdBlocks.ts`. Nên nay không cộng
 * nữa: cắt chính chuỗi markdown của dải, rồi dựng lại cả hai nửa.
 *
 * `thing` giữ `id` mới của nó. Mấy khối chữ thì nhận lại `id` cũ theo thứ tự,
 * cùng lý do với `writeRun`: ghi chú cạnh bài neo vào `id`.
 */
export function insertThing(
  blocks: ReportBlock[],
  at: [number, number],
  text: string,
  /** Số dòng có chữ của dải đứng trên chỗ chèn — xem `linesThrough`. */
  lines: number,
  thing: ReportBlock,
): ReportBlock[] {
  const [before, after] = splitAtLine(text, lines)
  const head = before.trim() === '' ? [] : (markdownToBlocks(before) as unknown as ReportBlock[])
  const tail = after.trim() === '' ? [] : (markdownToBlocks(after) as unknown as ReportBlock[])

  const keep = blocks.slice(at[0], at[1] + 1).map((b) => b.id)
  const named = [...head, ...tail].map((b, k) => (keep[k] ? { ...b, id: keep[k] } : b))

  const next = [...blocks]
  next.splice(at[0], at[1] - at[0] + 1, ...named.slice(0, head.length), thing, ...named.slice(head.length))
  return next
}

/**
 * Nhấc một thứ đang đứng riêng lên rồi thả nó **vào giữa một dải chữ**.
 *
 * Trước đây chỗ thả cộng `run.at[0] + dòng thứ mấy` rồi gọi `move` — lại đúng
 * phép cộng chỉ số mà `insertThing` đã bỏ: dòng trên mặt soạn không phải khối
 * trong kho, nên cái bảng rơi lệch chỗ, hoặc rơi hẳn ra ngoài dải. Chủ site:
 * *"vụ di chuyển các khối cũng chưa ăn"*.
 *
 * Nay đi đúng đường của nút `+`: cắt dải ở dòng được thả, chèn vào đó, rồi mới
 * bỏ bản cũ đi. Dùng chung cho mọi khuôn — mỗi khuôn đưa hàm chèn của mình.
 */
export function moveIntoRun<T>(
  items: readonly T[],
  from: number,
  at: [number, number],
  text: string,
  lines: number,
  insert: (items: T[], at: [number, number], text: string, lines: number, thing: T) => T[],
): T[] {
  const thing = items[from]
  // Thả vào chính dải nó đang đứng trong thì không có nghĩa: nó không đứng trong dải nào.
  if (thing === undefined || (from >= at[0] && from <= at[1])) return items as T[]
  const placed = insert([...items], at, text, lines, thing)
  // Mọi thứ trước dải giữ nguyên chỉ số; thứ sau dải trượt theo độ dài dải mới.
  const old = from < at[0] ? from : from + (placed.length - items.length)
  return placed.filter((_, k) => k !== old)
}
