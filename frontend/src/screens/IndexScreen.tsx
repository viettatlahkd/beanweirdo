import type { CSSProperties } from 'react'
import { modules } from '../content/modules'
import { garden, ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { rowPad, useNav, useSettings } from '../lib/nav'

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: ink.muted,
}

const switcher: CSSProperties = {
  ...label,
  cursor: 'pointer',
  display: 'inline-block',
  borderBottom: `1px solid ${paper.rule}`,
  paddingBottom: 3,
}

/** The three opening plates — one per module concept, in module order. */
const plates = [
  { bg: garden.blush, fg: '#3B2A2B', caption: 'ảnh mở đầu — vật thể đơn' },
  { bg: garden.leaf, fg: '#1F3323', caption: 'mặt cắt' },
  { bg: 'oklch(0.50 0.135 14)', fg: '#3B2E19', caption: 'dải rang' },
]

/** A — the ledger. Reads top to bottom like the contents page of a notebook. */
function Ledger() {
  const nav = useNav()
  const { density, showPlates } = useSettings()
  const pad = rowPad(density)

  return (
    <div>
      <div style={{ padding: '76px 56px 38px', maxWidth: 1240 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)',
            gap: 44,
            alignItems: 'end',
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontSize: 108,
              lineHeight: 0.9,
              letterSpacing: '-.035em',
              margin: 0,
            }}
          >
            A coffee study
            <br />
            <span style={{ fontStyle: 'italic', color: ink.green }}>journal</span>
          </h1>
          <div style={{ paddingBottom: 14 }}>
            <div style={{ fontSize: 14, lineHeight: 1.45, color: ink.mid, marginBottom: 14 }}>
              Ghi chép quá trình học về cà phê — chia theo module, mỗi module là một tập bài ngắn.
              Đọc theo thứ tự hoặc nhặt bất kỳ đâu.
            </div>
            <Hover
              onClick={nav.toggleVariant}
              style={switcher}
              hoverStyle={{ color: ink.green }}
            >
              xem dạng cột →
            </Hover>
          </div>
        </div>
      </div>

      {showPlates && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)',
            gap: 0,
          }}
        >
          {plates.map((p) => (
            <div
              key={p.caption}
              style={{
                aspectRatio: '16/9',
                background: p.bg,
                display: 'flex',
                alignItems: 'flex-end',
                padding: 16,
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 10, color: p.fg }}>{p.caption}</div>
            </div>
          ))}
        </div>
      )}

      {modules.map((m) => (
        <div key={m.id} style={{ padding: '44px 56px 8px', maxWidth: 1240 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, paddingBottom: 14 }}>
            <Hover
              as="h2"
              onClick={() => nav.openModule(m.id)}
              style={{
                fontFamily: serif,
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: '-.028em',
                margin: 0,
                cursor: 'pointer',
                borderBottom: `6px solid ${m.accent}`,
              }}
              hoverStyle={{ color: ink.green }}
            >
              {m.title}
            </Hover>
            <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, paddingBottom: 6 }}>
              {m.entries.length} bài
            </div>
            <div style={{ flex: 1, height: 1, background: paper.rule, marginBottom: 8 }} />
            <div style={{ ...label, paddingBottom: 6 }}>{m.concept}</div>
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.35,
              color: ink.soft,
              maxWidth: 600,
              margin: '0 0 18px',
            }}
          >
            {m.blurb}
          </div>

          {m.entries.map((e) => (
            <Hover
              key={e.n}
              onClick={nav.openArticle}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px minmax(0,1fr) minmax(0,1.05fr) 72px 56px',
                alignItems: 'baseline',
                gap: 18,
                padding: `${pad} 12px ${pad} 10px`,
                borderTop: `1px solid ${paper.rule}`,
                cursor: 'pointer',
                borderLeft: '3px solid transparent',
              }}
              hoverStyle={{ background: paper.white, borderLeft: `3px solid ${ink.green}` }}
            >
              <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint }}>{e.n}</div>
              <div style={{ fontFamily: serif, fontSize: 23, letterSpacing: '-.015em' }}>{e.en}</div>
              <div style={{ fontSize: 13, color: ink.soft, lineHeight: 1.2 }}>{e.vi}</div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 10,
                  color: ink.muted,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                }}
              >
                {e.kind}
              </div>
              <div
                style={{ fontFamily: sans, fontSize: 10, color: ink.faint, textAlign: 'right' }}
              >
                {e.date}
              </div>
            </Hover>
          ))}
          <div style={{ borderTop: `1px solid ${paper.rule}` }} />
        </div>
      ))}
      <div style={{ height: 80 }} />
    </div>
  )
}

/** B — three parallel columns. Easier to compare modules side by side. */
function Columns() {
  const nav = useNav()
  const { showPlates } = useSettings()

  return (
    <div style={{ padding: '76px 56px 130px', maxWidth: 1340 }}>
      <h1
        style={{
          fontFamily: serif,
          fontSize: 108,
          lineHeight: 0.9,
          letterSpacing: '-.035em',
          margin: '0 0 16px',
        }}
      >
        A coffee study <span style={{ fontStyle: 'italic', color: ink.green }}>journal</span>
      </h1>
      <div
        style={{
          maxWidth: 440,
          fontSize: 14,
          lineHeight: 1.45,
          color: ink.mid,
          marginBottom: 14,
        }}
      >
        Ghi chép quá trình học về cà phê — chia theo module, mỗi module là một tập bài ngắn.
      </div>
      <Hover
        onClick={nav.toggleVariant}
        style={{ ...switcher, marginBottom: 44 }}
        hoverStyle={{ color: ink.green }}
      >
        xem dạng danh sách →
      </Hover>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 0 }}>
        {modules.map((m) => (
          <div
            key={m.id}
            style={{ background: m.accent, color: m.on, padding: '26px 24px 30px' }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 10,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                opacity: 0.7,
                marginBottom: 10,
              }}
            >
              {m.concept}
            </div>
            <h2
              onClick={() => nav.openModule(m.id)}
              style={{
                fontFamily: serif,
                fontSize: 46,
                lineHeight: 1,
                letterSpacing: '-.03em',
                margin: '0 0 14px',
                cursor: 'pointer',
              }}
            >
              {m.title}
            </h2>
            <div style={{ fontSize: 13.5, lineHeight: 1.35, marginBottom: 20 }}>{m.blurb}</div>

            {showPlates && (
              <div
                style={{
                  aspectRatio: '4/3',
                  marginBottom: 20,
                  background: paper.cream,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 12,
                }}
              >
                <div
                  style={{ fontFamily: sans, fontSize: 10, color: ink.strong, lineHeight: 1.3 }}
                >
                  {m.shot1}
                </div>
              </div>
            )}

            {m.entries.map((e) => (
              <div
                key={e.n}
                onClick={nav.openArticle}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '11px 0',
                  borderTop: '1px solid rgba(35,33,26,.16)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 10, opacity: 0.6, paddingTop: 6 }}>
                  {e.n}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: serif,
                      fontSize: 21,
                      lineHeight: 1.2,
                      letterSpacing: '-.015em',
                    }}
                  >
                    {e.en}
                  </div>
                  <div
                    style={{ fontSize: 12.5, lineHeight: 1.2, marginTop: 3, opacity: 0.82 }}
                  >
                    {e.vi}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mục lục — the table of contents, in whichever shape is selected. */
export function IndexScreen() {
  const { variant } = useNav()
  return variant === 'A' ? <Ledger /> : <Columns />
}
