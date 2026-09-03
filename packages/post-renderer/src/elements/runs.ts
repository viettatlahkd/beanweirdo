/**
 * Emphasis inside a line, and how it survives a plain text field.
 *
 * Memo marks judgements with an emphasised span mid-sentence — the design's
 * one piece of inline formatting. Flattening a line to a plain string to edit
 * it would drop that, and drop it silently: the writer would open a post, tidy
 * one word, and lose the emphasis on the rest of the line with nothing on
 * screen to say so.
 *
 * So a line is runs, and a plain field shows them as `chữ *được nhấn* chữ`.
 * Round-tripping is lossless, which is what lets an ordinary textarea edit a
 * formatted line honestly. A real editor can replace the field later without
 * the stored format changing at all.
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
}

/** Runs as one line: `*nhấn*` for emphasis, `_gạch chân_ for a reading. */
export function runsToText(runs: Run[] | undefined): string {
  return (runs ?? [])
    .map((r) => {
      let t = r.t
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
  const marked = (part: string): Run | null => {
    let t = part
    let em = false
    let u = false
    if (t.length > 2 && t.startsWith('*') && t.endsWith('*')) {
      em = true
      t = t.slice(1, -1)
    }
    if (t.length > 2 && t.startsWith('_') && t.endsWith('_')) {
      u = true
      t = t.slice(1, -1)
    }
    if (!em && !u) return null
    return { t, ...(em ? { em: true } : null), ...(u ? { u: true } : null) }
  }

  for (const part of text.split(/(\*[^*]+\*|_[^_]+_)/g)) {
    if (!part) continue
    const run = marked(part)
    if (run) {
      out.push(run)
      continue
    }
    // Plain text joins whatever plain text came before it, so a stray marker
    // stays one character in a sentence rather than splitting the line.
    const last = out[out.length - 1]
    if (last && !last.em && !last.u) out[out.length - 1] = { t: last.t + part }
    else out.push({ t: part })
  }
  return out.length > 0 ? out : [{ t: '' }]
}
