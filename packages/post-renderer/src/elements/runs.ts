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

export type Run = {
  t: string
  /** The design's emphasis: italic, and in the post's own colour. */
  em?: boolean
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
  /(\[[^\]\n]*\]\(\s*[^()\s]+\s*\)|https?:\/\/[^\s<>[\]()]+|\*\*[^*\n]+\*\*|__[^_\n]+__|(?<![\p{L}\p{N}])\*[^*\n]+\*(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])_[^_\n]+_(?![\p{L}\p{N}]))/gu

/** A bare address at the end of a sentence should not swallow the full stop. */
const TRAILING = /[.,;:!?)]+$/

/** Runs as one line, in the same notation `textToRuns` reads. */
export function runsToText(runs: Run[] | undefined): string {
  return (runs ?? [])
    .map((r) => {
      let t = r.t
      if (r.href) t = r.href === r.t ? t : `[${t}](${r.href})`
      if (r.u) t = `_${t}_`
      if (r.em) t = `*${t}*`
      return t
    })
    .join('')
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
  /** Plain text joins the plain run before it, so a stray marker stays one
   * character in a sentence rather than splitting the line. */
  const pushPlain = (t: string) => {
    if (!t) return
    const last = out[out.length - 1]
    if (last && !last.em && !last.u && !last.href) out[out.length - 1] = { t: last.t + t }
    else out.push({ t })
  }

  const marked = (part: string): boolean => {
    const link = /^\[([^\]\n]*)\]\(\s*([^()\s]+)\s*\)$/.exec(part)
    if (link) {
      push({ t: link[1], href: link[2] })
      return true
    }
    if (/^https?:\/\//.test(part)) {
      // The address keeps its own punctuation; the sentence keeps the rest.
      const tail = TRAILING.exec(part)?.[0] ?? ''
      const url = tail ? part.slice(0, -tail.length) : part
      push({ t: url, href: url })
      pushPlain(tail)
      return true
    }
    let t = part
    let em = false
    let u = false
    // Everywhere else writes bold as `**`; this design has one emphasis, so
    // both notations land on it rather than one of them arriving as asterisks
    // the reader can see.
    if (t.length > 4 && t.startsWith('**') && t.endsWith('**')) {
      em = true
      t = t.slice(2, -2)
    } else if (t.length > 4 && t.startsWith('__') && t.endsWith('__')) {
      em = true
      t = t.slice(2, -2)
    }
    if (!em && t.length > 2 && t.startsWith('*') && t.endsWith('*')) {
      em = true
      t = t.slice(1, -1)
    }
    if (t.length > 2 && t.startsWith('_') && t.endsWith('_')) {
      u = true
      t = t.slice(1, -1)
    }
    if (!em && !u) return false
    push({ t, ...(em ? { em: true } : null), ...(u ? { u: true } : null) })
    return true
  }

  for (const part of text.split(MARKED)) {
    if (!part) continue
    if (!marked(part)) pushPlain(part)
  }
  return out.length > 0 ? out : [{ t: '' }]
}
