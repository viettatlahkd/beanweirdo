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
