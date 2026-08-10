import type { CSSProperties } from 'react'
import { article, articleMeta } from '../content/article'
import { modules } from '../content/modules'
import { garden, ink, layout, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav, useSettings } from '../lib/nav'

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
}

/** Other pieces in the same module — this one excluded. */
const related = modules
  .find((m) => m.id === articleMeta.moduleId)!
  .entries.filter((e) => e.n !== '03')

/**
 * A post. Colour block up top with the title kept clear of the hero plate, one
 * body column at a comfortable measure, and a sticky rail that runs the length
 * of the piece so the right side never empties out.
 */
export function Article() {
  const nav = useNav()
  const { showPlates } = useSettings()

  return (
    <div>
      <div
        style={{
          background: garden.leaf,
          color: '#1F3323',
          padding: '46px 56px 124px',
          position: 'relative',
        }}
      >
        <div
          onClick={() => nav.openModule(articleMeta.moduleId)}
          style={{ ...label, cursor: 'pointer', marginBottom: 24, opacity: 0.7 }}
        >
          ← {articleMeta.moduleTitle}
        </div>
        <div style={{ ...label, opacity: 0.7, marginBottom: 12 }}>{articleMeta.eyebrow}</div>
        {/* the measure subtracts the hero plate's 300px so the two never collide */}
        <h1
          style={{
            fontFamily: serif,
            fontSize: 76,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: '0 0 12px',
            maxWidth: 'min(660px, 100% - 300px)',
          }}
        >
          {articleMeta.title}
          <span style={{ fontStyle: 'italic' }}>{articleMeta.titleItalic}</span>
        </h1>
        <div
          style={{
            fontFamily: serif,
            fontStyle: 'italic',
            fontSize: 24,
            lineHeight: 1.4,
            maxWidth: 'min(520px, 100% - 300px)',
          }}
        >
          {articleMeta.lead}
        </div>

        {showPlates && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 300,
              background: garden.blush,
              display: 'flex',
              alignItems: 'flex-end',
              padding: 14,
            }}
          >
            <div style={{ fontFamily: sans, fontSize: 9.5, color: '#3B2A2B' }}>
              {articleMeta.heroCaption}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '56px 56px 140px', maxWidth: layout.measure }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `minmax(0,1fr) minmax(${layout.railMin}px,${layout.railMax}px)`,
            gap: 48,
            alignItems: 'start',
          }}
        >
          <div>
            {showPlates && (
              // two plates of unequal height, bottom-aligned to a common edge
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,2.1fr) minmax(0,1fr)',
                  gap: 10,
                  margin: '0 0 46px',
                }}
              >
                <div
                  style={{
                    height: 280,
                    background: garden.leafTint,
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 10,
                      color: ink.strong,
                      lineHeight: 1.3,
                    }}
                  >
                    ảnh chính — mặt cắt hạt trong lớp nhầy
                  </div>
                </div>
                <div
                  style={{
                    height: 180,
                    alignSelf: 'end',
                    background: garden.honeyTint,
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 12,
                  }}
                >
                  <div
                    style={{ fontFamily: sans, fontSize: 9.5, color: '#6B6555', lineHeight: 1.2 }}
                  >
                    nhân xanh, 3:4
                  </div>
                </div>
              </div>
            )}

            {article.map((s) => (
              <div key={s.h} style={{ marginBottom: 34 }}>
                <h3
                  style={{
                    fontFamily: sans,
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: ink.green,
                    margin: '0 0 12px',
                  }}
                >
                  {s.h}
                </h3>
                <div style={{ fontSize: 16, lineHeight: 1.2, color: ink.body }}>{s.p}</div>

                {s.fig && (
                  // the plate sits off to one side; its marginal note takes the
                  // space that would otherwise be a gap in the reading column
                  <div
                    style={{
                      display: 'flex',
                      gap: 24,
                      alignItems: 'flex-end',
                      margin: s.fig.margin,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 9.5,
                          letterSpacing: '.12em',
                          textTransform: 'uppercase',
                          color: ink.green,
                          marginBottom: 8,
                        }}
                      >
                        {s.fig.label}
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: ink.soft }}>
                        {s.fig.note}
                      </div>
                    </div>
                    <div style={{ width: s.fig.w, flex: 'none' }}>
                      <div
                        style={{
                          height: s.fig.h,
                          background: s.fig.tint,
                          display: 'flex',
                          alignItems: 'flex-end',
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: sans,
                            fontSize: 9.5,
                            color: ink.strong,
                            lineHeight: 1.3,
                          }}
                        >
                          {s.fig.caption}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              position: 'sticky',
              top: 44,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div
              style={{
                background: ink.moss,
                color: '#F4F2E4',
                padding: '22px 20px',
                fontFamily: serif,
                fontStyle: 'italic',
                fontSize: 18,
                lineHeight: 1.2,
              }}
            >
              {articleMeta.pull}
            </div>

            <div style={{ borderTop: `2px solid ${ink.base}`, paddingTop: 14 }}>
              <div style={{ ...label, color: ink.muted, marginBottom: 8 }}>Trong module này</div>
              {related.map((r) => (
                <Hover
                  key={r.n}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    padding: '9px 0',
                    borderBottom: `1px solid ${paper.rule}`,
                    cursor: 'pointer',
                    color: ink.soft,
                  }}
                  hoverStyle={{ color: ink.green }}
                >
                  {r.en}
                </Hover>
              ))}
            </div>

            {showPlates && (
              <div
                style={{
                  aspectRatio: '1',
                  background: garden.leafTint,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 12,
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 9.5, color: '#6B6555' }}>
                  chi tiết vỏ lụa, 1:1
                </div>
              </div>
            )}

            <div style={{ fontFamily: sans, fontSize: 10, color: ink.muted, lineHeight: 1.6 }}>
              <div style={{ ...label, color: ink.green, marginBottom: 6 }}>Đọc thêm</div>
              {articleMeta.furtherReading.map((r) => (
                <div key={r}>{r}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
