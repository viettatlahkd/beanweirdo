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
}

/** Runs as one line of text, emphasis marked with asterisks. */
export function runsToText(runs: Run[] | undefined): string {
  return (runs ?? []).map((r) => (r.em ? `*${r.t}*` : r.t)).join('')
}

/**
 * A line of text back into runs.
 *
 * An unclosed asterisk is left as a plain character rather than swallowing the
 * rest of the line — half-typed emphasis should look like what it is.
 */
export function textToRuns(text: string): Run[] {
  const out: Run[] = []
  const parts = text.split(/(\*[^*]+\*)/g)
  for (const part of parts) {
    if (!part) continue
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      out.push({ t: part.slice(1, -1), em: true })
    } else if (out.length > 0 && !out[out.length - 1].em) {
      out[out.length - 1] = { t: out[out.length - 1].t + part }
    } else {
      out.push({ t: part })
    }
  }
  return out.length > 0 ? out : [{ t: '' }]
}
