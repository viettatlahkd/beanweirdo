import type { CSSProperties, ReactNode } from 'react'
import { modules } from '../content/modules'
import { layout, paper, sans, serif } from '../design/tokens'
import { Hover, useHover } from '../lib/Hover'
import { useNav } from '../lib/nav'

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 30,
  padding: '10px 22px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const glyphSlot: CSSProperties = {
  width: 20,
  display: 'flex',
  justifyContent: 'center',
  flex: 'none',
}

const labelText: CSSProperties = { fontSize: 13 }

/**
 * The sidebar carries its own two-tone theme: cream everywhere except on
 * Hours/Notes ("Ghi" / "bite-size"), where it goes dark navy to match those
 * screens' own visual language. Every glyph below draws in `currentColor` so
 * it repaints for free when the row's text color swaps.
 */
function theme(dark: boolean) {
  return {
    bg: dark ? '#102F35' : paper.cream,
    fg: dark ? '#F4F4EF' : '#23211A',
    muted: dark ? '#9BB0AE' : '#5C5745',
    hover: dark ? 'rgba(255,255,255,.08)' : '#F6F2E2',
    rule: dark ? '#1E464A' : '#EBE5D3',
  }
}

function Row({
  glyph,
  label,
  count,
  muted,
  hoverBg,
  onClick,
}: {
  glyph: ReactNode
  label: string
  count?: ReactNode
  muted: string
  hoverBg: string
  onClick: () => void
}) {
  return (
    <Hover
      style={{ ...row, color: muted }}
      hoverStyle={{ background: hoverBg }}
      onClick={onClick}
    >
      <div style={glyphSlot}>{glyph}</div>
      <div style={{ ...labelText, ...(count !== undefined ? { flex: 1 } : null) }}>{label}</div>
      {count !== undefined && (
        <div style={{ fontFamily: sans, fontSize: 10, color: '#B5AE99', paddingRight: 18 }}>
          {count}
        </div>
      )}
    </Hover>
  )
}

/**
 * The only navigation in the app. It sits at 64px — a margin rather than a
 * panel — and opens to 268px on hover, floating a sheet over the page.
 */
export function Sidebar() {
  const nav = useNav()
  const { on, bind } = useHover()
  const dark = nav.screen === 'notes' || nav.screen === 'hours'
  const t = theme(dark)

  return (
    <div
      {...bind}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: on ? layout.sidebarOpen : layout.sidebarClosed,
        background: t.bg,
        color: t.fg,
        boxShadow: on ? '22px 0 50px -34px rgba(35,33,26,.45)' : undefined,
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
          style={{ width: 20, height: 20, borderRadius: '50%', background: '#F2A0A5', flex: 'none' }}
        />
        <div style={{ fontFamily: serif, fontSize: 23, letterSpacing: '-.01em' }}>coffee study</div>
      </div>

      <div style={{ height: 1, background: t.rule, margin: '0 0 20px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Row
          onClick={nav.goArt}
          label="Design system"
          muted={t.muted}
          hoverBg={t.hover}
          glyph={
            <div
              style={{ width: 8, height: 8, border: '1px solid currentColor', transform: 'rotate(45deg)' }}
            />
          }
        />
        <Row
          onClick={nav.goLanding}
          label="Trang chủ"
          muted={t.muted}
          hoverBg={t.hover}
          glyph={
            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid currentColor' }} />
          }
        />
        <Row
          onClick={nav.goHome}
          label="Mục lục"
          muted={t.muted}
          hoverBg={t.hover}
          glyph={<div style={{ width: 10, height: 1, background: 'currentColor' }} />}
        />

        {modules.map((m) => (
          <Row
            key={m.id}
            onClick={() => nav.openModule(m.id)}
            label={m.title}
            count={m.entries.length}
            muted={t.muted}
            hoverBg={t.hover}
            glyph={<div style={{ width: 10, height: 10, borderRadius: '50%', background: m.accent }} />}
          />
        ))}

        <Row
          onClick={nav.goNotes}
          label="bite-size"
          muted={t.muted}
          hoverBg={t.hover}
          glyph={<div style={{ width: 9, height: 9, background: '#6FA8C0' }} />}
        />
        <Row
          onClick={nav.goArchive}
          label="Archive"
          muted={t.muted}
          hoverBg={t.hover}
          glyph={<div style={{ width: 8, height: 8, border: '1px solid currentColor' }} />}
        />
        <Row
          onClick={nav.openArticle}
          label="Bài mẫu — CGA"
          muted={t.muted}
          hoverBg={t.hover}
          glyph={
            <div
              style={{
                width: 11,
                height: 7,
                borderTop: '1px solid currentColor',
                borderBottom: '1px solid currentColor',
              }}
            />
          }
        />
      </div>

      {/* Practice sits below a rule — it is not a peer of the modules. */}
      <div style={{ margin: '24px 0 0' }}>
        <div style={{ height: 1, background: t.rule, marginBottom: 14 }} />
        <div style={{ padding: '0 22px 8px', whiteSpace: 'nowrap', display: 'flex', gap: 30 }}>
          <div style={{ width: 20, flex: 'none' }} />
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: '#B5AE99',
            }}
          >
            Practice
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Row
            onClick={nav.goHours}
            label="Ghi — daily journal"
            muted={t.muted}
            hoverBg={t.hover}
            glyph={
              <div
                style={{
                  width: 9,
                  height: 9,
                  border: '1px solid currentColor',
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
                    background: 'currentColor',
                  }}
                />
              </div>
            }
          />
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '0 22px', whiteSpace: 'nowrap' }}>
        <div style={{ width: 20, height: 1, background: '#EBE5D3' }} />
      </div>
    </div>
  )
}
