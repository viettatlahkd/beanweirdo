import type { CSSProperties, ReactNode } from 'react'
import { NAV, TEMPLATES_HEAD, type Glyph, type NavItem } from '../content/navItems'
import type { NavGroup } from '../content/site'
import { useModules, type ModuleRow } from '../data/useModules'
import { usePublishedPosts, type PostRow } from '../data/usePublishedPosts'
import { useSiteCopy } from '../data/useSiteCopy'
import { layout, paper, sans, serif } from '../design/tokens'
import { areaOfGroup, goToArea, visibleGroups } from '../lib/area'
import { useAuth } from '../lib/auth'
import { Hover, useHover } from '../lib/Hover'
import { useNav, type Nav } from '../lib/nav'

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

/** An open bracket — the one row that leads out rather than in. */
const SIGN_OUT_GLYPH: Glyph = {
  w: '9px',
  h: '10px',
  r: '0',
  bd: '1px solid currentColor',
  brw: '0',
  bbw: '1px',
  bg: 'transparent',
  tf: 'none',
}

/**
 * The sidebar carries its own two-tone theme: cream everywhere except on
 * Ghi 01/Ghi 02 (Notes/Hours), where it goes dark navy to match those screens'
 * own visual language. Every glyph below draws in `currentColor` so it repaints
 * for free when the row's text color swaps.
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

/** A nav glyph rendered from its border/background spec. */
function Mark({ shape }: { shape: Glyph }) {
  return (
    <div
      style={{
        width: shape.w,
        height: shape.h,
        borderRadius: shape.r,
        border: shape.bd,
        borderRightWidth: shape.brw,
        borderBottomWidth: shape.bbw,
        background: shape.bg,
        transform: shape.tf,
      }}
    />
  )
}

function Row({
  glyph,
  label,
  count,
  sub,
  muted,
  hoverBg,
  onClick,
}: {
  glyph: ReactNode
  label: string
  count?: ReactNode
  /** Template pages sit one level in, marked by a short dash instead of a glyph. */
  sub?: boolean
  muted: string
  hoverBg: string
  onClick: () => void
}) {
  return (
    <Hover style={{ ...row, color: muted }} hoverStyle={{ background: hoverBg }} onClick={onClick}>
      <div style={glyphSlot}>{sub ? null : glyph}</div>
      <div
        style={{
          fontSize: 13,
          display: 'flex',
          alignItems: 'baseline',
          gap: 9,
          ...(count !== undefined ? { flex: 1 } : null),
        }}
      >
        {sub && (
          <div
            style={{
              width: 9,
              height: 1,
              background: 'currentColor',
              opacity: 0.5,
              flex: 'none',
              marginBottom: 4,
            }}
          />
        )}
        <div>{label}</div>
      </div>
      {count !== undefined && (
        <div style={{ fontFamily: sans, fontSize: 10, color: '#B5AE99', paddingRight: 18 }}>
          {count}
        </div>
      )}
    </Hover>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
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
        {children}
      </div>
    </div>
  )
}

/**
 * Where a nav item lands. Items belonging to another area leave this app
 * entirely — each area is its own entry point with its own auth check.
 */
function go(nav: Nav, item: NavItem): () => void {
  const target = areaOfGroup(item.group)
  if (target !== nav.area) return () => goToArea(target, item.key)

  switch (item.screen) {
    case 'landing':
      return nav.goLanding
    case 'home':
      return nav.goHome
    case 'notes':
      return nav.goNotes
    case 'hours':
      return nav.goHours
    case 'cms':
      return nav.goCms
    case 'art':
      return nav.goArt
    case 'logic':
      return nav.goLogic
    case 'archive':
      return nav.goArchive
    case 'article':
      return () => nav.openArticle(undefined, 'admin')
    case 'report':
      return () => nav.goReport('admin')
    case 'cards':
      return () => nav.goCards('admin')
    default:
      return nav.goLanding
  }
}

/**
 * The only navigation in the app. It sits at 64px — a margin rather than a
 * panel — and opens to 268px on hover, floating a sheet over the page.
 *
 * Three sections: Public (the reader's site, with the modules inline), Practice
 * (the personal journal), and Admin (the backend surfaces plus the three blank
 * templates). The section names are renameable from the CMS site map.
 */
export function Sidebar() {
  const nav = useNav()
  const { on, bind } = useHover()
  const { data: modules } = useModules()
  const { data: posts } = usePublishedPosts()
  const { site } = useSiteCopy()
  const { authed, signOut } = useAuth()
  const dark = nav.screen === 'notes' || nav.screen === 'hours'
  const t = theme(dark)
  const groups = visibleGroups(nav.area, authed)

  const countFor = (m: ModuleRow) => posts.filter((p: PostRow) => p.module_id === m.id).length

  const section = (group: NavGroup) => {
    const items = NAV.filter((n) => n.group === group)
    const rows: ReactNode[] = []
    let templatesEmitted = false

    for (const item of items) {
      // The modules sit between "Mục lục" and "Ghi 01" in Public.
      if (group === 'Public' && item.key === 'notes') {
        // Every module is listed, published or not: the sidebar is the map of
        // what the journal covers, and a module with nothing in it yet is still
        // part of that map. The count beside it tells the truth.
        for (const m of modules) {
          rows.push(
            <Row
              key={`mod-${m.id}`}
              onClick={() => nav.openModule(m.id)}
              label={m.title}
              count={countFor(m)}
              muted={t.muted}
              hoverBg={t.hover}
              glyph={
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.accent }} />
              }
            />,
          )
        }
      }

      if (item.sub && !templatesEmitted) {
        templatesEmitted = true
        const first = items.find((x) => x.sub)
        rows.push(
          <Row
            key="templates-head"
            onClick={first ? go(nav, first) : nav.goLanding}
            label={TEMPLATES_HEAD.label}
            muted={t.muted}
            hoverBg={t.hover}
            glyph={<Mark shape={TEMPLATES_HEAD.shape} />}
          />,
        )
      }

      rows.push(
        <Row
          key={item.key}
          onClick={go(nav, item)}
          label={item.label}
          sub={item.sub}
          muted={t.muted}
          hoverBg={t.hover}
          glyph={<Mark shape={item.shape} />}
        />,
      )
    }

    return rows
  }

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
        overflowX: 'hidden',
        // The Admin section makes the list taller than the shortest laptop.
        overflowY: 'auto',
        scrollbarWidth: 'none',
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
        <div style={{ fontFamily: serif, fontSize: 23, letterSpacing: '-.01em' }}>
          be
          <span
            style={{
              display: 'inline-block',
              transform: 'scale(1.3)',
              transformOrigin: '50% 82%',
              color: '#F2A0A5',
              margin: '0 -.02em',
            }}
          >
            ӕ
          </span>
          n weirdo
        </div>
      </div>

      <div style={{ height: 1, background: t.rule, margin: '0 0 20px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <SectionLabel>{site.sections.Public}</SectionLabel>
        {section('Public')}
      </div>

      {/* Practice and Admin never appear on the public journal, signed in or
          not — the public site must look the same to everyone. They show only
          once you are inside a private area, where they are the way across.
          The pages themselves are guarded by their own URL and auth check;
          this only decides what is on offer. */}
      {groups.includes('Admin') && (
        <>
          <div style={{ margin: '16px 0 0' }}>
            <div style={{ height: 1, background: t.rule, marginBottom: 10 }} />
            <SectionLabel>{site.sections.Practice}</SectionLabel>
            {section('Practice')}
          </div>

          <div style={{ margin: '16px 0 0' }}>
            <div style={{ height: 1, background: t.rule, marginBottom: 10 }} />
            <SectionLabel>{site.sections.Admin}</SectionLabel>
            {section('Admin')}
          </div>

          <div style={{ margin: '16px 0 0' }}>
            <div style={{ height: 1, background: t.rule, marginBottom: 10 }} />
            <Row
              onClick={() => {
                signOut()
                goToArea('public')
              }}
              label="Đăng xuất"
              muted={t.muted}
              hoverBg={t.hover}
              glyph={<Mark shape={SIGN_OUT_GLYPH} />}
            />
          </div>
        </>
      )}
    </div>
  )
}
