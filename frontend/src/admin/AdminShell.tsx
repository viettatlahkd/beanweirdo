import { createContext, useContext, useState, type CSSProperties, type ReactNode } from 'react'
import { useNav } from '../lib/nav'
import { useAuth } from '../lib/auth'
import { goToArea } from '../lib/area'
import { useIsMobile } from '../lib/useIsMobile'
import { serif } from '../design/tokens'
import { useRememberedTab } from './components/SiteTabs'
import { FramingProvider } from './components/framing'

/**
 * What Cấu hình edits, in the order the sidebar lists it. `template`, `biz` and
 * `bean` sit under port archives (owner, 2026-10-15): the templates first, then
 * each port site. practice is the journal behind the login.
 */
export const CONFIG_SITES = ['root', 'template', 'biz', 'bean', 'blog', 'practice'] as const
export type ConfigSite = (typeof CONFIG_SITES)[number]
/**
 * The port sites, in order. Each is named "port #n: <name>" by its place here
 * (owner, 2026-10-15), so a port site added to this list takes the next number
 * in the sidebar, the crumbs and everywhere a site is named, with nothing else
 * to rename.
 */
const PORT_SITES: readonly ConfigSite[] = ['biz', 'bean']
/** port archives rows: the templates, then the port sites. */
const PORT_GROUP: readonly ConfigSite[] = ['template', ...PORT_SITES]
const SITE_NAMES: Record<ConfigSite, string> = { root: 'beanweirdo', template: 'Template', biz: 'biz', bean: 'bean', blog: 'journal', practice: 'practice' }
/** Sites whose cards open under them in the sidebar; the others are one page, opened by their row. */
const WITH_CARDS: readonly ConfigSite[] = ['root', 'blog']
export const CONFIG_SITE_LABELS = Object.fromEntries(
  CONFIG_SITES.map((s) => [s, PORT_SITES.includes(s) ? `port #${PORT_SITES.indexOf(s) + 1}: ${SITE_NAMES[s]}` : SITE_NAMES[s]]),
) as Record<ConfigSite, string>

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
  /** Counts clicks on a site's row in the sidebar: a click on the open site's row goes back to that site's first page. */
  round: number
  /** Where Cấu hình draws the open site's cards, under that site in the sidebar. */
  slot: HTMLElement | null
}

const FrameContext = createContext<Frame | null>(null)

export function useAdminFrame(): Frame {
  const f = useContext(FrameContext)
  if (!f) throw new Error('useAdminFrame outside AdminShell')
  return f
}

/**
 * Biên tập: the posts and the lists that file them, four rows of one level in
 * the owner's order (2026-10-15) — Tác giả, Nội dung, Chuyên mục, Tag — under a
 * section name of their own, like Cấu hình and Hiển thị. They are not filed
 * under a site in Cấu hình: every site's posts wear them. Chuyên mục is the
 * subject › topic tree itself — added, renamed, merged away — the CMS word for
 * a hierarchical taxonomy (WordPress's Categories), beside Tag, the flat one.
 * The journal's Trang chủ lists that tree for its look; which posts a topic lists is set here.
 * The admin still opens on Nội dung (`/ad` → posts).
 */
const CONTENT_LISTS = [
  { tab: 'authors', label: 'Tác giả' },
  { tab: 'posts', label: 'Nội dung' },
  { tab: 'topics', label: 'Chuyên mục' },
  { tab: 'tags', label: 'Tag' },
] as const

/**
 * Wide enough for the longest entries (about 150px, a nested page included),
 * no wider: at 248 a third of the column was empty
 * margin on the right of every row (owner, 2026-10-15).
 */
const SIDE_W = 196

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
  const config = tab === 'pages'
  const openSite = (s: ConfigSite) => {
    setSite(s)
    if (!config) nav.goCms('pages')
  }
  const [round, setRound] = useState(0)
  const clickSite = (s: ConfigSite) => {
    setRound((r) => r + 1)
    openSite(s)
  }
  const where =
    nav.screen === 'postEdit'
      ? 'Nội dung › Sửa bài'
      : nav.screen === 'postPreview'
        ? 'Nội dung › Xem trước'
        : tab === 'posts'
          ? 'Nội dung'
          : tab === 'authors' || tab === 'topics' || tab === 'tags'
            ? CONTENT_LISTS.find((l) => l.tab === tab)?.label
            : tab === 'display'
              ? 'Cài đặt hiển thị'
              : `Cấu hình › ${PORT_GROUP.includes(site) ? 'port archives › ' : ''}${CONFIG_SITE_LABELS[site]}`

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
      <Heading>Biên tập</Heading>
      {CONTENT_LISTS.map((l) => (
        <Item
          key={l.tab}
          // Nội dung stays lit while a post is open in the editor or its preview.
          on={l.tab === 'posts' ? tab === 'posts' || nav.screen !== 'cms' : tab === l.tab && nav.screen === 'cms'}
          onClick={() => nav.goCms(l.tab)}
        >
          {l.label}
        </Item>
      ))}

      <Heading>Cấu hình</Heading>
      {CONFIG_SITES.map((s) => {
        const open = config && s === site
        const inPorts = PORT_GROUP.includes(s)
        const row = (
          <div key={s}>
            {/* Open, a site with cards lights none of itself, only its dash and name: the card picked under it is the lit row. A one-page site is the lit row. */}
            <Item depth={inPorts ? 1 : 0} open={open && WITH_CARDS.includes(s)} on={open && !WITH_CARDS.includes(s)} onClick={() => clickSite(s)}>
              {CONFIG_SITE_LABELS[s]}
            </Item>
            {open && WITH_CARDS.includes(s) && <div ref={setSlot} />}
          </div>
        )
        if (s !== PORT_GROUP[0]) return row
        // port archives: a heading row over its own rows, opening the first of them.
        return (
          <div key="ports">
            <Item open={config && PORT_GROUP.includes(site)} onClick={() => clickSite(PORT_GROUP[0])}>
              port archives
            </Item>
            {row}
          </div>
        )
      })}

      <Heading>Hiển thị</Heading>
      <Item on={tab === 'display'} onClick={() => nav.goCms('display')}>
        Cài đặt hiển thị
      </Item>

      <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Item bare onClick={() => goToArea('practice', 'hours')}>
          Mở practice ↗
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
    <FrameContext.Provider value={{ site, openSite, slot, round }}>
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
