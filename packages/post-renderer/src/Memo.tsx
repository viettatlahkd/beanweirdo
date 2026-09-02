import { paletteFrom, shade, type Palette } from './palette'
import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { CSSProperties } from 'react'
import { sans, serif } from './tokens'
import type { MemoItem, MemoPostData, MemoRun, MemoSection } from './types'

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
 * Emphasis is italic and coloured — the design marks judgements this way.
 *
 * The colour used to be one fixed amber, which is roasting's colour: a memo
 * filed under sensory marked its judgements in another module's ink. It takes
 * the post's own second weight now.
 */
const Runs = ({ runs, palette }: { runs: MemoRun[]; palette: Palette }) => (
  <>
    {runs.map((r, i) =>
      r.em ? (
        <em key={i} style={{ fontWeight: 600, fontStyle: 'italic', color: palette.mid }}>
          {r.t}
        </em>
      ) : r.u ? (
        // Một số đo đáng dừng lại — gạch chân mảnh, giữ nguyên màu chữ, khác
        // hẳn với nhấn mạnh vốn đổi cả màu lẫn kiểu.
        <span key={i} style={{ borderBottom: '1px solid #CFCFC4' }}>
          {r.t}
        </span>
      ) : (
        <span key={i}>{r.t}</span>
      ),
    )}
  </>
)

/**
 * One bullet and everything hanging under it.
 *
 * Depth carries the argument here rather than decoration: a tasting sits under
 * the character it belongs to, a caveat under the tasting. So the bullet
 * changes shape with depth — filled, then hollow, then a square against a rule.
 */
/**
 * Mỗi giai đoạn một sắc, xoay vòng.
 *
 * Trước đây là ba màu cố định — hồng của sensory, xanh của biochemistry, hổ
 * phách của roasting — nên một bài dưới bất cứ module nào cũng đánh dấu các
 * giai đoạn bằng màu của ba module khác. Nay là ba độ đậm của chính màu bài,
 * nên vẫn phân biệt được mà không mượn màu của ai.
 */
const phaseShades = (accent: string) => [shade(accent, 30), shade(accent, 44), shade(accent, 58)]

/**
 * Cột đầu của bảng nếm là nhãn ("Liều", "Nhiệt") nên giữ hẹp và cố định;
 * các cột số chia đều phần còn lại.
 */
const tableGrid = (columns: number) =>
  columns > 1 ? `80px repeat(${columns - 1}, minmax(0,1fr))` : 'minmax(0,1fr)'

function Item({ item, depth = 0, palette }: { item: MemoItem; depth?: number; palette: Palette }) {
  const dot: CSSProperties =
    depth === 0
      ? { width: 5, height: 5, borderRadius: '50%', background: '#172124' }
      : depth === 1
        ? { width: 5, height: 5, borderRadius: '50%', border: '1px solid #172124' }
        : { width: 4, height: 4, background: '#172124' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {/* Mục lồng bên trong dùng lưới hẹp hơn — 18px cho cấp ngoài,
          14px cho cấp trong, đúng như design. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: depth >= 2 ? '14px minmax(0,1fr)' : '18px minmax(0,1fr)',
          gap: 12,
        }}
      >
        <div style={{ ...dot, margin: depth === 2 ? '10px 0 0 5px' : '9px 0 0 6px' }} />
        <div style={{ fontSize: depth === 0 ? 15.5 : 15, lineHeight: 1.62 }}>
          <Runs runs={item.runs} palette={palette} />
          {item.cont?.map((c, i) => (
            <div key={i} style={{ color: '#4B4A40', fontSize: 14.5, lineHeight: 1.66 }}>
              {c}
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
            <Item key={i} item={c} depth={depth + 1} palette={palette} />
          ))}
        </div>
      )}
    </div>
  )
}

function Section({
  palette,
  section,
  renderHeading,
}: {
  section: MemoSection
  palette: Palette
  renderHeading?: (heading: string) => ReactNode
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

      {section.callout && (
        <div style={{ background: palette.tint, padding: '26px 28px', marginBottom: 26 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 15.5,
              lineHeight: 1.5,
              color: palette.ink,
              marginBottom: 10,
            }}
          >
            {section.callout.h}
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: '#3B3729' }}>
            {section.callout.lines.map((l, li) => (
              <div key={li}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {section.items && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {section.items.map((it, i) => (
            <Item key={i} item={it} palette={palette} />
          ))}
        </div>
      )}

      {section.phases && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {section.phases.map((p, pi) => (
            <div key={p.n} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr)', gap: 14 }}>
              <div
                style={{
                  fontFamily: serif,

                  fontSize: 26,
                  color: phaseShades(palette.accent)[pi % 3],
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {p.n}
              </div>
              <div>
                <div style={{ fontSize: 15, lineHeight: 1.66 }}>{p.label}</div>
                {p.lines.map((l, i) => (
                  <div key={i} style={{ fontSize: 14.5, lineHeight: 1.66, color: '#4B4A40' }}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {section.table && (
        <div style={{ marginTop: 22, maxWidth: 420 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: tableGrid(section.table.head.length),
                gap: '0 14px',
              borderBottom: `1px solid ${palette.ink}`,
              paddingBottom: 8,
            }}
          >
            {section.table.head.map((h) => (
              <div key={h} style={label}>
                {h}
              </div>
            ))}
          </div>
          {section.table.rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: tableGrid(section.table!.head.length),
                  gap: '0 14px',
                borderBottom: '1px solid #E3E3DB',
                padding: '10px 0',
                fontSize: 15,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.map((cell, j) => (
                <div key={j}>{cell}</div>
              ))}
            </div>
          ))}
        </div>
      )}
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
export function Memo({ post, breadcrumb, renderTitle, renderSubtitle, renderSectionHeading, wrapSection, renderAfterSections }: MemoProps) {
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
