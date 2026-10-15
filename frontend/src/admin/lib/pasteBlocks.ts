/**
 * Đặt cái vừa dán vào giữa một chuỗi khối.
 *
 * Ba màn soạn — report, memo, bitesize — cùng giữ thân bài là một mảng phẳng
 * `ReportBlock[]` và cùng vẽ nó bằng `ReportBlockFields`. Lượt đầu chỉ report
 * được nối, nên dán vào bitesize rơi về dán thường: cả một trang markdown vào
 * một ô, hiện nguyên dấu thăng và dấu sao trên màn. Cùng một bộ máy mà hai
 * hành vi là chỗ người viết không đoán được màn nào làm được gì.
 *
 * Nên luật đặt chỗ nằm ở đây, một bản, cho cả ba gọi.
 */
import { nextId, pastedToBlocks, type ReportBlock } from 'post-renderer'
import { vanishesWhenEmpty } from './reportNotes'

/** Khối rỗng là cái ô trống người viết bấm vào để dán, nên nó bị thay chỗ. */
function isBlank(block: ReportBlock | undefined): boolean {
  if (!block) return false
  return vanishesWhenEmpty(block) && String((block as { text?: string }).text ?? '').trim() === ''
}

/**
 * Chuỗi khối mới sau khi dán, hoặc `null` khi cái dán vào không phải nhiều
 * khối — lúc ấy ô nhập cứ dán như thường.
 *
 * Khối đang đứng mà rỗng thì bị thay chỗ; đã có chữ thì chữ ở lại và cái dán
 * vào nằm ngay dưới.
 */
export function withPastedBlocks(blocks: ReportBlock[], at: number, text: string): ReportBlock[] | null {
  const pasted = pastedToBlocks(text)
  if (!pasted) return null

  /*
   * Id cấp một lượt cho cả mẻ. `nextId` đọc danh sách đang có, nên gọi từng
   * cái trên cùng một mảng cũ sẽ trả về cùng một id nhiều lần — và ghi chú
   * cạnh bài neo vào id khối, nên id trùng là ghi chú bám nhầm chỗ.
   */
  const taken = blocks.map((b) => b.id ?? '')
  const named = pasted.map((b) => {
    const id = nextId('b', taken)
    taken.push(id)
    return { ...b, id } as ReportBlock
  })

  const blank = isBlank(blocks[at])
  const next = [...blocks]
  next.splice(at + (blank ? 0 : 1), blank ? 1 : 0, ...named)
  return next
}
