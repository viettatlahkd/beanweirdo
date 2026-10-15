/**
 * Thân bài long-form như một dải chữ liền mạch.
 *
 * Long-form là khuôn cuối còn để mỗi khối một ô nhập, và chủ site gặp đúng hậu
 * quả của nó: *"tại sao tôi chọn long form mà tôi không dùng chuột bôi đen
 * được vậy? nó vẫn cứ bị bôi đen theo paragraph ấy?"* — trình duyệt không cho
 * một vùng chọn trải qua hai ô nhập, nên ba đoạn liền nhau là ba vùng rời.
 *
 * `flow.ts` đã giải đúng bài toán ấy cho report, memo và bitesize. Chỗ này là
 * cùng cách giải, viết cho từ vựng riêng của long-form.
 *
 * **Bộ vẽ trang không đụng tới.** `Longform.tsx` vẫn nhận `LongformBlock[]` y
 * như cũ và cách lưu không đổi một chữ — bài "Lipid: Tổng quan" có 400 khối
 * đang chạy trên trang thật, và đây thuần tuý là cách bày ra để sửa.
 */
import { longformRunsToText, longformTextToRuns, type LongformBlock } from 'post-renderer'
import { splitAtLine } from './mdBlocks'

/** Khối nào markdown viết ra rồi đọc lại được mà không mất gì. */
const FLOWING = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'li'])

const flowsLongform = (b: LongformBlock | undefined) => b !== undefined && FLOWING.has(b.k)

type FlowRun =
  /** Một dải chữ liền, gộp từ các khối `at[0]`…`at[1]`. */
  | { kind: 'text'; at: [number, number]; text: string }
  /** Một thứ đứng riêng giữa dải chữ — `fig`, `note`, `aside`, `formula`. */
  | { kind: 'thing'; at: number }

/** Hai dấu cách một tầng, đúng cách markdown lồng danh sách. */
const STEP = '  '

function blockToMarkdown(b: LongformBlock): string {
  const text = longformRunsToText(b.runs)
  if (b.k === 'h1') return `# ${text}`
  if (b.k === 'h2') return `## ${text}`
  // Kho markdown chỉ có ba mức tiêu đề; `h4` về chung với `h3` vì trang vẽ
  // chúng gần như nhau, và mất một mức nhẹ hơn mất cả dòng tiêu đề.
  if (b.k === 'h3' || b.k === 'h4') return `### ${text}`
  if (b.k === 'li') return `${STEP.repeat(Math.max(0, (b.lvl ?? 1) - 1))}- ${text}`
  if (b.quote) return `> ${text}`
  return text
}

/**
 * Cả một dải khối thành một chuỗi markdown.
 *
 * Mỗi khối một đoạn, cách nhau một dòng trống — trừ hai mục danh sách liền
 * nhau, hay hai dòng trích dẫn liền nhau, vốn là một khối trên mặt soạn.
 *
 * Trước 2026-09-24 cả dải nối bằng **một** dấu xuống dòng, và Lexical gộp các
 * dòng liền nhau thành một đoạn có ngắt dòng (`$importBlocks`): năm đoạn văn
 * thành một khối, một đoạn ngay sau danh sách bị nuốt vào mục cuối. Nút `+`
 * và chỗ thả khối vì thế chỉ đặt được sau cả cụm. Chủ site: *"nó phải chèn
 * được vào line text chứ không phải là chèn vào từng khối paragraph"*.
 */
export function runToMarkdown(blocks: LongformBlock[]): string {
  return blocks
    .map((b, i) => {
      const next = blocks[i + 1]
      if (!next) return blockToMarkdown(b)
      const tight = (b.k === 'li' && next.k === 'li') || (!!b.quote && !!next.quote)
      return `${blockToMarkdown(b)}${tight ? '\n' : '\n\n'}`
    })
    .join('')
}

const HEADING = /^(#{1,3})\s+(.*)$/
const ITEM = /^(\s*)-\s+(.*)$/
const QUOTE = /^>\s?(.*)$/

function lineToBlock(line: string): LongformBlock {
  const heading = HEADING.exec(line)
  if (heading) {
    const k = (['h1', 'h2', 'h3'] as const)[heading[1].length - 1]
    return { k, runs: longformTextToRuns(heading[2]) }
  }
  const quote = QUOTE.exec(line)
  if (quote) return { k: 'p', quote: true, runs: longformTextToRuns(quote[1]) }
  const item = ITEM.exec(line)
  if (item) {
    // Ba tầng là hết, như `stepIndent` vẫn giữ.
    const lvl = Math.min(3, Math.floor(item[1].length / STEP.length) + 1)
    return { k: 'li', runs: longformTextToRuns(item[2]), lvl }
  }
  return { k: 'p', runs: longformTextToRuns(line) }
}

/**
 * Markdown quay về khối.
 *
 * Dòng trống bỏ đi chứ không thành đoạn rỗng: gõ Enter hai lần để lấy khoảng
 * thở là thói quen của người viết, không phải yêu cầu về một khối trống.
 */
export function markdownToRun(markdown: string): LongformBlock[] {
  return markdown
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map(lineToBlock)
}

/** Thân bài thành các dải. Bài rỗng vẫn có một dải để gõ vào. */
export function toLongformRuns(blocks: LongformBlock[]): FlowRun[] {
  if (blocks.length === 0) return [{ kind: 'text', at: [0, -1], text: '' }]
  const out: FlowRun[] = []
  let i = 0
  while (i < blocks.length) {
    if (!flowsLongform(blocks[i])) {
      out.push({ kind: 'thing', at: i })
      i += 1
      continue
    }
    const start = i
    while (i < blocks.length && flowsLongform(blocks[i])) i += 1
    out.push({ kind: 'text', at: [start, i - 1], text: runToMarkdown(blocks.slice(start, i)) })
  }
  return out
}

/** Ghi một dải đã sửa trở lại vào đúng chỗ của nó trong thân bài. */
export function writeLongformRun(
  blocks: LongformBlock[],
  at: [number, number],
  markdown: string,
): LongformBlock[] {
  const next = markdownToRun(markdown)
  return [...blocks.slice(0, at[0]), ...next, ...blocks.slice(at[1] + 1)]
}

/**
 * Chèn một thứ vào giữa một dải, ngay sau khối con trỏ đang đứng.
 *
 * Ở đây `runToMarkdown` nối cả dải bằng **một** dấu xuống dòng, nên năm đoạn
 * văn liền nhau vẽ ra *một* khối trên mặt soạn. Phép cộng chỉ số cũ vì thế
 * luôn ra `run.at[0] + 1`, tức khối chèn vào luôn rơi ngay sau đoạn đầu dải
 * bất kể con trỏ ở đâu.
 */
export function insertLongformThing(
  blocks: LongformBlock[],
  at: [number, number],
  text: string,
  /** Số dòng có chữ của dải đứng trên chỗ chèn — xem `linesThrough`. */
  lines: number,
  thing: LongformBlock,
): LongformBlock[] {
  const [before, after] = splitAtLine(text, lines)
  return [
    ...blocks.slice(0, at[0]),
    ...markdownToRun(before),
    thing,
    ...markdownToRun(after),
    ...blocks.slice(at[1] + 1),
  ]
}

/** Dải nào chứa khối thứ `i`, để `wrapBlock` biết vẽ gì ở chỗ ấy. */
export function runAtIndex(runs: FlowRun[], i: number): FlowRun | undefined {
  return runs.find((r) => (r.kind === 'text' ? i >= r.at[0] && i <= r.at[1] : r.at === i))
}
