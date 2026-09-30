/**
 * Thân bài article như một dải chữ liền mạch.
 *
 * Cùng cách giải với `flow.ts` và `longformFlow.ts`, viết cho từ vựng của
 * article: thân bài là các `section`, mỗi cái một tiêu đề và một đoạn chữ.
 * Trước đây mỗi phần ấy là một ô nhập riêng, nên bôi đen từ đoạn này sang đoạn
 * kia là chuyện không làm được.
 *
 * Section có ảnh thì đứng riêng — ảnh không viết ra markdown được, và gộp nó
 * vào dải thì cái ảnh biến mất khỏi chỗ soạn.
 *
 * Cách lưu không đổi: vẫn là `SectionData[]`, `Article.tsx` không phải biết gì.
 */
import type { SectionData } from 'post-renderer'
import { splitAtLine } from './mdBlocks'

/**
 * A body entry taken from the shared element store, not article's own
 * `{h, p, fig}` vocabulary. Recognised by `type` — the one key every stored
 * element carries and no section has.
 */
export const isStoredElement = (s: SectionData | undefined): boolean =>
  typeof (s as { type?: unknown } | undefined)?.type === 'string'

/*
 * A table, a chart or an image cannot be written out as markdown and read back
 * unchanged, so a stored element stands on its own the way `fig` does — fold
 * it into the run of prose and it disappears from the editing surface.
 */
const flowsSection = (s: SectionData | undefined) =>
  s !== undefined && !s.fig && !isStoredElement(s)

type SectionRun =
  | { kind: 'text'; at: [number, number]; text: string }
  | { kind: 'thing'; at: number }

function sectionToMarkdown(s: SectionData): string {
  const heading = s.h ? `## ${s.h}` : ''
  return [heading, s.p].filter((part) => part !== '').join('\n\n')
}

function runToMarkdown(sections: SectionData[]): string {
  return sections.map(sectionToMarkdown).join('\n\n')
}

const HEADING = /^##\s+(.*)$/

/**
 * Markdown quay về section.
 *
 * Mỗi `## ` mở một phần mới; chữ trước cái `## ` đầu tiên thành một phần không
 * tiêu đề, vì viết vài dòng dẫn trước khi đặt đề mục là chuyện bình thường.
 */
function markdownToRun(markdown: string): SectionData[] {
  const out: SectionData[] = []
  let current: SectionData | null = null
  for (const line of markdown.split('\n')) {
    const heading = HEADING.exec(line)
    if (heading) {
      current = { h: heading[1], p: '' }
      out.push(current)
      continue
    }
    if (line.trim() === '') continue
    if (!current) {
      current = { h: '', p: line }
      out.push(current)
      continue
    }
    current.p = current.p ? `${current.p}\n${line}` : line
  }
  return out
}

export function toSectionRuns(sections: SectionData[]): SectionRun[] {
  if (sections.length === 0) return [{ kind: 'text', at: [0, -1], text: '' }]
  const out: SectionRun[] = []
  let i = 0
  while (i < sections.length) {
    if (!flowsSection(sections[i])) {
      out.push({ kind: 'thing', at: i })
      i += 1
      continue
    }
    const start = i
    while (i < sections.length && flowsSection(sections[i])) i += 1
    out.push({ kind: 'text', at: [start, i - 1], text: runToMarkdown(sections.slice(start, i)) })
  }
  return out
}

export function writeSectionRun(
  sections: SectionData[],
  at: [number, number],
  markdown: string,
): SectionData[] {
  return [...sections.slice(0, at[0]), ...markdownToRun(markdown), ...sections.slice(at[1] + 1)]
}

/**
 * Chèn một thứ vào giữa một dải, ngay sau khối con trỏ đang đứng.
 *
 * Đây là chỗ lỗi nặng nhất của phép cộng chỉ số cũ: một `section` vẽ ra **hai**
 * khối trên mặt soạn (`## tiêu đề` rồi đoạn văn), nên con trỏ ở khối thứ ba
 * của một dải hai phần cho ra chỉ số 4 — rơi ra ngoài dải, xuống tận cuối bài.
 * Chủ site: *"nó không thêm vào vị trí con trỏ edit mà lại thêm ở tít các vị
 * trí nào bên dưới"*.
 */
export function insertSectionThing(
  sections: SectionData[],
  at: [number, number],
  text: string,
  /** Số dòng có chữ của dải đứng trên chỗ chèn — xem `linesThrough`. */
  lines: number,
  thing: SectionData,
): SectionData[] {
  const [before, after] = splitAtLine(text, lines)
  return [
    ...sections.slice(0, at[0]),
    ...markdownToRun(before),
    thing,
    ...markdownToRun(after),
    ...sections.slice(at[1] + 1),
  ]
}

export function runAtSection(runs: SectionRun[], i: number): SectionRun | undefined {
  return runs.find((r) => (r.kind === 'text' ? i >= r.at[0] && i <= r.at[1] : r.at === i))
}
