import { Fragment, type ReactNode } from 'react'
import {
  EXPLORATIONS_LABEL,
  fieldNotesLabel,
  hasNotes,
  liveExplorations,
  notesOn,
  segmentsFor,
  type FieldNote,
} from './notes'
import { paletteFrom, type Palette } from './palette'
import { ink, paper, sans, serif } from './tokens'
import type { ReportBlock, ReportMetric, ReportPostData, ReportTable } from './types'

export type ReportOverrides = {
  renderTitle?: (title: string) => ReactNode
  renderBlurb?: (blurb: string) => ReactNode
  renderMeta?: (text: string, blockIndex: number) => ReactNode
  renderHeading?: (text: string, blockIndex: number) => ReactNode
  renderParagraph?: (text: string, blockIndex: number) => ReactNode
  renderMetric?: (metric: ReportMetric, blockIndex: number, metricIndex: number) => ReactNode
  renderTableCell?: (text: string, blockIndex: number, rowIndex: number, colIndex: number) => ReactNode
  renderImageCaption?: (caption: string, blockIndex: number) => ReactNode
}

export type ReportProps = ReportOverrides & {
  /**
   * The trail back to where this post is filed. Supplied by the app, so the
   * renderer package stays independent of how routing works.
   */
  breadcrumb?: ReactNode
  post: ReportPostData
}

/** Only a template with no module behind it — the standalone sample — uses this. */
const REPORT_BLUE = '#6FA8C0'

const HEADING: Record<1 | 2 | 3, { size: number; top: number; accented: boolean }> = {
  1: { size: 34, top: 40, accented: false },
  2: { size: 26, top: 20, accented: false },
  3: { size: 20, top: 20, accented: true },
}

/**
 * The "report" template — a block-based document: meta / heading / paragraph
 * / metrics / chart / table / image blocks rendered in sequence. Modeled on
 * the "isReport" section of the design source. This is the read-only render
 * of a report's blocks — the admin app's insert-menu / contentEditable
 * editing chrome is not part of this shared package.
 */
export function Report({ post, breadcrumb, ...overrides }: ReportProps) {
  const palette = paletteFrom(post.band?.bg ?? REPORT_BLUE, post.band?.fg)
  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: palette.accent, color: palette.onAccent, padding: '44px 56px 40px' }}>
        {breadcrumb}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 44,
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: 70,
              lineHeight: 0.9,
              letterSpacing: '-.04em',
              margin: 0,
            }}
          >
            {overrides.renderTitle ? overrides.renderTitle(post.title) : post.title}
          </h1>
          {post.blurb && (
            <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 13, lineHeight: 1.5, maxWidth: 330, opacity: 0.85 }}>
              {overrides.renderBlurb ? overrides.renderBlurb(post.blurb) : post.blurb}
            </div>
          )}
        </div>
      </div>

      <ReportBody post={post} palette={palette} overrides={overrides} />
    </div>
  )
}

/**
 * The blocks, and — when anything is written — the notes column beside them.
 *
 * Both shapes are one grid, never a grid for one and a plain flow for the
 * other. Grid items do not collapse their margins, so a flow fallback would
 * quietly print a report with notes at different spacing from a report
 * without: the same template, two rhythms, for no reason a reader could see.
 *
 * A field note sits in the same grid row as the block it holds on to, which is
 * what makes it peer to peer without measuring anything at runtime. The row
 * grows to whichever side is taller, so a long note pushes its own block's
 * row open rather than sliding out of line with it.
 */
function ReportBody({ post, palette, overrides }: { post: ReportPostData; palette: Palette; overrides: ReportOverrides }) {
  const notes = post.notes
  const withNotes = hasNotes(notes)
  const explorations = liveExplorations(notes)
  const rail = palette.accent
  const segments = segmentsFor(post.blocks, notes)
  // The column is named once, at the top of it. Repeating the name over every
  // note turns a quiet margin into a stack of shouting labels.
  const firstAnnotated = segments.findIndex((seg) => seg.anchor)

  return (
    <div
      style={{
        padding: '44px 56px 96px',
        maxWidth: 1320,
        display: 'grid',
        gridTemplateColumns: withNotes ? 'minmax(0,1fr) minmax(200px,260px)' : 'minmax(0,1fr)',
        columnGap: 40,
      }}
    >
      {segments.map((seg, si) => {
        const hanging = withNotes ? notesOn(notes, seg.anchor) : []
        const opensTheColumn = withNotes && si === 0 && explorations.length > 0
        return (
          <Fragment key={seg.start}>
            <div style={{ gridColumn: 1, gridRow: si + 1, minWidth: 0 }}>
              {post.blocks.slice(seg.start, seg.end).map((block, bi) => (
                <ReportBlockView key={seg.start + bi} block={block} index={seg.start + bi} palette={palette} overrides={overrides} />
              ))}
            </div>
            {(hanging.length > 0 || opensTheColumn) && (
              <div style={{ gridColumn: 2, gridRow: si + 1, minWidth: 0 }}>
                {opensTheColumn && <Explorations items={explorations} rail={rail} />}
                <FieldNotes items={hanging} rail={rail} template={post.template} named={si === firstAnnotated} />
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

/** The consecutive run — one heading, then bullets, read top-down. */
function Explorations({ items, rail }: { items: { id: string; text: string }[]; rail: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <NotesHeading text={EXPLORATIONS_LABEL} rail={rail} />
      {items.map((e) => (
        <div
          key={e.id}
          style={{
            fontFamily: sans,
            fontWeight: 300,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: ink.strong,
            borderLeft: `2px solid ${rail}`,
            padding: '1px 0 1px 11px',
            marginBottom: 12,
          }}
        >
          {e.text}
        </div>
      ))}
    </div>
  )
}

/** The comments — each already sitting in its block's own row, so no label repeats. */
function FieldNotes({
  items,
  rail,
  template,
  named,
}: {
  items: FieldNote[]
  rail: string
  template?: string
  named: boolean
}) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 20 }}>
      {named && <NotesHeading text={fieldNotesLabel(template)} rail={rail} />}
      {items.map((n) => (
        <div
          key={n.id}
          style={{
            fontFamily: sans,
            fontWeight: 300,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: ink.strong,
            borderLeft: `2px solid ${rail}`,
            padding: '1px 0 1px 11px',
            marginBottom: 10,
          }}
        >
          {n.text}
        </div>
      ))}
    </div>
  )
}

/**
 * A column's share of the table.
 *
 * A table written before widths existed has none, and the writer of one that
 * does may have added a column since — so a stored list that no longer matches
 * the columns is ignored rather than stretched to fit, which would move every
 * boundary the writer had set.
 */
function columnWidth(table: ReportTable, index: number): string {
  const w = table.widths
  if (!w || w.length !== table.columns.length) return `${100 / Math.max(table.columns.length, 1)}%`
  return `${w[index]}%`
}

function NotesHeading({ text, rail }: { text: string; rail: string }) {
  return (
    <div
      style={{
        fontFamily: sans,
        fontWeight: 500,
        fontSize: 9.5,
        letterSpacing: '.16em',
        textTransform: 'uppercase',
        color: rail,
        marginBottom: 10,
      }}
    >
      {text}
    </div>
  )
}

function ReportBlockView({
  block,
  index,
  palette,
  overrides,
}: {
  block: ReportBlock
  index: number
  palette: Palette
  overrides: ReportOverrides
}) {
  switch (block.type) {
    case 'meta':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8A8A7C', margin: '0 0 20px' }}
        >
          {overrides.renderMeta ? overrides.renderMeta(block.text, index) : block.text}
        </div>
      )

    case 'heading': {
      // Three sizes, one family. The smallest wears the accent so a level is
      // legible at a glance instead of resting on a few points of type size.
      const step = HEADING[block.level ?? 1]
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{
            fontFamily: serif,
            fontSize: step.size,
            lineHeight: 1.08,
            letterSpacing: '-.03em',
            color: step.accented ? palette.ink : '#172124',
            margin: `${step.top}px 0 20px`,
          }}
        >
          {overrides.renderHeading ? overrides.renderHeading(block.text, index) : block.text}
        </div>
      )
    }

    case 'callout':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{ background: palette.tint, borderLeft: `2px solid ${palette.accent}`, padding: 20, margin: '0 0 20px', maxWidth: 660 }}
        >
          {block.heading && (
            <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.ink, marginBottom: 8 }}>
              {block.heading}
            </div>
          )}
          <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 14.5, lineHeight: 1.55, color: ink.strong }}>{block.text}</div>
        </div>
      )

    case 'quote':
      return (
        <div data-testid={`report-block-${index}`} style={{ margin: '20px 0', maxWidth: 660, position: 'relative', paddingLeft: 40 }}>
          {/* The mark belongs to the template — nobody should have to type it. */}
          <span aria-hidden style={{ position: 'absolute', left: 0, top: -8, fontFamily: serif, fontSize: 52, lineHeight: 1, color: palette.edge }}>
            “
          </span>
          <div style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.35, color: '#172124' }}>{block.text}</div>
          {block.attribution && (
            <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: palette.ink, marginTop: 8 }}>
              {block.attribution}
            </div>
          )}
        </div>
      )

    case 'paragraph':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{ fontFamily: sans, fontWeight: 300, fontSize: 15.5, lineHeight: 1.55, color: ink.strong, margin: '0 0 20px', maxWidth: 660 }}
        >
          {overrides.renderParagraph ? overrides.renderParagraph(block.text, index) : block.text}
        </div>
      )

    case 'metrics':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))', gap: 1, background: '#E6E2D2', margin: '0 0 20px' }}
        >
          {block.items.map((m, mi) => (
            <div key={mi} style={{ background: '#FFFFFF', padding: '13px 14px 14px' }}>
              <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8A8A7C', marginBottom: 7 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: serif, fontSize: 26, lineHeight: 1, letterSpacing: '-.02em', color: '#172124', fontVariantNumeric: 'tabular-nums' }}>
                {overrides.renderMetric ? overrides.renderMetric(m, index, mi) : m.value}
              </div>
            </div>
          ))}
        </div>
      )

    case 'chart':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{ margin: '0 0 20px', borderLeft: '1px solid #DDD9C8', borderBottom: '1px solid #DDD9C8', padding: '0 0 0 8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 168 }}>
            {block.points.map((p, pi) => (
              <div key={pi} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ height: `${p.heightPct}%`, background: palette.accent }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
            {block.points.map((p, pi) => (
              <div
                key={pi}
                style={{ flex: 1, textAlign: 'center', fontFamily: sans, fontSize: 9.5, color: '#8A8A7C', fontVariantNumeric: 'tabular-nums' }}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>
      )

    case 'table':
      return (
        <div data-testid={`report-block-${index}`} style={{ margin: '0 0 20px', overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontFamily: sans }}>
            <colgroup>
              {block.table.columns.map((_, ci) => (
                <col key={ci} style={{ width: columnWidth(block.table, ci) }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {block.table.columns.map((h, hi) => (
                  <th key={hi} style={{ textAlign: 'left', padding: 0, borderBottom: `1px solid ${ink.base}` }}>
                    <div style={{ padding: '0 10px 8px', fontWeight: 500, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.ink }}>
                      {h}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} style={{ padding: 0, borderBottom: `1px solid ${paper.rule}`, verticalAlign: 'top' }}>
                      <div
                        style={{
                          fontWeight: 300,
                          fontSize: 14,
                          lineHeight: 1.45,
                          color: ink.strong,
                          padding: 10,
                          overflowWrap: 'break-word',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {overrides.renderTableCell ? overrides.renderTableCell(cell, index, ri, ci) : cell}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'image':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{
            height: 250,
            background: palette.tint,
            display: 'flex',
            alignItems: 'flex-end',
            padding: 20,
            margin: '0 0 20px',
            backgroundImage: block.imageUrl ? `url(${block.imageUrl})` : undefined,
            backgroundSize: 'cover',
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 10, color: palette.ink }}>
            {overrides.renderImageCaption ? overrides.renderImageCaption(block.caption, index) : block.caption}
          </div>
        </div>
      )
  }
}
