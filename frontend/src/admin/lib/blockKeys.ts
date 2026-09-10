/**
 * Enter và Backspace giữa các khối.
 *
 * Trước lượt này, mở một khối mới là đi tìm nút "+ thêm khối" — và `Enter`
 * trong một đoạn văn chèn một ký tự xuống dòng mà **trang không vẽ ra**, nên
 * chữ có ngắt dòng lúc soạn rồi mất ngắt dòng khi đăng. Cả hai đều rơi ra từ
 * một chỗ: bàn phím chưa được dạy gì về cấu trúc.
 *
 * Ở đây cấu trúc là **hệ quả của việc gõ chữ**, không phải điều kiện để được
 * gõ chữ. Đó là khác biệt giữa một trình soạn và một cái biểu mẫu.
 */
import { getElement, nextId, textToRuns, type ReportBlock } from 'post-renderer'

/** Khối nào có một ô chữ để mà đứng ở đầu hay ở cuối nó. */
const TEXTED = new Set(['paragraph', 'heading', 'meta', 'callout', 'quote'])

export type BlockFocus = { at: number; caret: number }
export type BlockResult = { blocks: ReportBlock[]; focus?: BlockFocus } | null

const isTexted = (b: ReportBlock | undefined) => b !== undefined && TEXTED.has(b.type)
const textOf = (b: ReportBlock | undefined) => String((b as { text?: string })?.text ?? '')

function fresh(blocks: ReportBlock[], type: string): ReportBlock {
  const id = nextId('b', blocks.map((b) => b.id ?? ''))
  return { ...getElement(type)!.blank(), id } as unknown as ReportBlock
}

/**
 * `Enter` — mở một khối mới, hoặc tách khối đang đứng.
 *
 * Ở **cuối** khối thì khối mới luôn là đoạn văn: gõ xong một tiêu đề thì thứ
 * tiếp theo gần như luôn là chữ, không phải một tiêu đề nữa.
 *
 * Ở **giữa** chữ thì hai nửa giữ nguyên loại của nhau. Tách một tiêu đề mà
 * nửa sau tụt xuống thành đoạn văn là tự ý đổi thứ người viết đã đặt.
 */
export function enterBlock(blocks: ReportBlock[], i: number, text: string, caret: number): BlockResult {
  const block = blocks[i]
  if (!isTexted(block)) return null

  const before = text.slice(0, caret)
  const after = text.slice(caret)
  const next = [...blocks]

  if (after === '') {
    next.splice(i, 1, { ...block, text: before } as ReportBlock, fresh(blocks, 'paragraph'))
    return { blocks: next, focus: { at: i + 1, caret: 0 } }
  }

  // Nửa sau giữ nguyên mọi thứ của khối cũ — kể cả cấp tiêu đề — trừ id, vì
  // ghi chú cạnh bài neo vào id và hai khối mang cùng một id là ghi chú bám
  // nhầm chỗ.
  const tail = { ...block, id: fresh(blocks, 'paragraph').id, text: after } as ReportBlock
  next.splice(i, 1, { ...block, text: before } as ReportBlock, tail)
  return { blocks: next, focus: { at: i + 1, caret: 0 } }
}

/**
 * `Backspace` ở **đầu** khối.
 *
 * Khối có cấp bậc thì **hạ cấp trước khi xoá**: một tiêu đề gõ xong mà mất vì
 * một phím lỡ tay thì đau hơn nhiều so với thừa một lần bấm. Lần bấm thứ hai
 * mới nhập nó lên.
 */
export function backspaceBlock(blocks: ReportBlock[], i: number, text: string, caret: number): BlockResult {
  if (caret !== 0) return null
  const block = blocks[i]
  if (!isTexted(block)) return null

  if (text !== '' && block.type !== 'paragraph') {
    const next = [...blocks]
    next.splice(i, 1, { ...fresh(blocks, 'paragraph'), id: block.id, text } as ReportBlock)
    return { blocks: next, focus: { at: i, caret: 0 } }
  }

  const prior = blocks[i - 1]
  if (prior === undefined) return null

  if (text === '') {
    const next = blocks.filter((_, k) => k !== i)
    // Khối trên không có ô chữ — một cái bảng, một tấm ảnh — thì không có chỗ
    // nào để đặt con trỏ vào; bỏ khối rỗng đi là đủ.
    return { blocks: next, focus: isTexted(prior) ? { at: i - 1, caret: textOf(prior).length } : undefined }
  }

  /*
   * Nhập lên chỉ làm được khi khối trên có chữ để mà nối vào.
   *
   * Nối một đoạn văn vào một cái bảng thì không có nghĩa gì, và im lặng nuốt
   * mất đoạn ấy là kiểu mất chữ tệ nhất — thứ không ai được báo.
   */
  if (!isTexted(prior)) return null
  const join = textOf(prior)
  const next = blocks.filter((_, k) => k !== i)
  next.splice(i - 1, 1, { ...prior, text: join + text } as ReportBlock)
  return { blocks: next, focus: { at: i - 1, caret: join.length } }
}

/**
 * Mấy ký tự đầu dòng, đọc thành một loại khối.
 *
 * Cùng bộ ký hiệu với lúc dán. Người viết gõ `# ` vì họ gõ thế ở mọi nơi
 * khác, và cái menu "+ thêm khối" tồn tại để **chỉ ra** rằng có những loại
 * khối nào, không phải để làm cách duy nhất chọn chúng.
 */
export function markdownPrefix(prefix: string): { type: string; extra: Record<string, unknown> } | null {
  if (/^#{1,3}$/.test(prefix)) return { type: 'heading', extra: { level: prefix.length } }
  if (prefix === '-' || prefix === '*' || prefix === '+') return { type: 'list', extra: { ordered: false } }
  if (/^\d{1,3}[.)]$/.test(prefix)) return { type: 'list', extra: { ordered: true } }
  if (prefix === '>') return { type: 'quote', extra: {} }
  return null
}

/**
 * Dấu cách vừa gõ có biến khối này thành loại khác không.
 *
 * Chỉ ăn khi mấy ký tự ấy đứng ngay **đầu** khối. `#` giữa câu là một dấu
 * thăng, không phải một tiêu đề, và đổi nó là sửa chữ người viết đang gõ.
 */
export function spaceBlock(blocks: ReportBlock[], i: number, text: string, caret: number): BlockResult {
  const block = blocks[i]
  if (!isTexted(block) || caret === 0) return null

  const hit = markdownPrefix(text.slice(0, caret))
  if (!hit) return null

  const rest = text.slice(caret)
  // Giữ nguyên `id`: đây vẫn là khối ấy, chỉ đổi loại. Ghi chú cạnh bài neo
  // vào id nên đổi id là làm ghi chú rơi mất chỗ bám.
  const born =
    hit.type === 'list'
      ? { ...getElement('list')!.blank(), ...hit.extra, items: [{ runs: textToRuns(rest) }], id: block.id }
      : { ...getElement(hit.type)!.blank(), ...hit.extra, text: rest, id: block.id }

  const next = [...blocks]
  next.splice(i, 1, born as unknown as ReportBlock)
  return { blocks: next, focus: { at: i, caret: 0 } }
}

/** Một phím trong ô chữ của một khối; `null` là trả phím lại cho trình duyệt. */
export function blockKey(
  blocks: ReportBlock[],
  i: number,
  e: { key: string; shiftKey: boolean },
  text: string,
  caret: number,
  selecting: boolean,
): BlockResult {
  // Đang bôi đen thì phím thuộc về vùng chọn ấy, không thuộc về cấu trúc.
  if (selecting) return null
  // `Shift+Enter` để dành cho ngắt dòng trong cùng một khối, chưa làm.
  if (e.key === 'Enter' && !e.shiftKey) return enterBlock(blocks, i, text, caret)
  if (e.key === 'Backspace') return backspaceBlock(blocks, i, text, caret)
  if (e.key === ' ') return spaceBlock(blocks, i, text, caret)
  return null
}
