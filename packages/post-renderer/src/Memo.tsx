import { getElement } from './elements'
import { sectionElements } from './memoElements'
import { paletteFrom, type Palette } from './palette'
import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { CSSProperties } from 'react'
import { sans, serif } from './tokens'
import type { MemoPostData, MemoSection } from './types'

/**
 * What the admin canvas may swap for an editable field.
 *
 * Memo used to take none, so the editor fell through to Article and edited a
 * memo as though it were one — writing article-shaped sections over the memo's
 * own. Its title, the line under it and each section heading are post fields,
 * so those are the three the canvas can hook.
 */
export type MemoOverrides = {
  renderTitle?: (title: string) => ReactNode
  renderSubtitle?: (subtitle: string) => ReactNode
  renderSectionHeading?: (heading: string, index: number) => ReactNode
  /**
   * Draws what is inside a section. The page reads it out of the store; the
   * admin puts an editor for each element in the same place, so what is being
   * written is where it will be read.
   */
  renderSectionBody?: (section: MemoSection, index: number) => ReactNode
  /**
   * Wraps one section, so the admin can hang its move / copy / delete handles
   * on it. The page passes the section straight through.
   */
  wrapSection?: (section: ReactNode, index: number) => ReactNode
  /** Shown under the last section — where the editor puts "add a section". */
  renderAfterSections?: () => ReactNode
}

export type MemoProps = MemoOverrides & {
  post: MemoPostData
  /**
   * The trail back to where this post is filed. Supplied by the app, so the
   * renderer package stays independent of how routing works.
   */
  breadcrumb?: ReactNode
}

/** Only a memo with no module behind it — the standalone sample — uses this. */
const MEMO_BLUE = '#EAF1F4'

const label: CSSProperties = {
  fontSize: 10,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: '#A2A296',
}

/**
 * Cột đầu của bảng nếm là nhãn ("Liều", "Nhiệt") nên giữ hẹp và cố định;
 * các cột số chia đều phần còn lại.
 */
const tableGrid = (columns: number) =>
  columns > 1 ? `80px repeat(${columns - 1}, minmax(0,1fr))` : 'minmax(0,1fr)'

/** Elements memo lays out its own way; everything else comes from the store. */
const MEMO_VIEWS: Record<string, ((p: { attributes: never; palette: Palette }) => ReactNode) | undefined> = {
  callout: ({ attributes, palette }) => {
    const a = attributes as unknown as { heading?: string; text: string }
    return (
      <div style={{ background: palette.tint, padding: '26px 28px', marginBottom: 26 }}>
        {a.heading && (
          <div style={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.5, color: palette.ink, marginBottom: 10 }}>
            {a.heading}
          </div>
        )}
        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: '#3B3729' }}>
          {a.text.split('\n').map((l, li) => (
            <div key={li}>{l}</div>
          ))}
        </div>
      </div>
    )
  },
  table: ({ attributes, palette }) => {
    const t = (attributes as unknown as { table: { columns: string[]; rows: { cells: string[] }[] } }).table
    return (
      <div style={{ marginTop: 22, maxWidth: 420 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: tableGrid(t.columns.length),
            gap: '0 14px',
            borderBottom: `1px solid ${palette.ink}`,
            paddingBottom: 8,
          }}
        >
          {t.columns.map((h, i) => (
            <div key={i} style={label}>
              {h}
            </div>
          ))}
        </div>
        {t.rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: tableGrid(t.columns.length),
              gap: '0 14px',
              borderBottom: '1px solid #E3E3DB',
              padding: '10px 0',
              fontSize: 15,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {row.cells.map((cell, j) => (
              <div key={j}>{cell}</div>
            ))}
          </div>
        ))}
      </div>
    )
  },
}

function Section({
  palette,
  section,
  renderHeading,
  renderBody,
}: {
  section: MemoSection
  palette: Palette
  renderHeading?: (heading: string) => ReactNode
  renderBody?: () => ReactNode
}) {
  return (
    <div>
      <h2
        style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 32,
          lineHeight: 1.1,
          letterSpacing: '-.02em',
          margin: '0 0 22px',
          color: palette.ink,
        }}
      >
        {renderHeading ? renderHeading(section.h) : section.h}
      </h2>

      {/*
        * The section's contents, out of the store.
        *
        * Two of them keep a view of memo's own: the conclusion box and the
        * tasting table are laid out differently here than a report lays the
        * same element out, and that difference is the template. The store owns
        * the format; the template may own the layout.
        */}
      {renderBody
        ? renderBody()
        : sectionElements(section).map((el, i) => {
            const own = MEMO_VIEWS[el.type]
            if (own) return <div key={i}>{own({ attributes: el as never, palette })}</div>
            const element = getElement(el.type)
            return element ? (
              <element.View key={i} attributes={el} palette={palette} index={i} />
            ) : null
          })}
    </div>
  )
}

/**
 * The "memo" template — one tasting, written up.
 *
 * It opens with the readings that make the session repeatable (bean, water,
 * pour) before any prose, because a tasting note nobody can reproduce is just
 * an opinion. Everything below is an outline where indent carries the argument.
 */
export function Memo({ post, breadcrumb, renderTitle, renderSubtitle, renderSectionHeading, renderSectionBody, wrapSection, renderAfterSections }: MemoProps) {
  // Everything this template tints comes from the one colour the post wears.
  const palette = paletteFrom(post.band?.bg ?? MEMO_BLUE, post.band?.fg)
  return (
    <div style={{ background: '#FCFCFA', color: '#172124', minHeight: '100vh', fontFamily: sans, fontWeight: 300 }}>
      {/* A memo is short and deliberately plain, so it gets the shallow band
          too — enough to say where it is filed, not enough to crowd the note. */}
      <div
        style={{
          background: palette.accent,
          color: palette.onAccent,
          padding: '22px 56px 20px',
        }}
      >
        {breadcrumb}
      </div>
      <div style={{ padding: '40px 56px 0' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 300px',
            gap: 56,
            alignItems: 'end',
            borderBottom: `1px solid ${palette.ink}`,
            paddingBottom: 26,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: serif,
                fontWeight: 400,
                fontSize: 78,
                lineHeight: 0.88,
                letterSpacing: '-.045em',
                margin: 0,
                color: palette.ink,
              }}
            >
              {renderTitle ? renderTitle(post.title) : post.title}
            </h1>
            {(post.subtitle || renderSubtitle) && (
              <div
                style={{
                  fontFamily: serif,
                  fontStyle: 'italic',
                  fontSize: 27,
                  lineHeight: 1.3,
                  color: palette.mid,
                  marginTop: 18,
                }}
              >
                {renderSubtitle ? renderSubtitle(post.subtitle ?? '') : post.subtitle}
              </div>
            )}
          </div>

          {post.specs && post.specs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 6 }}>
              {post.specs.map((s) => (
                <div
                  key={s.k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    borderTop: '1px solid #E3E3DB',
                    paddingTop: 9,
                  }}
                >
                  <div style={label}>{s.k}</div>
                  <div style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {post.img && (
        <div style={{ padding: '30px 56px 0' }}>
          <div style={{ aspectRatio: '21/9', overflow: 'hidden', background: '#EDE8DD' }}>
            <img src={post.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 10, fontSize: 11, color: '#A2A296' }}>
            <div style={{ width: 22, height: 1, background: palette.accent, transform: 'translateY(-4px)' }} />
            <div>{post.imgCaption ?? 'ảnh features'}</div>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,760px)',
          justifyContent: 'start',
          padding: '56px 56px 130px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
          {post.sections.map((s, i) => {
            const section = (
              <Section
                section={s}
                palette={palette}
                renderHeading={renderSectionHeading ? (h) => renderSectionHeading(h, i) : undefined}
                renderBody={renderSectionBody ? () => renderSectionBody(s, i) : undefined}
              />
            )
            return <Fragment key={i}>{wrapSection ? wrapSection(section, i) : section}</Fragment>
          })}
          {renderAfterSections?.()}
        </div>
      </div>
    </div>
  )
}
