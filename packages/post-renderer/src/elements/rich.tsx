/**
 * Words inside a box — a callout's body, a table cell — that may carry their
 * own headings, bullets and numbers.
 *
 * Those fields were one plain string drawn as one run of words, so a list typed
 * into a callout or a cell came out as lines starting with "1." (owner,
 * 2026-10-17: they should take the same formats as the text around them). The
 * string stays the store; it is read as the site's markdown here, and drawn
 * small, in the box's own type size, rather than as full-size elements.
 *
 * Text with no block marks draws as it did before, through `Inline`, its line
 * breaks now kept.
 */
import type { CSSProperties } from 'react'
import { Inline } from './inline'
import type { ListItem } from './list'
import { markdownToBlocks } from './paste'
import { EMPTY_LINE, runsToText } from './runs'

/** A line opening a heading, a bullet or a number. */
const MARKED = /^\s*(#{1,6}\s|[-*+•]\s|\d{1,3}[.)]\s)/m

export function RichText({ text, accentInk }: { text: string; accentInk: string }) {
  // Blocks are set apart by a blank line; within one, a line break stays a line break.
  const chunks = text.split(/\n[ \t]*\n/)
  if (chunks.length === 1 && !MARKED.test(text) && !text.includes(EMPTY_LINE)) return <Words text={text} accentInk={accentInk} />
  return (
    <>
      {chunks.map((chunk, i) => {
        const gap: CSSProperties = { margin: i === chunks.length - 1 ? 0 : '0 0 6px' }
        if (chunk.trim() === EMPTY_LINE || chunk.trim() === '') return <div key={i} style={gap}><br /></div>
        // Plain words draw as they always did — `markdownToBlocks` would join their lines.
        if (!MARKED.test(chunk)) return <div key={i} style={gap}><Words text={chunk} accentInk={accentInk} /></div>
        return <div key={i} style={gap}>{markdownToBlocks(chunk).map((b, j) => <Block key={j} block={b} accentInk={accentInk} />)}</div>
      })}
    </>
  )
}

/**
 * Plain words, their line breaks kept: the editor shows a Shift+Enter as a new
 * line, and the page used to run the two lines together.
 */
function Words({ text, accentInk }: { text: string; accentInk: string }) {
  return (
    <span style={{ whiteSpace: 'pre-line' }}>
      <Inline text={text} accentInk={accentInk} />
    </span>
  )
}

function Block({ block: b, accentInk }: { block: ReturnType<typeof markdownToBlocks>[number]; accentInk: string }) {
  if (b.type === 'heading') {
    const level = Number(b.level ?? 1)
    return (
      <div style={{ fontWeight: 500, fontSize: level === 1 ? '1.25em' : level === 2 ? '1.12em' : '1em', lineHeight: 1.3 }}>
        <Inline text={String(b.text ?? '')} accentInk={accentInk} />
      </div>
    )
  }
  if (b.type === 'list') return <Items items={(b.items as ListItem[]) ?? []} ordered={Boolean(b.ordered)} accentInk={accentInk} />
  return <div><Inline text={String(b.text ?? '')} accentInk={accentInk} /></div>
}

function Items({ items, ordered, accentInk }: { items: ListItem[]; ordered: boolean; accentInk: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'grid', gridTemplateColumns: `${ordered ? 20 : 14}px minmax(0,1fr)`, gap: 4 }}>
            <span style={{ color: accentInk, fontVariantNumeric: 'tabular-nums' }}>{ordered ? `${i + 1}.` : '•'}</span>
            <span style={{ whiteSpace: 'pre-line' }}>
              <Inline text={runsToText(item.runs)} accentInk={accentInk} />
            </span>
          </div>
          {item.children && item.children.length > 0 && (
            <div style={{ paddingLeft: ordered ? 24 : 18, marginTop: 3 }}>
              <Items items={item.children} ordered={false} accentInk={accentInk} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
