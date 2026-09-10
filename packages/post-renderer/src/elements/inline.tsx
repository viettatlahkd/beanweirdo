/**
 * Drawing a line of runs, in one place.
 *
 * List rows carried the only copy of this, so a paragraph could hold an
 * emphasis or an address and draw neither — the words came out flat with
 * nothing on screen to say a mark had been dropped. The same three marks now
 * draw the same way wherever a line appears.
 *
 * Elements that store a plain string rather than runs go through `Inline`,
 * which parses on the way to the screen. Nothing about how they are stored
 * changes: the notation *is* the storage, the way it already was for memo.
 */
import type { ReactNode } from 'react'
import { textToRuns, type Run } from './runs'

/**
 * Three marks, three signals, deliberately unalike.
 *
 * Emphasis changes slant and colour; a reading changes neither and takes a
 * grey hairline; an address takes the post's colour and a hairline of its own.
 * Two of them being underlines is only safe because the colours differ — an
 * address looks like somewhere to go, a reading looks like a number.
 */
function mark(run: Run, key: number, accentInk: string): ReactNode {
  const inner = run.em ? (
    <em style={{ fontWeight: 600, fontStyle: 'italic', color: accentInk }}>{run.t}</em>
  ) : run.u ? (
    <span style={{ borderBottom: '1px solid #CFCFC4' }}>{run.t}</span>
  ) : (
    run.t
  )

  if (run.href) {
    return (
      <a
        key={key}
        href={run.href}
        // A post links out to roasters and papers; those open beside the post
        // rather than taking the reader's place in it.
        target="_blank"
        rel="noreferrer noopener"
        style={{ color: accentInk, textDecoration: 'none', borderBottom: `1px solid ${accentInk}` }}
      >
        {inner}
      </a>
    )
  }
  return <span key={key}>{inner}</span>
}

/** A line already stored as runs. */
export function Runs({ runs, accentInk }: { runs: Run[] | undefined; accentInk: string }) {
  return <>{(runs ?? []).map((r, i) => mark(r, i, accentInk))}</>
}

/** A line stored as a plain string, read in the same notation. */
export function Inline({ text, accentInk }: { text: string; accentInk: string }) {
  return <Runs runs={textToRuns(text)} accentInk={accentInk} />
}
