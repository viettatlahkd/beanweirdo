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
import { getElement } from './elements'
import { paletteFrom, type Palette } from './palette'
import { ink, paper, sans, serif, wrapTitle } from './tokens'
import type { ReportBlock, ReportMetric, ReportPostData } from './types'

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
          lang="en"
            style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: 70,
              lineHeight: 0.9,
              letterSpacing: '-.04em',
              margin: 0,
              ...wrapTitle,
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

/**
 * Draws one block by looking it up in the store.
 *
 * This used to be a switch with nine cases of hand-written markup, reachable
 * only from a report. The markup moved into the store unchanged; what is left
 * here is the lookup — so a template is a layout over elements rather than a
 * shape of its own, and an element added to the store draws in every template
 * that asks for it.
 */
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
  const element = getElement(block.type)
  // A body may name an element this build does not have — a post written on a
  // newer deploy, or one hand-edited. Draw nothing rather than an empty row:
  // an empty row says "write here", which is a lie about content that exists.
  if (!element) return null
  return (
    <element.View
      attributes={block}
      palette={palette}
      index={index}
      testId={`report-block-${index}`}
      render={overrides}
    />
  )
}
