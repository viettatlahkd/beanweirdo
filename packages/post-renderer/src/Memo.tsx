import type { ReactNode } from 'react'
import type { CSSProperties } from 'react'
import { sans, serif } from './tokens'
import type { MemoItem, MemoPostData, MemoRun, MemoSection } from './types'

export type MemoProps = {
  post: MemoPostData
  /**
   * The trail back to where this post is filed. Supplied by the app, so the
   * renderer package stays independent of how routing works.
   */
  breadcrumb?: ReactNode
}

const label: CSSProperties = {
  fontSize: 10,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: '#A2A296',
}

/** Emphasis is amber and italic — the design marks judgements this way. */
const Runs = ({ runs }: { runs: MemoRun[] }) => (
  <>
    {runs.map((r, i) =>
      r.em ? (
        <em key={i} style={{ fontWeight: 600, fontStyle: 'italic', color: '#8A6420' }}>
          {r.t}
        </em>
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
function Item({ item, depth = 0 }: { item: MemoItem; depth?: number }) {
  const dot: CSSProperties =
    depth === 0
      ? { width: 5, height: 5, borderRadius: '50%', background: '#172124' }
      : depth === 1
        ? { width: 5, height: 5, borderRadius: '50%', border: '1px solid #172124' }
        : { width: 4, height: 4, background: '#172124' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 12 }}>
        <div style={{ ...dot, margin: depth === 2 ? '10px 0 0 5px' : '9px 0 0 6px' }} />
        <div style={{ fontSize: depth === 0 ? 15.5 : 15, lineHeight: 1.62 }}>
          <Runs runs={item.runs} />
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
            <Item key={i} item={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ section }: { section: MemoSection }) {
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
          color: '#102F35',
        }}
      >
        {section.h}
      </h2>

      {section.items && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {section.items.map((it, i) => (
            <Item key={i} item={it} />
          ))}
        </div>
      )}

      {section.phases && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {section.phases.map((p) => (
            <div key={p.n} style={{ display: 'grid', gridTemplateColumns: '54px minmax(0,1fr)', gap: 18 }}>
              <div
                style={{
                  fontFamily: serif,
                  fontStyle: 'italic',
                  fontSize: 26,
                  color: '#C4C0B0',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {p.n}
              </div>
              <div>
                <div style={{ fontSize: 15.5, lineHeight: 1.5, marginBottom: 6 }}>{p.label}</div>
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
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${section.table.head.length}, minmax(0,1fr))`,
              gap: 12,
              borderBottom: '1px solid #102F35',
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
                gridTemplateColumns: `repeat(${section.table!.head.length}, minmax(0,1fr))`,
                gap: 12,
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
export function Memo({ post, breadcrumb }: MemoProps) {
  return (
    <div style={{ background: '#FCFCFA', color: '#172124', minHeight: '100vh', fontFamily: sans, fontWeight: 300 }}>
      {/* A memo is short and deliberately plain, so it gets the shallow band
          too — enough to say where it is filed, not enough to crowd the note. */}
      <div
        style={{
          background: post.band?.bg ?? '#EAF1F4',
          color: post.band?.fg ?? '#172124',
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
            borderBottom: '1px solid #102F35',
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
                color: '#102F35',
              }}
            >
              {post.title}
            </h1>
            {post.subtitle && (
              <div
                style={{
                  fontFamily: serif,
                  fontStyle: 'italic',
                  fontSize: 27,
                  lineHeight: 1.3,
                  color: '#8A6420',
                  marginTop: 18,
                }}
              >
                {post.subtitle}
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
            <div style={{ width: 22, height: 1, background: '#F2A0A5', transform: 'translateY(-4px)' }} />
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
          {post.sections.map((s, i) => (
            <Section key={i} section={s} />
          ))}
        </div>
      </div>
    </div>
  )
}
