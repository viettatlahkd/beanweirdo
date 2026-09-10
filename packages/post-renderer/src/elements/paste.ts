/**
 * Reading what the clipboard brought.
 *
 * A writer collecting notes pastes six bullets from somewhere else and expects
 * six bullets. A single-line field cannot do that on its own: the browser
 * strips the newlines and hands over one long string, so the six become one,
 * and the line runs off the edge of the block. Nothing warned them, because
 * nothing was reading the paste — the field only ever saw the flattened text.
 *
 * So the paste is read before the field sees it. Markdown is the notation for
 * the same reason it is the notation inside a line: it is what Notion, Lark,
 * Docs and every editor in between put on the clipboard as plain text, and it
 * is what a writer types by hand when there is no clipboard involved. One
 * notation, so there is no separate import path to keep correct.
 */
import type { ListItem } from './list'
import type { StoredElement } from './read'
import { textToRuns } from './runs'

/** `-`, `*`, `+` are Markdown's; the rest are what pasted text actually holds. */
const BULLET = /^([-*+•‣▪·–—])[ \t]+/
const NUMBERED = /^(\d{1,3})[.)][ \t]+/
/** A tab is a level, and so is the four spaces most editors write instead. */
const INDENT = /^[ \t]*/

export type PastedList = { ordered: boolean; items: ListItem[] }

type Line = { indent: number; text: string; numbered: boolean; marked: boolean }

/** Tabs count as four columns so a mixed paste still sorts into the same levels. */
function indentWidth(raw: string): number {
  let n = 0
  for (const ch of raw) n += ch === '\t' ? 4 : 1
  return n
}

function read(rawLine: string): Line | null {
  const raw = rawLine.replace(/\s+$/, '')
  if (raw.trim() === '') return null
  const indent = indentWidth(INDENT.exec(raw)?.[0] ?? '')
  const body = raw.trimStart()

  const numbered = NUMBERED.exec(body)
  if (numbered) return { indent, text: body.slice(numbered[0].length), numbered: true, marked: true }
  const bullet = BULLET.exec(body)
  if (bullet) return { indent, text: body.slice(bullet[0].length), numbered: false, marked: true }
  return { indent, text: body, numbered: false, marked: false }
}

/**
 * Depth comes from the indents actually present, not from a fixed step.
 *
 * One source indents by two spaces, another by four, another by a tab. Reading
 * a step size out of the paste itself is what lets all three arrive with the
 * same shape instead of one of them collapsing flat and another exceeding the
 * three levels the design draws.
 */
function depths(lines: Line[]): Map<number, number> {
  const seen = [...new Set(lines.map((l) => l.indent))].sort((a, b) => a - b)
  return new Map(seen.map((indent, i) => [indent, Math.min(i, 2)]))
}

/**
 * Pasted text as list items, or `null` when there is nothing a list can do
 * better than the field itself — one plain line is just typing.
 */
export function pastedToItems(text: string): PastedList | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(read).filter((l): l is Line => l !== null)
  if (lines.length === 0) return null
  if (lines.length === 1 && !lines[0].marked) return null

  const depthOf = depths(lines)
  const items: ListItem[] = []
  /** The last item opened at each depth, so a deeper line knows its parent. */
  const open: ListItem[] = []

  for (const line of lines) {
    const depth = depthOf.get(line.indent) ?? 0
    const item: ListItem = { runs: textToRuns(line.text) }
    const parent = depth > 0 ? open[depth - 1] : undefined
    if (parent) {
      parent.children = [...(parent.children ?? []), item]
    } else {
      items.push(item)
    }
    open[depth] = item
    open.length = depth + 1
  }

  // The first marked line decides, because that is the one the writer looked
  // at when they copied. An unmarked paste is bullets: plain lines are a list
  // whose markers the source did not put on the clipboard.
  const first = lines.find((l) => l.marked)
  return { ordered: Boolean(first?.numbered), items }
}

/*
 * Từ đây xuống là mức khối: một trang dán vào, không phải một dòng.
 *
 * Cùng một ký hiệu, đọc ở một cỡ khác. Dán vào một dòng danh sách thì cái đến
 * là các mục; dán vào canvas thì cái đến là tiêu đề, đoạn văn, bảng, ảnh —
 * mỗi thứ một khối, đúng như nguồn đã chia chúng.
 */

const HEADING = /^(#{1,6})[ \t]+(.*)$/
const IMAGE = /^!\[([^\]\n]*)\]\(\s*([^()\s]+)\s*\)$/
const QUOTE = /^>[ \t]?(.*)$/
/** `---`, `***`, `___` — một vạch ngăn; design không có element nào cho nó. */
const RULE = /^(-{3,}|\*{3,}|_{3,})$/
const FENCE = /^(```|~~~)/
const TABLE_ROW = /^\|(.*)\|$/
/** Hàng thứ hai của một bảng markdown: chỉ gạch, hai chấm và vạch đứng. */
const TABLE_RULE = /^\|[\s:|-]+\|$/

/** Đúng thứ `pastedToItems` nhận là một mục — dùng để biết một khối danh sách bắt đầu. */
function startsList(trimmed: string): boolean {
  return BULLET.test(trimmed) || NUMBERED.test(trimmed)
}

/** `| a | b |` thành `['a', 'b']`. */
function cells(row: string): string[] {
  return (TABLE_ROW.exec(row)?.[1] ?? '').split('|').map((c) => c.trim())
}

/**
 * Chữ dán vào thành một chuỗi element, hoặc `null` khi không có gì một chuỗi
 * khối làm khá hơn chính ô nhập.
 *
 * Trả `null` cho một đoạn văn đơn độc là có chủ ý: dán một câu vào giữa một
 * đoạn đang viết là thao tác thường nhất trong màn soạn, và biến nó thành một
 * khối mới là làm hỏng thao tác ấy để đổi lấy một trường hợp hiếm hơn nhiều.
 */
export function pastedToBlocks(text: string): StoredElement[] | null {
  const out = markdownToBlocks(text)
  if (out.length === 0) return null
  if (out.length === 1 && out[0].type === 'paragraph') return null
  return out
}

/**
 * Chữ markdown thành khối, **luôn** trả về một mảng.
 *
 * Đây là đường của màn soạn liền mạch và của lúc render: cả bài là một dải
 * chữ, khối chỉ dựng lại khi vẽ. Nó khác `pastedToBlocks` đúng ở chỗ ấy —
 * dán một câu lẻ vào giữa đoạn thì phải là dán chữ, nhưng **lưu** một bài chỉ
 * có một câu thì bài ấy có đúng một đoạn văn, không phải không có gì.
 */
export function markdownToBlocks(text: string): StoredElement[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const out: StoredElement[] = []
  let para: string[] = []

  /** Các dòng chữ liền nhau là một đoạn — dòng trống mới là chỗ ngắt đoạn. */
  const flush = () => {
    if (para.length > 0) out.push({ type: 'paragraph', text: para.join(' ') })
    para = []
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      flush()
      i++
      continue
    }

    if (FENCE.test(trimmed)) {
      // Không có element nào vẽ được khối mã. Bỏ hai dòng rào và giữ lấy chữ
      // bên trong — bỏ luôn cả ruột là mất chữ mà không ai được báo.
      flush()
      i++
      while (i < lines.length && !FENCE.test(lines[i].trim())) {
        para.push(lines[i].trim())
        i++
      }
      i++
      flush()
      continue
    }

    const heading = HEADING.exec(trimmed)
    if (heading) {
      flush()
      // Markdown có sáu cấp, design vẽ ba. Cấp sâu hơn về cấp ba chứ không
      // rơi mất — một tiêu đề mất cấp vẫn là một tiêu đề.
      out.push({ type: 'heading', text: heading[2], level: Math.min(3, heading[1].length) })
      i++
      continue
    }

    const image = IMAGE.exec(trimmed)
    if (image) {
      flush()
      out.push({ type: 'image', caption: image[1], imageUrl: image[2] })
      i++
      continue
    }

    if (RULE.test(trimmed)) {
      flush()
      i++
      continue
    }

    if (QUOTE.test(trimmed)) {
      flush()
      const said: string[] = []
      while (i < lines.length && QUOTE.test(lines[i].trim())) {
        said.push(QUOTE.exec(lines[i].trim())![1].trim())
        i++
      }
      /*
       * Dòng cuối mở đầu bằng gạch ngang là **nguồn**, không phải lời trích.
       *
       * Đây là lối ghi nguồn quen thuộc, và cũng là cách `bodyToMarkdown` viết
       * nó ra — thiếu vế đọc lại thì mỗi vòng đi về là mất tên người được
       * trích.
       */
      const kept = said.filter(Boolean)
      const last = kept[kept.length - 1] ?? ''
      const credited = /^(—|--|–)\s*(.+)$/.exec(last)
      out.push({
        type: 'quote',
        text: (credited ? kept.slice(0, -1) : kept).join(' '),
        attribution: credited ? credited[2].trim() : '',
      })
      continue
    }

    if (TABLE_ROW.test(trimmed) && TABLE_RULE.test(lines[i + 1]?.trim() ?? '')) {
      flush()
      const columns = cells(trimmed)
      i += 2
      const rows: { cells: string[] }[] = []
      while (i < lines.length && TABLE_ROW.test(lines[i].trim())) {
        rows.push({ cells: cells(lines[i].trim()) })
        i++
      }
      out.push({ type: 'table', table: { columns, rows } })
      continue
    }

    if (startsList(trimmed)) {
      flush()
      const chunk: string[] = []
      // Một dòng thụt lề đi theo danh sách là mục con của nó; một dòng sát lề
      // mà không có dấu đầu dòng là đoạn văn mới, và danh sách dừng ở đó.
      while (i < lines.length) {
        const next = lines[i]
        if (next.trim() === '') break
        if (!startsList(next.trim()) && next === next.trimStart()) break
        chunk.push(next)
        i++
      }
      const pasted = pastedToItems(chunk.join('\n'))
      if (pasted) out.push({ type: 'list', ordered: pasted.ordered, items: pasted.items })
      continue
    }

    para.push(trimmed)
    i++
  }
  flush()
  return out
}
