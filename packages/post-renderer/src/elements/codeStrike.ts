/**
 * `code` and ~~gạch ngang~~, read around the star marks rather than through them.
 *
 * Stars are read first (`parseStars`) so they can nest, which is exactly what
 * would wreck a code span: `a*b*c` inside backticks must stay those characters.
 * So a code span leaves the text as one placeholder character before the stars
 * are read, and comes back after. A strike pair leaves two marker characters
 * instead, so whatever sits between them — bold, a link — is still read, and
 * `~~**x**~~` (how Lexical nests the two) strikes a bold word.
 *
 * The placeholders are private-use characters: nothing a writer types, and
 * nothing any of the other parsers treats as a mark.
 */

const CODE_BASE = 0xe000
const OPEN = ''
const CLOSE = ''

type Protected = { text: string; codes: string[] }

export function protect(text: string): Protected {
  const codes: string[] = []
  const t = text
    .replace(/`([^`\n]+)`/g, (_, c: string) => {
      codes.push(c)
      return String.fromCharCode(CODE_BASE + codes.length - 1)
    })
    .replace(/~~(?=\S)([^\n]*?\S)~~/g, (_, c: string) => OPEN + c + CLOSE)
  return { text: t, codes }
}

/** How the two marks draw, shared by every template that draws runs. */
const CODE_STYLE = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  fontSize: '.88em',
  background: 'rgba(0,0,0,.06)',
  borderRadius: 3,
  padding: '1px 4px',
} as const

export const markStyle = (r: Marked) => ({
  ...(r.code ? CODE_STYLE : null),
  ...(r.del ? { textDecoration: 'line-through' } : null),
})

type Marked = { t: string; code?: boolean; del?: boolean }

/** Splits runs back out at the placeholders `protect` left. */
export function restore<R extends Marked>(runs: R[], codes: string[]): R[] {
  const out: R[] = []
  let del = false
  for (const r of runs) {
    let buf = ''
    const flush = () => {
      if (buf) out.push({ ...r, t: buf, ...(del ? { del: true } : null) })
      buf = ''
    }
    for (const ch of r.t) {
      const k = ch.charCodeAt(0) - CODE_BASE
      if (ch === OPEN || ch === CLOSE) {
        flush()
        del = ch === OPEN
      } else if (k >= 0 && k < codes.length) {
        flush()
        out.push({ ...r, t: codes[k], code: true, ...(del ? { del: true } : null) })
      } else buf += ch
    }
    flush()
  }
  return out
}

/** The words of a run with its code and strike marks written back on. */
export function markText(r: Marked, t = r.t): string {
  const code = r.code ? `\`${t}\`` : t
  return r.del ? `~~${code}~~` : code
}
