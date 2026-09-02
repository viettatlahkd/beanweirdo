/**
 * A run of items, numbered or not.
 *
 * Three templates were each carrying their own version of this and none could
 * see the others: memo's bullets (`items`) and its numbered pour phases
 * (`phases`), long-form's `li` with its three levels, and the lines inside a
 * card's callout. Same thing four times.
 *
 * It is one element, with the shape WordPress settled on for `core/list` —
 * ordered or not, nestable — plus the one thing this journal's design needs and
 * theirs does not: quieter lines hanging under an item, which memo and long-form
 * both call `cont` and both draw the same way.
 */
import type { CSSProperties } from 'react'
import { serif } from '../tokens'
import { shade } from '../palette'
import { registerElement, type ElementViewProps } from './registry'
import type { Run } from './runs'

export type ListItem = {
  /**
   * The line itself. Runs rather than a string because a line can carry
   * emphasis mid-sentence, and a plain field must not silently drop it —
   * see `runs.ts`.
   */
  runs: Run[]
  /** Quieter lines under the item — an aside to it, not a new item. */
  sub?: string[]
  children?: ListItem[]
}

export type ListAttrs = {
  type: 'list'
  id?: string
  /** Numbered when true; the numbers are the template's, not typed by anyone. */
  ordered?: boolean
  items: ListItem[]
}

/** Filled, then hollow, then a small square — depth carries the argument. */
function bullet(depth: number): CSSProperties {
  if (depth === 0) return { width: 5, height: 5, borderRadius: '50%', background: '#172124' }
  if (depth === 1) return { width: 5, height: 5, borderRadius: '50%', border: '1px solid #172124' }
  return { width: 4, height: 4, background: '#172124' }
}

/** Three weights of the post's own colour, so the marks differ without borrowing. */
const ordinalShades = (accent: string) => [shade(accent, 30), shade(accent, 44), shade(accent, 58)]

function Row({
  item,
  depth,
  position,
  ordered,
  accent,
  accentInk,
}: {
  item: ListItem
  depth: number
  position: number
  ordered: boolean
  accent: string
  accentInk: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div
        style={{
          display: 'grid',
          // Numbers need a wider gutter than a dot, and a nested row needs less
          // than an outer one — the same measurements the memo has always used.
          gridTemplateColumns: ordered ? '34px minmax(0,1fr)' : depth >= 2 ? '14px minmax(0,1fr)' : '18px minmax(0,1fr)',
          gap: ordered ? 14 : 12,
        }}
      >
        {ordered ? (
          <div
            style={{
              fontFamily: serif,
              fontSize: 26,
              lineHeight: 1,
              color: ordinalShades(accent)[position % 3],
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {position + 1}
          </div>
        ) : (
          <div style={{ ...bullet(depth), margin: depth === 2 ? '10px 0 0 5px' : '9px 0 0 6px' }} />
        )}
        <div style={{ fontSize: depth === 0 ? 15.5 : 15, lineHeight: 1.62 }}>
          <div>
            {item.runs.map((r, i) =>
              r.em ? (
                <em key={i} style={{ fontWeight: 600, fontStyle: 'italic', color: accentInk }}>
                  {r.t}
                </em>
              ) : (
                <span key={i}>{r.t}</span>
              ),
            )}
          </div>
          {item.sub?.map((line, i) => (
            <div key={i} style={{ color: '#4B4A40', fontSize: 14.5, lineHeight: 1.66 }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {item.children && item.children.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            paddingLeft: 30,
            ...(depth >= 1 ? { borderLeft: '1px solid #E3E3DB', marginLeft: 8 } : null),
          }}
        >
          {item.children.map((c, i) => (
            <Row key={i} item={c} depth={depth + 1} position={i} ordered={false} accent={accent} accentInk={accentInk} />
          ))}
        </div>
      )}
    </div>
  )
}

export const list = registerElement<ListAttrs>({
  name: 'list',
  title: 'Danh sách',
  category: 'text',
  description: 'Một chuỗi mục, có đánh số hoặc không, lồng được ba tầng.',
  keywords: ['danh sách', 'gạch đầu dòng', 'list', 'bullet', 'mốc', 'các bước', 'đánh số'],
  attributes: {
    ordered: { type: 'boolean', note: 'true thì đánh số; vắng nghĩa là gạch đầu dòng', optional: true },
    items: { type: 'array', note: '[{ runs[], sub?[], children?[] }] — children lồng tối đa ba tầng' },
  },
  blank: () => ({ type: 'list', ordered: false, items: [{ runs: [{ t: '' }] }] }),
  View: ({ attributes, palette, testId }: ElementViewProps<ListAttrs>) => (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: 11, margin: '0 0 20px' }}>
      {attributes.items.map((item, i) => (
        <Row
          key={i}
          item={item}
          depth={0}
          position={i}
          ordered={Boolean(attributes.ordered)}
          accent={palette.accent}
          accentInk={palette.mid}
        />
      ))}
    </div>
  ),
})
