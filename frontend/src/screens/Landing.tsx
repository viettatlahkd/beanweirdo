import type { CSSProperties } from 'react'
import { modules, type Module } from '../content/modules'
import { garden, ink, layout, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { Rise } from '../lib/Rise'
import { useNav } from '../lib/nav'

const eyebrow: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
}

const shotCaption: CSSProperties = { fontFamily: sans, fontSize: 10, color: ink.strong }
const shotCaptionSm: CSSProperties = { ...shotCaption, fontSize: 9.5 }

const tile = (background: string, padding: number): CSSProperties => ({
  background,
  display: 'flex',
  alignItems: 'flex-end',
  padding,
})

const bandGrid = (columns: string, rows: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gridTemplateRows: rows,
  gap: 8,
  height: layout.band,
})

/**
 * Each module gets its own image arrangement, and every tile breaks its grid
 * cell by a different amount — the band's top and bottom edges are deliberately
 * ragged so scrolling past three modules doesn't read as three identical rows.
 */
function ImageBand({ m }: { m: Module }) {
  if (m.layout === 'band') {
    return (
      <div style={bandGrid('minmax(0,1.9fr) minmax(0,1fr) 30px', '1.5fr 1fr')}>
        <Rise
          from={['-34px', '0px']}
          delay="0ms"
          style={{
            gridColumn: 1,
            gridRow: '1/3',
            margin: '-34px 0 0',
            ...tile(paper.cream, 14),
          }}
        >
          <div style={shotCaption}>{m.shot1}</div>
        </Rise>
        <Rise
          from={['0px', '-22px']}
          delay="90ms"
          style={{
            gridColumn: 2,
            gridRow: 1,
            margin: '38px 0 0 -46px',
            ...tile(paper.cream, 11),
          }}
        >
          <div style={shotCaptionSm}>{m.shot2}</div>
        </Rise>
        <Rise
          from={['0px', '22px']}
          delay="150ms"
          style={{
            gridColumn: 2,
            gridRow: 2,
            margin: '0 0 -36px',
            ...tile(garden.petalTint, 11),
          }}
        >
          <div style={shotCaptionSm}>{m.shot3}</div>
        </Rise>
        {/* a solid strip, not a photo — it keeps the rhythm without a fourth image */}
        <Rise
          from={['20px', '0px']}
          delay="210ms"
          style={{
            gridColumn: 3,
            gridRow: '1/3',
            margin: '96px 0 22px',
            background: garden.petalTint2,
          }}
        />
      </div>
    )
  }

  if (m.layout === 'specimen') {
    return (
      <div style={bandGrid('minmax(0,1.7fr) minmax(0,1fr)', '1fr 1.4fr')}>
        <Rise
          from={['-34px', '0px']}
          delay="0ms"
          style={{
            gridColumn: 1,
            gridRow: '1/3',
            margin: '-22px 0 34px',
            ...tile(paper.cream, 14),
          }}
        >
          <div style={shotCaption}>{m.shot1}</div>
        </Rise>
        <Rise
          from={['0px', '-24px']}
          delay="90ms"
          style={{
            gridColumn: 2,
            gridRow: 1,
            margin: '52px -26px 0 -34px',
            ...tile(garden.leafTint, 11),
          }}
        >
          <div style={shotCaptionSm}>{m.shot2}</div>
        </Rise>
        <Rise
          from={['0px', '26px']}
          delay="160ms"
          style={{
            gridColumn: 2,
            gridRow: 2,
            margin: '24px 34px -40px 22px',
            ...tile(paper.cream, 11),
          }}
        >
          <div style={shotCaptionSm}>{m.shot3}</div>
        </Rise>
      </div>
    )
  }

  return (
    <div style={bandGrid('minmax(0,2.1fr) minmax(0,1fr)', '1.45fr 1fr')}>
      <Rise
        from={['-34px', '0px']}
        delay="0ms"
        style={{
          gridColumn: 1,
          gridRow: '1/3',
          margin: '26px 0 -34px',
          ...tile(paper.cream, 14),
        }}
      >
        <div style={shotCaption}>{m.shot1}</div>
      </Rise>
      <Rise
        from={['0px', '-26px']}
        delay="90ms"
        style={{
          gridColumn: 2,
          gridRow: 1,
          margin: '-38px 26px 0 -40px',
          ...tile(garden.honeyTint, 11),
        }}
      >
        <div style={shotCaptionSm}>{m.shot2}</div>
      </Rise>
      <Rise
        from={['0px', '26px']}
        delay="170ms"
        style={{
          gridColumn: 2,
          gridRow: 2,
          margin: '38px -18px 0 44px',
          ...tile(paper.cream, 11),
        }}
      >
        <div style={shotCaptionSm}>{m.shot3}</div>
      </Rise>
    </div>
  )
}

/**
 * Trang chủ — the real homepage. An introduction, then one full-bleed colour
 * block per module. The whole block is the target, not just its heading.
 */
export function Landing() {
  const nav = useNav()

  return (
    <div>
      <div style={{ padding: '80px 56px 64px', maxWidth: layout.page }}>
        <div style={{ ...eyebrow, color: ink.muted, marginBottom: 28 }}>
          coffee study journal — 2024 / 2026
        </div>
        <h1
          style={{
            fontFamily: serif,
            fontSize: 104,
            lineHeight: 0.9,
            letterSpacing: '-.035em',
            margin: '0 0 24px',
          }}
        >
          be
          <span
            style={{
              display: 'inline-block',
              transform: 'scale(1.22)',
              transformOrigin: '50% 88%',
              color: garden.blush,
            }}
          >
            ӕ
          </span>
          n weirdo
          <br />
          <span style={{ fontStyle: 'italic', color: ink.green }}>bằng cách viết ra</span>
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,.8fr)',
            gap: 40,
            alignItems: 'start',
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.5, color: ink.strong }}>
            Mỗi thứ học được đều bị viết lại thành một ghi chú ngắn, xếp vào một module. Ba module
            đang mở: giác quan, hoá sinh, rang. Bài mới nhất luôn nằm trên cùng của module tương ứng.
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: ink.soft }}>
            Không có bài nào ở đây là kết luận. Phần lớn là ghi chép giữa đường: đọc được gì, thử gì,
            sai ở đâu. Mục "còn chưa rõ" ở cuối mỗi bài thường là phần đáng đọc nhất.
          </div>
          <Hover
            onClick={nav.goHome}
            style={{
              ...eyebrow,
              letterSpacing: '.14em',
              color: ink.green,
              cursor: 'pointer',
              paddingTop: 4,
            }}
            hoverStyle={{ color: ink.base }}
          >
            xem mục lục 18 bài →
          </Hover>
        </div>
      </div>

      {modules.map((m) => (
        <div
          key={m.id}
          onClick={() => nav.openModule(m.id)}
          style={{
            background: m.accent,
            color: m.on,
            padding: '44px 56px 72px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr) minmax(0,.85fr)',
              gap: 40,
              alignItems: 'start',
              marginBottom: 64,
            }}
          >
            <div style={{ minWidth: 0, maxWidth: '100%' }}>
              <div style={{ ...eyebrow, letterSpacing: '.16em', marginBottom: 12, opacity: 0.65 }}>
                {m.concept} — {m.entries.length} bài
              </div>
              {/* `lang="en"` + hyphenation so "biochemistry 101" breaks on a real
                  syllable boundary instead of overflowing into the next column. */}
              <h3
                lang="en"
                style={
                  {
                    fontFamily: serif,
                    fontSize: 72,
                    lineHeight: 0.94,
                    letterSpacing: '-.035em',
                    margin: 0,
                    maxWidth: '100%',
                    hyphens: 'auto',
                    WebkitHyphens: 'auto',
                    hyphenateLimitChars: '8 4 4',
                    overflowWrap: 'break-word',
                  } as CSSProperties
                }
              >
                {m.title}
              </h3>
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 38 }}>{m.long}</div>

            <div style={{ marginTop: 38 }}>
              <div style={{ ...eyebrow, letterSpacing: '.14em', opacity: 0.65, marginBottom: 10 }}>
                Mới nhất
              </div>
              {m.entries.slice(0, 3).map((e) => (
                <div
                  key={e.n}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '7px 0',
                    borderTop: '1px solid rgba(35,33,26,.16)',
                  }}
                >
                  <div style={{ fontFamily: sans, fontSize: 9.5, opacity: 0.6, paddingTop: 5 }}>
                    {e.date}
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.2 }}>{e.en}</div>
                </div>
              ))}
            </div>
          </div>

          <ImageBand m={m} />
        </div>
      ))}
    </div>
  )
}
