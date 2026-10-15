/**
 * Gõ ký hiệu markdown ở đầu một khối chữ đứng riêng để đổi loại nó.
 *
 * Chữ liền mạch nằm trong mặt soạn Lexical, và Lexical tự đọc `# `, `- `, `> `.
 * Còn lại là khối chữ **đứng riêng** — bài cũ lưu tiêu đề hay đoạn văn thành
 * element trong kho (article giữ chúng giữa các section) — ô của nó là một ô
 * nhập thường, nên dấu cách ở đây tự đọc ký hiệu.
 *
 * Enter, Backspace và mũi tên giữa các khối không còn ở đây: vỏ khối
 * (`FlowThing`, `thingKeyDown`) lo chúng, một luật cho mọi khối.
 */
import { getElement, textToRuns, type ReportBlock } from 'post-renderer'

/** Khối nào có một ô chữ để mà đổi loại. */
const TEXTED = new Set(['paragraph', 'heading', 'meta', 'callout', 'quote'])

export type BlockFocus = { at: number; caret: number }
type BlockResult = { blocks: ReportBlock[]; focus?: BlockFocus } | null

const isTexted = (b: ReportBlock | undefined) => b !== undefined && TEXTED.has(b.type)

/**
 * Mấy ký tự đầu dòng, đọc thành một loại khối.
 *
 * Cùng bộ ký hiệu với lúc dán. Người viết gõ `# ` vì họ gõ thế ở mọi nơi
 * khác, và cái menu "+ thêm khối" tồn tại để **chỉ ra** rằng có những loại
 * khối nào, không phải để làm cách duy nhất chọn chúng.
 */
function markdownPrefix(prefix: string): { type: string; extra: Record<string, unknown> } | null {
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
