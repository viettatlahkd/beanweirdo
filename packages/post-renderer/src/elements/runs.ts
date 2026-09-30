/**
 * Emphasis and links inside a line, and how they survive a plain text field.
 *
 * Memo marks judgements with an emphasised span mid-sentence — the design's
 * one piece of inline formatting. Flattening a line to a plain string to edit
 * it would drop that, and drop it silently: the writer would open a post, tidy
 * one word, and lose the emphasis on the rest of the line with nothing on
 * screen to say so.
 *
 * So a line is runs, and a plain field shows them the way Markdown does:
 * `chữ *được nhấn* chữ`, `_số đo_`, `[chữ](địa chỉ)`. Round-tripping is
 * lossless, which is what lets an ordinary textarea edit a formatted line
 * honestly. A real editor can replace the field later without the stored
 * format changing at all.
 *
 * Markdown is the notation on purpose: it is what the writer already types
 * elsewhere, and it is what arrives on the clipboard from everywhere else.
 * One notation for typing and for pasting means there is no import step to
 * forget.
 */
import { parseStars, writeStars } from './stars'

export type Run = {
  t: string
  /**
   * Nghiêng, trong màu của bài. Viết `*x*`.
   *
   * Trước 2026-09-19 đây là **mức nhấn duy nhất** của site và nó vẽ ra vừa
   * đậm vừa nghiêng, nên `*x*` với `**x**` cùng đổ về đây. Chủ site tách đôi:
   * *"ctrl B là in đậm thôi không in nghiêng, ctrl I là in nghiêng không in
   * đậm"*. Nay `em` chỉ còn phần nghiêng; phần đậm là `b`.
   */
  em?: boolean
  /**
   * Đậm, trong màu của bài. Viết `**x**`.
   *
   * `em` và `b` cùng bật thì ra đúng cái mức nhấn cũ, và viết là `***x***` —
   * ký hiệu markdown chuẩn cho cả hai.
   */
  b?: boolean
  /**
   * A reading worth pausing on — a hairline under it, colour untouched.
   * Deliberately not the same signal as emphasis: one says "this matters",
   * the other says "this is a measurement".
   */
  u?: boolean
  /**
   * Where the words point. A bare address is its own text, so it writes back
   * out as itself rather than as `[địa chỉ](địa chỉ)` — otherwise every
   * round-trip through the field would grow the line.
   */
  href?: string
}

/**
 * Markers only bind at a word boundary, the way Markdown has them.
 *
 * Without that, `snake_case_name` reads as an underlined `case`, and every
 * post already holding a file path or an identifier would change appearance
 * the moment this parser started running over it.
 */
const MARKED =
  /(\[[^\]\n]*\]\(\s*[^()\s]+\s*\)|https?:\/\/[^\s<>[\]()]+|\*\*\*[^*\n]+\*\*\*|___[^_\n]+___|\*\*[^*\n]+\*\*|__[^_\n]+__|(?<![\p{L}\p{N}])\*[^*\n]+\*(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])_[^_\n]+_(?![\p{L}\p{N}]))/gu

/**
 * `MARKED` without the asterisks, which `parseStars` reads first so that they
 * can nest — `**đậm *cả hai* đậm**` is what the live editor writes, and a
 * pattern that forbids a star inside a star pair cannot read it.
 */
const UNSTARRED =
  /(\[[^\]\n]*\]\(\s*[^()\s]+\s*\)|https?:\/\/[^\s<>[\]()]+|___[^_\n]+___|__[^_\n]+__|(?<![\p{L}\p{N}])_[^_\n]+_(?![\p{L}\p{N}]))/gu

/** The star marks a stretch of text sits inside, from `parseStars`. */
type Marks = Pick<Run, 'em' | 'b'>

/** A bare address at the end of a sentence should not swallow the full stop. */
const TRAILING = /[.,;:!?)]+$/

/** Runs as one line, in the same notation `textToRuns` reads. */
export function runsToText(runs: Run[] | undefined): string {
  return writeStars(
    (runs ?? []).map((r) => {
      let t = r.t
      if (r.href) t = r.href === r.t ? t : `[${t}](${r.href})`
      if (r.u) t = `_${t}_`
      return { t, b: !!r.b, i: !!r.em }
    }),
  )
}

/**
 * Where a position in the drawn words falls in the text that produced them.
 *
 * A field that draws its markdown has to put the cursor where the writer
 * clicked, and the two strings are not the same length: the markers are in one
 * and not the other. Without this the cursor lands at the end of the line
 * every time, and clicking into the middle of a paragraph — the most ordinary
 * thing anyone does in a text field — stops working.
 *
 * Measured against the text as written, never against a rebuilt copy of it.
 * The same emphasis can be written `*x*` or `**x**`, so a copy rebuilt from
 * runs is a different length than what the writer is looking at, and every
 * position after the first marker comes out short.
 */
export function rawIndexFor(text: string, drawnIndex: number): number {
  let drawn = 0
  let raw = 0
  for (const part of text.split(MARKED)) {
    if (!part) continue
    const words = textToRuns(part)
      .map((r) => r.t)
      .join('')
    if (drawnIndex <= drawn + words.length) {
      // Chỗ chữ bắt đầu trong chính đoạn ấy — `**` là 2, `[` là 1, chữ trần
      // là 0 — đo bằng chữ thật chứ không suy từ loại dấu.
      const prefix = words === '' ? 0 : Math.max(0, part.indexOf(words))
      return raw + prefix + (drawnIndex - drawn)
    }
    drawn += words.length
    raw += part.length
  }
  return text.length
}

/**
 * A line of text back into runs.
 *
 * An unclosed asterisk is left as a plain character rather than swallowing the
 * rest of the line — half-typed emphasis should look like what it is.
 */
export function textToRuns(text: string): Run[] {
  const out: Run[] = []

  const push = (run: Run) => out.push(run)
  /** Plain text joins the run before it when that carries the same marks, so a
   * stray marker stays one character in a sentence rather than splitting it. */
  const pushPlain = (t: string, base: Marks) => {
    if (!t) return
    const last = out[out.length - 1]
    if (last && !last.href && !last.u && !!last.em === !!base.em && !!last.b === !!base.b)
      out[out.length - 1] = { ...last, t: last.t + t }
    else out.push({ t, ...base })
  }

  const marked = (part: string, base: Marks): boolean => {
    const link = /^\[([^\]\n]*)\]\(\s*([^()\s]+)\s*\)$/.exec(part)
    if (link) {
      push({ t: link[1], href: link[2], ...base })
      return true
    }
    if (/^https?:\/\//.test(part)) {
      // The address keeps its own punctuation; the sentence keeps the rest.
      const tail = TRAILING.exec(part)?.[0] ?? ''
      const url = tail ? part.slice(0, -tail.length) : part
      push({ t: url, href: url, ...base })
      pushPlain(tail, base)
      return true
    }
    let t = part
    let em = !!base.em
    let b = !!base.b
    let u = false
    // Gạch dưới: ba là cả hai, hai là đậm (cách viết thứ hai của `**`), một là
    // số đo. Dấu sao đã do `parseStars` đọc trước, và lồng được.
    if (t.length > 6 && t.startsWith('___') && t.endsWith('___')) {
      em = true
      b = true
      t = t.slice(3, -3)
    } else if (t.length > 4 && t.startsWith('__') && t.endsWith('__')) {
      b = true
      t = t.slice(2, -2)
    }
    if (t.length > 2 && t.startsWith('_') && t.endsWith('_')) {
      u = true
      t = t.slice(1, -1)
    }
    if (em === !!base.em && b === !!base.b && !u) return false
    push({
      t,
      ...(em ? { em: true } : null),
      ...(b ? { b: true } : null),
      ...(u ? { u: true } : null),
    })
    return true
  }

  for (const seg of parseStars(text)) {
    const base: Marks = { ...(seg.i ? { em: true } : null), ...(seg.b ? { b: true } : null) }
    for (const part of seg.t.split(UNSTARRED)) {
      if (!part) continue
      if (!marked(part, base)) pushPlain(part, base)
    }
  }
  return out.length > 0 ? out : [{ t: '' }]
}
