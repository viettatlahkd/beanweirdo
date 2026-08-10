import type { CSSProperties, ReactNode } from 'react'
import { modules } from '../content/modules'
import { garden, ink, layout, paper, sans, serif } from '../design/tokens'
import { Hover, useHover } from '../lib/Hover'
import { useNav } from '../lib/nav'

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 30,
  padding: '10px 22px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  color: ink.soft,
}

const rowHover: CSSProperties = { background: paper.hover, color: ink.base }

const glyphSlot: CSSProperties = {
  width: 20,
  display: 'flex',
  justifyContent: 'center',
  flex: 'none',
}

const labelText: CSSProperties = { fontSize: 13 }

const divider: CSSProperties = { height: 1, background: paper.rule }

function Row({
  glyph,
  label,
  count,
  onClick,
}: {
  glyph: ReactNode
  label: string
  count?: ReactNode
  onClick: () => void
}) {
  return (
    <Hover style={row} hoverStyle={rowHover} onClick={onClick}>
      <div style={glyphSlot}>{glyph}</div>
      <div style={{ ...labelText, ...(count !== undefined ? { flex: 1 } : null) }}>{label}</div>
      {count !== undefined && (
        <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint, paddingRight: 18 }}>
          {count}
        </div>
      )}
    </Hover>
  )
}

/**
 * The only navigation in the app. It sits at 64px — a margin rather than a
 * panel — and opens to 268px on hover, floating a white sheet over the page.
 * Every label starts at 72px so it clears the closed edge instead of being
 * sliced in half.
 */
export function Sidebar() {
  const nav = useNav()
  const { on, bind } = useHover()

  return (
    <div
      {...bind}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: on ? layout.sidebarOpen : layout.sidebarClosed,
        background: on ? paper.white : paper.cream,
        boxShadow: on ? '22px 0 50px -34px rgba(35,33,26,.35)' : undefined,
        color: ink.base,
        overflow: 'hidden',
        zIndex: 60,
        transition: 'width .3s cubic-bezier(.4,0,.2,1)',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 30,
          padding: '0 22px 24px',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: garden.blush,
            flex: 'none',
          }}
        />
        <div style={{ fontFamily: serif, fontSize: 23, letterSpacing: '-.01em' }}>coffee study</div>
      </div>

      <div style={{ ...divider, margin: '0 0 20px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Row
          onClick={nav.goArt}
          label="Design system"
          glyph={
            <div
              style={{ width: 8, height: 8, border: '1px solid #8C8674', transform: 'rotate(45deg)' }}
            />
          }
        />
        <Row
          onClick={nav.goLanding}
          label="Trang chủ"
          glyph={
            <div
              style={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${ink.base}` }}
            />
          }
        />
        <Row
          onClick={nav.goHome}
          label="Mục lục"
          glyph={<div style={{ width: 10, height: 1, background: ink.muted }} />}
        />

        {modules.map((m) => (
          <Row
            key={m.id}
            onClick={() => nav.openModule(m.id)}
            label={m.title}
            count={m.entries.length}
            glyph={
              <div
                style={{ width: 10, height: 10, borderRadius: '50%', background: m.accent }}
              />
            }
          />
        ))}

        <Row
          onClick={nav.openArticle}
          label="Bài mẫu — CGA"
          glyph={
            <div
              style={{
                width: 11,
                height: 7,
                borderTop: `1px solid ${ink.muted}`,
                borderBottom: `1px solid ${ink.muted}`,
              }}
            />
          }
        />
        <Row
          onClick={nav.goArchive}
          label="Archive"
          glyph={<div style={{ width: 8, height: 8, border: '1px solid #8CA492' }} />}
        />
      </div>

      {/* Practice sits below a rule — it is not a peer of the modules. */}
      <div style={{ margin: '24px 0 0' }}>
        <div style={{ ...divider, marginBottom: 14 }} />
        <div style={{ padding: '0 22px 8px', whiteSpace: 'nowrap', display: 'flex', gap: 30 }}>
          <div style={{ width: 20, flex: 'none' }} />
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: ink.faint,
            }}
          >
            Practice
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Row
            onClick={nav.goHours}
            label="Hours — nhật ký giờ"
            glyph={
              <div
                style={{
                  width: 9,
                  height: 9,
                  border: '1px solid #16181B',
                  borderRadius: '50%',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 3,
                    top: 1,
                    width: 1,
                    height: 3,
                    background: '#16181B',
                  }}
                />
              </div>
            }
          />
          <Row
            onClick={nav.goNotes}
            label="Notes — ghi chép rời"
            glyph={
              <div
                style={{
                  width: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  alignItems: 'center',
                  flex: 'none',
                }}
              >
                <div style={{ width: 11, height: 1, background: '#16181B' }} />
                <div style={{ width: 11, height: 1, background: '#16181B' }} />
                <div style={{ width: 6, height: 1, background: '#16181B' }} />
              </div>
            }
          />
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '0 22px', whiteSpace: 'nowrap' }}>
        <div style={{ width: 20, height: 1, background: paper.rule }} />
      </div>
    </div>
  )
}
