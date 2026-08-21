import type { ReactNode } from 'react'
import { ink, paper, sans, serif } from './tokens'
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

const REPORT_BLUE = '#6FA8C0'

/**
 * The "report" template — a block-based document: meta / heading / paragraph
 * / metrics / chart / table / image blocks rendered in sequence. Modeled on
 * the "isReport" section of the design source. This is the read-only render
 * of a report's blocks — the admin app's insert-menu / contentEditable
 * editing chrome is not part of this shared package.
 */
export function Report({ post, breadcrumb, ...overrides }: ReportProps) {
  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: post.band?.bg ?? REPORT_BLUE, color: post.band?.fg ?? '#0E2C38', padding: '40px 56px 34px' }}>
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

      <div style={{ padding: '34px 56px 140px', maxWidth: 1320 }}>
        {post.blocks.map((block, i) => (
          <ReportBlockView key={i} block={block} index={i} overrides={overrides} />
        ))}
      </div>
    </div>
  )
}

function ReportBlockView({ block, index, overrides }: { block: ReportBlock; index: number; overrides: ReportOverrides }) {
  switch (block.type) {
    case 'meta':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8A8A7C', margin: '0 0 18px' }}
        >
          {overrides.renderMeta ? overrides.renderMeta(block.text, index) : block.text}
        </div>
      )

    case 'heading':
      return (
        <div
          data-testid={`report-block-${index}`}
          style={{ fontFamily: serif, fontSize: 34, lineHeight: 1.08, letterSpacing: '-.03em', color: '#172124', margin: '26px 0 14px' }}
        >
          {overrides.renderHeading ? overrides.renderHeading(block.text, index) : block.text}
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
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))', gap: 1, background: '#E6E2D2', margin: '0 0 24px' }}
        >
          {block.items.map((m, mi) => (
            <div key={mi} style={{ background: '#FFFFFF', padding: '13px 14px 14px' }}>
              <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8A8A7C', marginBottom: 7 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: serif, fontSize: 26, lineHeight: 1, letterSpacing: '-.02em', color: '#172124' }}>
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
          style={{ margin: '0 0 26px', borderLeft: '1px solid #DDD9C8', borderBottom: '1px solid #DDD9C8', padding: '0 0 0 12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 168 }}>
            {block.points.map((p, pi) => (
              <div key={pi} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ height: `${p.heightPct}%`, background: REPORT_BLUE }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
            {block.points.map((p, pi) => (
              <div key={pi} style={{ flex: 1, textAlign: 'center', fontFamily: sans, fontSize: 9.5, color: '#8A8A7C' }}>
                {p.label}
              </div>
            ))}
          </div>
        </div>
      )

    case 'table':
      return (
        <div data-testid={`report-block-${index}`} style={{ margin: '0 0 26px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontFamily: sans }}>
            <thead>
              <tr>
                {block.table.columns.map((h, hi) => (
                  <th key={hi} style={{ textAlign: 'left', padding: 0, borderBottom: `1px solid ${ink.base}` }}>
                    <div style={{ padding: '0 10px 8px', fontWeight: 500, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: REPORT_BLUE }}>
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
                      <div style={{ fontWeight: 300, fontSize: 14, lineHeight: 1.45, color: ink.strong, padding: 10, overflowWrap: 'break-word' }}>
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
            background: '#E9F1F4',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 14,
            margin: '0 0 26px',
            backgroundImage: block.imageUrl ? `url(${block.imageUrl})` : undefined,
            backgroundSize: 'cover',
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 10, color: '#4B6873' }}>
            {overrides.renderImageCaption ? overrides.renderImageCaption(block.caption, index) : block.caption}
          </div>
        </div>
      )
  }
}
