import { useMemo, useState, type CSSProperties } from 'react'
import {
  noteBlock,
  noteColor,
  noteKinds,
  notePlacement,
  noteTitleSize,
  notes,
  paragraphs,
  type NoteKind,
} from '../content/notes'
import { notesTheme, sans, serif } from '../design/tokens'

type Filter = 'tất cả' | NoteKind

const eyebrow: CSSProperties = {
  fontFamily: sans,
  fontSize: 9.5,
  letterSpacing: '.34em',
  textTransform: 'uppercase',
  color: notesTheme.faint,
}

/**
 * Practice — 02 / Notes. Deliberately a different visual language from the
 * blog: cold white instead of cream, editorial rather than journal, and
 * interactive in a way nothing else on the site is — hovering a note dims the
 * whole page to 22% and brings that one piece forward.
 */
export function Notes() {
  const [filter, setFilter] = useState<Filter>('tất cả')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [openTitle, setOpenTitle] = useState<string | null>(null)

  const filtered = useMemo(
    () => notes.filter((n) => filter === 'tất cả' || n.k === filter),
    [filter],
  )

  const openNote = filtered.find((n) => n.t === openTitle) ?? null

  const filterCounts: Filter[] = ['tất cả', ...noteKinds]

  return (
    <div>
      <div
        style={{
          background: notesTheme.bg,
          color: notesTheme.ink,
          minHeight: '100vh',
          padding: '52px 60px 160px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* two large hairline arcs, purely decorative — the "cold" editorial mark */}
        <div
          style={{
            position: 'absolute',
            right: -180,
            top: -120,
            width: 620,
            height: 620,
            border: `1px solid ${notesTheme.arcStrong}`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -40,
            top: 180,
            width: 420,
            height: 760,
            borderLeft: `1px solid ${notesTheme.arcSoft}`,
            borderRadius: '60% 0 0 40%',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 56,
            flexWrap: 'wrap',
            position: 'relative',
          }}
        >
          <div>
            <div style={{ ...eyebrow, marginBottom: 20 }}>Practice — 02</div>
            <h1
              style={{
                fontFamily: serif,
                fontSize: 118,
                lineHeight: 0.82,
                letterSpacing: '-.045em',
                margin: 0,
                fontWeight: 400,
              }}
            >
              Notes
              <span style={{ fontStyle: 'italic', color: notesTheme.carmine }}>.</span>
            </h1>
            <div
              style={{
                fontFamily: serif,
                fontStyle: 'italic',
                fontSize: 27,
                color: notesTheme.mid,
                marginTop: 12,
              }}
            >
              ghi chép rời — không thuộc module nào
            </div>
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: notesTheme.soft,
              maxWidth: 310,
              paddingBottom: 14,
            }}
          >
            Một quan sát vật lý trong bếp, một đoạn video không tiếng, một ý nghĩ bắc cầu giữa hai
            lĩnh vực.
            <div
              style={{
                marginTop: 10,
                fontSize: 10,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: notesTheme.ghost,
              }}
            >
              Rê chuột để tách khỏi trang · bấm để đọc
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 26,
            flexWrap: 'wrap',
            alignItems: 'center',
            margin: '44px 0 14px',
            paddingBottom: 16,
            borderBottom: `1px solid ${notesTheme.ink}`,
            position: 'relative',
          }}
        >
          {filterCounts.map((f) => (
            <div
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: sans,
                fontSize: 10.5,
                letterSpacing: '.24em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                color: f === filter ? notesTheme.carmine : notesTheme.muted,
                display: 'flex',
                gap: 7,
                alignItems: 'baseline',
                transition: 'color .3s ease',
              }}
            >
              <div>{f}</div>
              <div
                style={{
                  fontFamily: serif,
                  fontStyle: 'italic',
                  letterSpacing: 0,
                  fontSize: 12,
                  opacity: 0.6,
                }}
              >
                {f === 'tất cả' ? notes.length : notes.filter((x) => x.k === f).length}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12,minmax(0,1fr))',
            gap: 30,
            marginTop: 34,
            position: 'relative',
          }}
        >
          {filtered.map((n, i) => {
            const p = notePlacement[i % notePlacement.length]
            const isHover = hoverIdx === i
            const dimmed = hoverIdx !== null && hoverIdx !== i
            const color = noteColor[n.k]
            const block = noteBlock[n.k]
            const num = String(notes.length - notes.indexOf(n)).padStart(2, '0')

            return (
              <div
                key={n.t}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onClick={() => setOpenTitle(n.t)}
                style={{
                  gridColumn: p.col,
                  marginTop: p.mt,
                  opacity: dimmed ? 0.22 : 1,
                  transform: isHover ? 'translateY(-8px)' : 'translateY(0)',
                  cursor: 'pointer',
                  transition: 'opacity .5s ease, transform .6s cubic-bezier(.16,.84,.32,1)',
                }}
              >
                <div
                  style={{
                    height: 1,
                    background: notesTheme.ink,
                    width: isHover ? '100%' : '34px',
                    transition: 'width .7s cubic-bezier(.16,.84,.32,1)',
                    marginBottom: 14,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 14,
                    marginBottom: 14,
                    fontFamily: sans,
                  }}
                >
                  <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color }}>
                    {num}
                  </div>
                  <div style={{ fontSize: 9.5, letterSpacing: '.26em', textTransform: 'uppercase', color }}>
                    {n.k}
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 10, letterSpacing: '.16em', color: notesTheme.ghost, fontVariantNumeric: 'tabular-nums' }}>
                    {n.d}
                  </div>
                </div>

                {n.len === 'media' && (
                  <div
                    style={{
                      aspectRatio: '5/4',
                      background: block,
                      marginBottom: 18,
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 14,
                      fontFamily: sans,
                      fontSize: 9.5,
                      letterSpacing: '.2em',
                      textTransform: 'uppercase',
                      color: notesTheme.soft,
                    }}
                  >
                    video — thả file vào đây
                  </div>
                )}

                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -10,
                      right: -10,
                      top: '8%',
                      bottom: '8%',
                      background: block,
                      transform: isHover ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left center',
                      transition: 'transform .62s cubic-bezier(.16,.84,.32,1)',
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      fontFamily: serif,
                      fontSize: noteTitleSize(n.len),
                      lineHeight: 1.02,
                      letterSpacing: '-.035em',
                      color: isHover ? color : notesTheme.ink,
                      transition: 'color .45s ease',
                    }}
                  >
                    {n.t}
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: sans,
                    fontWeight: 300,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: notesTheme.soft,
                    opacity: isHover ? 1 : 0.55,
                    transition: 'opacity .5s ease',
                    maxWidth: 520,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.b}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {openNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: notesTheme.bg,
            overflowY: 'auto',
            padding: '60px 72px 120px',
            animation: 'riseIn .5s cubic-bezier(.16,.84,.32,1)',
          }}
        >
          <div
            onClick={() => setOpenTitle(null)}
            style={{
              position: 'fixed',
              right: 60,
              top: 52,
              fontFamily: sans,
              fontSize: 10.5,
              letterSpacing: '.24em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: notesTheme.ink,
              zIndex: 210,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 20, letterSpacing: 0 }}>✕</div>
            <div>Đóng</div>
          </div>

          <div
            style={{
              maxWidth: 1180,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)',
              gap: 72,
              alignItems: 'start',
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: -28,
                  top: '34%',
                  width: 300,
                  height: 300,
                  background: noteBlock[openNote.k],
                  borderRadius: '50%',
                  opacity: 0.55,
                }}
              />
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 16,
                    fontFamily: sans,
                    marginBottom: 26,
                  }}
                >
                  <div
                    style={{
                      fontFamily: serif,
                      fontStyle: 'italic',
                      fontSize: 18,
                      color: noteColor[openNote.k],
                    }}
                  >
                    {String(notes.length - notes.indexOf(openNote)).padStart(2, '0')}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      letterSpacing: '.28em',
                      textTransform: 'uppercase',
                      color: noteColor[openNote.k],
                    }}
                  >
                    {openNote.k}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: '.16em', color: notesTheme.ghost }}>
                    {openNote.d}
                  </div>
                </div>
                <h2
                  style={{
                    fontFamily: serif,
                    fontWeight: 400,
                    fontSize: 78,
                    lineHeight: 0.94,
                    letterSpacing: '-.04em',
                    margin: 0,
                  }}
                >
                  {openNote.t}
                </h2>
                {openNote.len === 'media' && (
                  <div
                    style={{
                      aspectRatio: '4/3',
                      background: noteBlock[openNote.k],
                      marginTop: 34,
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 16,
                      fontFamily: sans,
                      fontSize: 9.5,
                      letterSpacing: '.2em',
                      textTransform: 'uppercase',
                      color: notesTheme.soft,
                    }}
                  >
                    video — thả file vào đây
                  </div>
                )}
              </div>
            </div>

            <div style={{ paddingTop: 16 }}>
              <div style={{ width: 56, height: 1, background: notesTheme.ink, marginBottom: 26 }} />
              {paragraphs(openNote.b).map((p, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: sans,
                    fontWeight: 300,
                    fontSize: 16.5,
                    lineHeight: 1.62,
                    color: notesTheme.body,
                    marginBottom: 20,
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
