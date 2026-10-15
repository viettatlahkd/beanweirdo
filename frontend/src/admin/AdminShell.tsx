import { createContext, useContext, useState, type CSSProperties, type ReactNode } from 'react'
import { useNav } from '../lib/nav'
import { useAuth } from '../lib/auth'
import { goToArea } from '../lib/area'
import { useIsMobile } from '../lib/useIsMobile'
import { serif } from '../design/tokens'
import { useRememberedTab } from './components/SiteTabs'
import { FramingProvider } from './components/framing'

/** The four sites Cấu hình edits, in the order the sidebar lists them. */
export const CONFIG_SITES = ['root', 'biz', 'bean', 'blog'] as const
export type ConfigSite = (typeof CONFIG_SITES)[number]
export const CONFIG_SITE_LABELS: Record<ConfigSite, string> = { root: 'beanweirdo', biz: 'biz', bean: 'bean', blog: 'journal' }

/**
 * The admin's colours and type, in one place so a palette is one edit. Owner
 * picked frame B (a Notion sidebar), then on 2026-10-15 the white palette,
 * Inter at 13px, plain indents and dashes for bullets. `on` is a picked row.
 */
const SHELL = {
  side: '#FFFFFF',
  sideLine: '#E8EAED',
  sideInk: '#1F2328',
  sideMuted: '#8A9099',
  sideOn: '#EEF4EA',
  sideHover: '#F5F6F7',
  accent: '#3E7A4E',
  main: '#FAFAF8',
  muted: '#8C8674',
  font: "'Inter', system-ui, sans-serif",
  size: 13,
} as const

type Frame = {
  site: ConfigSite
  openSite: (s: ConfigSite) => void
  /** Where Cấu hình draws the open site's cards, under that site in the sidebar. */
  slot: HTMLElement | null
}

const FrameContext = createContext<Frame | null>(null)

export function useAdminFrame(): Frame {
  const f = useContext(FrameContext)
  if (!f) throw new Error('useAdminFrame outside AdminShell')
  return f
}

const SIDE_W = 248

/**
 * The back office's one frame: a sidebar holding every place to work
 * (Nội dung, the four sites of Cấu hình with the open one's cards, Cài đặt
 * hiển thị), and the work itself on the right: those screens, the post
 * editor and a post's preview. It replaces the public site's rail and the old
 * blue "Content" band.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const nav = useNav()
  const mobile = useIsMobile()
  const { signOut } = useAuth()
  const [site, setSite] = useRememberedTab('beanweirdo.config.tab', CONFIG_SITES)
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  const tab = nav.cmsTab
  const config = tab === 'pages' || tab === 'authors'
  const openSite = (s: ConfigSite) => {
    setSite(s)
    if (!config) nav.goCms('pages')
  }
  const where = nav.screen === 'postEdit' ? 'Nội dung › Sửa bài' : nav.screen === 'postPreview' ? 'Nội dung › Xem trước' : tab === 'posts' ? 'Nội dung' : tab === 'display' ? 'Cài đặt hiển thị' : `Cấu hình › ${CONFIG_SITE_LABELS[site]}`

  const side = (
    <aside
      aria-label="Quản trị"
      style={{
        background: SHELL.side,
        color: SHELL.sideInk,
        borderRight: `1px solid ${SHELL.sideLine}`,
        fontFamily: SHELL.font,
        fontSize: SHELL.size,
        fontWeight: 400,
        padding: '18px 12px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        ...(mobile ? {} : { position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }),
      }}
    >
      <a href="/" style={{ fontFamily: serif, fontSize: 20, color: SHELL.sideInk, textDecoration: 'none', padding: '2px 10px 16px' }}>
        bæn. <span style={{ fontFamily: SHELL.font, fontSize: SHELL.size, color: SHELL.sideMuted }}>quản trị</span>
      </a>
      <Item on={tab === 'posts' || nav.screen !== 'cms'} onClick={() => nav.goCms('posts')}>
        Nội dung
      </Item>

      <Heading>Cấu hình</Heading>
      {CONFIG_SITES.map((s) => {
        const open = config && s === site
        return (
          <div key={s}>
            {/* Open, the site lights none of itself, only its dash and name: the card picked under it is the lit row. */}
            <Item open={open} onClick={() => openSite(s)}>
              {CONFIG_SITE_LABELS[s]}
            </Item>
            {open && <div ref={setSlot} />}
          </div>
        )
      })}

      <Heading>Hiển thị</Heading>
      <Item on={tab === 'display'} onClick={() => nav.goCms('display')}>
        Cài đặt hiển thị
      </Item>

      <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Item bare onClick={() => goToArea('practice', 'hours')}>
          Mở nhật ký Ghi 02 ↗
        </Item>
        <Item
          bare
          onClick={() => {
            signOut()
            goToArea('public')
          }}
        >
          Đăng xuất
        </Item>
      </div>
    </aside>
  )

  return (
    <FrameContext.Provider value={{ site, openSite, slot }}>
      <div style={mobile ? undefined : { display: 'grid', gridTemplateColumns: `${SIDE_W}px minmax(0, 1fr)`, minHeight: '100vh' }}>
        {side}
        <main style={{ background: SHELL.main, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 28px', fontFamily: SHELL.font, fontSize: 12.5, color: SHELL.muted }}>
            <span>Quản trị › {where}</span>
            <a href="/" target="_blank" rel="noreferrer" style={{ color: SHELL.muted }}>
              Xem site ↗
            </a>
          </div>
          {/*
            One crop dialog for the whole back office, not one per screen: the
            owner wants every picture slot — post, Cấu hình, author — to open
            the same dialog, and a single provider cannot drift.
          */}
          <FramingProvider>{children}</FramingProvider>
        </main>
      </div>
    </FrameContext.Provider>
  )
}

/**
 * A row of the sidebar, led by a dash. Cấu hình's cards use it too, so every
 * row in it looks alike. `open` is a site whose cards hang under it; `bare`
 * rows (the way out) carry no dash.
 */
export function Item({
  on = false,
  open = false,
  bare = false,
  onClick,
  depth = 0,
  children,
  ...rest
}: { on?: boolean; open?: boolean; bare?: boolean; onClick: () => void; depth?: number; children: ReactNode } & Record<`data-${string}`, string>) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      {...rest}
      aria-current={on || undefined}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...row,
        paddingLeft: 10 + depth * 16,
        background: on ? SHELL.sideOn : hover ? SHELL.sideHover : 'transparent',
        fontWeight: on || open ? 500 : 400,
        color: bare ? SHELL.sideMuted : SHELL.sideInk,
      }}
    >
      {!bare && (
        <span aria-hidden style={{ width: 10, flex: 'none', color: on || open ? SHELL.accent : SHELL.sideMuted }}>
          –
        </span>
      )}
      {children}
    </button>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '.07em', textTransform: 'uppercase', color: SHELL.sideMuted, margin: '18px 10px 4px' }}>{children}</div>
}

const row: CSSProperties = {
  all: 'unset',
  boxSizing: 'border-box',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 28,
  padding: '0 10px',
  borderRadius: 6,
  cursor: 'pointer',
  color: SHELL.sideInk,
  fontFamily: SHELL.font,
  fontSize: SHELL.size,
  lineHeight: 1.35,
}
