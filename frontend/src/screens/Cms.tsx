import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { NAV } from '../content/navItems'
import { displayNumber } from '../lib/postText'
import { onlyLive, orderPosts } from '../lib/postOrder'
import { resolveSite, SITE_DEFAULTS, type NavGroup, type SiteCopy, type SiteOverrides } from '../content/site'
import {
  createModule,
  deleteModule,
  listModules,
  listPosts,
  reorderModules,
  reorderPosts,
  updateModule,
  updatePost,
  updateSite,
  uploadImage,
  type Module,
  type PostSummary,
} from '../admin/lib/apiClient'
import { transitionStatus, getSite, listTemplates, type TemplateSummary } from '../admin/lib/apiClient'
import { PostsPanel } from '../admin/components/PostsPanel'
import { ModuleImages } from '../admin/components/ModuleImages'
import { captionColumn, formShapeOf, imageColumn } from '../admin/moduleForm'
import { FocusPicker } from '../admin/components/FocusPicker'
import { coverStyle } from '../lib/imageFocus'
import { useSlotSwap, type SlotSwap } from '../admin/lib/useSlotSwap'
import { FeatureCellsEditor } from '../admin/components/FeatureCellsEditor'
import type { FeatureOverride } from '../content/notes'
import { ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav } from '../lib/nav'

const sectionHead: CSSProperties = {
  fontFamily: sans,
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: ink.muted,
  borderBottom: `2px solid ${ink.base}`,
  paddingBottom: 9,
  marginBottom: 18,
}

const fieldLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: ink.faint,
  marginBottom: 6,
}

const boxed: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 13,
  padding: '9px 12px',
  outline: 'none',
}

const serifInput: CSSProperties = { ...boxed, fontFamily: serif, fontSize: 22 }
const serifItalicInput: CSSProperties = { ...serifInput, fontStyle: 'italic', color: ink.green }
const area: CSSProperties = {
  ...boxed,
  fontWeight: 300,
  fontSize: 13.5,
  lineHeight: 1.5,
  padding: '10px 12px',
  resize: 'vertical',
}

const grid = (columns: string, marginBottom = 14): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gap: 22,
  marginBottom,
})

const one = 'minmax(0,1fr)'
const two = 'minmax(0,1fr) minmax(0,1fr)'
const three = 'repeat(3,minmax(0,1fr))'

/**
 * Fields are sized by what they hold, not by dividing the row evenly. A colour
 * is seven characters and a layout is one of three words, so both stay narrow
 * and the name takes the slack; a sentence gets its own full-width row.
 */
const nameRow = 'minmax(0,1fr) 112px 124px 128px'
const nameRowPlain = 'minmax(0,1fr) 112px'

/**
 * What a module row counts.
 *
 * Ghi 02 keeps daily ticks, not posts, so counting posts there would always
 * read zero and mean nothing. Everywhere else the count is posts — and an
 * empty module still appears on the site, so saying otherwise was wrong:
 * group 05 has it that a created public module always shows.
 */
function countLabel(id: string, live: number): string {
  if (id === 'ghi02') return 'checkbox hàng ngày'
  // Counting every post a module ever had said "6 bài" for a module with
  // nothing on the site at all.
  return live ? `${live} bài` : 'chưa có bài nào trên trang'
}

/** The three tabs, named once so the site map and the tab bar cannot drift. */
const TABS = [
  { k: 'posts', t: 'Tạo bài đăng' },
  { k: 'map', t: 'Sơ đồ trang' },
  { k: 'content', t: 'Sửa nội dung' },
] as const

/** One page on the site map, and what it holds. */
type MapRow = { label: string; desc: string; kids: string[] }

/** Names where a field turns up on the site — identification, not instruction. */
function Where({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        letterSpacing: '.04em',
        textTransform: 'none',
        fontStyle: 'italic',
        opacity: 0.85,
      }}
    >
      {' · '}
      {children}
    </span>
  )
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      {children}
    </div>
  )
}

/**
 * Caption + optional photo for one image slot. The caption always exists (it
 * describes what the slot wants); the photo replaces the tinted placeholder on
 * the public screens once uploaded.
 */
type SlotDragProps = ReturnType<SlotSwap['slotProps']> & {
  marked?: boolean
  /** Chỗ để cầm — ô nhập chú thích nuốt cú nhấn giữ, tay nắm thì không. */
  handle?: ReturnType<SlotSwap['handleProps']>
}

function ImageSlot({
  label,
  caption,
  url,
  onCaption,
  onUpload,
  onClear,
  onPlace,
  ratio,
  drag,
}: {
  label: string
  caption: string
  url: string | null
  onCaption: (v: string) => void
  /** Uploads and returns the stored URL, so the frame can be set straight away. */
  onUpload: (f: File) => Promise<string | null>
  onClear: () => void
  /** The same photo, carrying a focal point. */
  onPlace: (url: string) => void
  /** Width ÷ height of the frame this photo fills on the public page. */
  ratio: number
  /** Kéo sang khung khác để hai ảnh đổi chỗ. */
  drag?: SlotDragProps
}) {
  const [placing, setPlacing] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const { marked, handle, ...dragProps } = drag ?? { marked: false, handle: undefined }
  return (
    <div {...dragProps} style={{ outline: marked ? `2px solid ${ink.base}` : undefined, outlineOffset: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {handle && (
          <div
            {...handle}
            title="Kéo sang khung khác để đổi chỗ hai ảnh"
            aria-label={`kéo ${label} sang khung khác`}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 1,
              color: ink.faint,
              cursor: 'grab',
              userSelect: 'none',
            }}
          >
            ⠿
          </div>
        )}
        <div style={fieldLabel}>{label}</div>
      </div>
      {/*
        * Ghi khi rời ô, không phải từng phím — như mọi ô chữ khác trên màn này.
        * Ghi từng phím nghĩa là mỗi ký tự xoá đi là một lượt lưu, và ô nhấp
        * nháy theo từng nhịp bàn phím.
        */}
      <input
        defaultValue={caption}
        key={caption}
        onBlur={(e) => onCaption(e.target.value)}
        style={{ ...boxed, padding: '8px 11px' }}
      />
      {url ? (
        <div
          style={{
            marginTop: 7,
            aspectRatio: '16/9',
            ...coverStyle(url),
            border: `1px solid ${paper.rule}`,
          }}
        />
      ) : (
        <div
          style={{
            marginTop: 7,
            aspectRatio: '16/9',
            border: `1px solid ${paper.rule}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint }}>chưa có ảnh</div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
        <Hover
          as="label"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'block',
            fontFamily: sans,
            fontSize: 10,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: ink.soft,
            border: '1px dashed #DAD7C7',
            padding: '7px 10px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
          hoverStyle={{ borderColor: ink.base, color: ink.base }}
        >
          {url ? 'đổi ảnh' : 'tải ảnh lên'}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
            style={{ display: 'none' }}
          />
        </Hover>
        {url && (
          <Hover
            as="button"
            onClick={() => setPlacing(url)}
            style={{
              fontFamily: sans,
              fontSize: 10,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: ink.soft,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              flex: 'none',
            }}
            hoverStyle={{ color: ink.base }}
          >
            đặt vào khung
          </Hover>
        )}
        <Hover
          as="button"
          onClick={() => setLinking(!linking)}
          style={{
            fontFamily: sans,
            fontSize: 10,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: ink.soft,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            flex: 'none',
          }}
          hoverStyle={{ color: ink.base }}
        >
          dán link
        </Hover>
        {url && (
          <Hover
            onClick={onClear}
            style={{ fontFamily: sans, fontSize: 11, color: ink.faint, cursor: 'pointer', flex: 'none' }}
            hoverStyle={{ color: '#C25C7C' }}
          >
            ✕
          </Hover>
        )}
      </div>

      {linking && (
        /*
         * Ảnh có thể nằm ở nơi khác. Lưu đường dẫn thay vì bản sao thì không
         * để lại trong kho thứ không cần ở đó — đổi lại, ảnh chỉ bền bằng chỗ
         * đang giữ nó.
         */
        <input
          autoFocus
          defaultValue={url ?? ''}
          placeholder="dán link ảnh rồi Enter"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLinking(false)
            if (e.key !== 'Enter') return
            const v = (e.target as HTMLInputElement).value.trim()
            setLinking(false)
            if (!v) return onClear()
            onPlace(v)
            setPlacing(v)
          }}
          onBlur={() => setLinking(false)}
          style={{ ...boxed, padding: '7px 10px', marginTop: 7, fontSize: 12 }}
        />
      )}

      {placing && (
        <FocusPicker
          url={placing}
          ratio={ratio}
          name={label}
          onCancel={() => setPlacing(null)}
          onSave={(next) => {
            onPlace(next)
            setPlacing(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Content management — the site's own back office.
 *
 * Three tabs. "Tạo bài đăng" is where everything written is written — posts
 * under modules and Ghi 01 notes alike, one list, because a note is a kind of
 * entry rather than a separate thing to administer.
 * "Sơ đồ trang" is a read-through map of every page in the sidebar, where the
 * three section names are editable in place. "Sửa nội dung" edits the site
 * copy, the three opening plates, and every module: its colours, its layout,
 * its image slots, and its list of posts (drag to reorder, which renumbers
 * them server-side).
 *
 * Everything saves on blur — there is no page-level save button (System
 * conventions, rule 08).
 */
export function Cms() {
  const nav = useNav()
  const [tab, setTab] = useState<'posts' | 'map' | 'content'>('posts')
  const [site, setSite] = useState<SiteOverrides>({})
  const [modules, setModules] = useState<Module[]>([])
  // The site map names what Templates holds, so it has to know.
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [dragModule, setDragModule] = useState<string | null>(null)
  const [overModule, setOverModule] = useState<string | null>(null)
  const [dragEntry, setDragEntry] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, m, p, t] = await Promise.all([getSite(), listModules(), listPosts('all'), listTemplates()])
      setSite(s)
      setModules(m)
      setTemplates(t)
      setPosts(p)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /*
   * Cùng một hàm trang công khai dùng. Màn này từng giữ phép hoà riêng của nó,
   * và đó là lý do sửa được một chỗ mà lỗi vẫn còn: ba bản sao của một luật.
   */
  const copy = useMemo(() => resolveSite(site), [site])

  async function saveSite(patch: SiteOverrides) {
    setSite((s) => ({ ...s, ...patch, sections: { ...s.sections, ...patch.sections } }))
    try {
      setSite(await updateSite(patch))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const setCopy = (key: keyof SiteCopy) => (v: string) => void saveSite({ [key]: v } as SiteOverrides)

  /*
   * Mỗi ô chữ lưu cả khi đang gõ, không chỉ khi rời ô.
   *
   * Chỉ lưu khi rời ô là một cái bẫy im lặng: gõ xong rồi tải lại trang, hoặc
   * đóng tab, hoặc bấm sang tab khác — ô vừa gõ chưa hề được lưu, và không có
   * gì trên màn hình cho biết. Chủ site soạn xong cả trang rồi mất sạch đúng vì
   * chuyện này.
   *
   * Chờ một nhịp ngắn sau khi ngừng gõ để không gửi một lượt lưu cho mỗi ký tự.
   */
  const pending = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const queueCopy = (key: keyof SiteCopy, v: string) => {
    clearTimeout(pending.current[key])
    pending.current[key] = setTimeout(() => setCopy(key)(v), 700)
  }

  /*
   * Chữ đang gõ dở, đè lên chữ lấy từ máy chủ.
   *
   * Ô nhập trước đây là `defaultValue` — React chỉ đọc nó đúng một lần, lúc ô
   * được vẽ ra. Biểu mẫu này vẽ ngay khi mở màn, còn nội dung thật thì về sau
   * một nhịp mạng, nên mọi ô đứng nguyên ở chữ mặc định trong mã: trang công
   * khai hiện bản mới, CMS hiện bản cũ, và không ô nào sai chính tả để mà ngờ.
   *
   * Nên ô đọc thẳng từ `copy`, và chỉ khi người dùng đang gõ thì bản nháp mới
   * đè lên — đè để con trỏ không nhảy về đầu dòng mỗi lượt lưu tự động.
   */
  const [draft, setDraft] = useState<Partial<Record<keyof SiteCopy, string>>>({})
  const dropDraft = (key: keyof SiteCopy) =>
    setDraft((d) => {
      const next = { ...d }
      delete next[key]
      return next
    })

  /** Cả hai lối lưu cho một ô: nhịp ngắn khi đang gõ, và ngay khi rời ô. */
  const field = (key: keyof SiteCopy) => ({
    value: draft[key] ?? (copy[key] as string),
    onChange: (e: { target: { value: string } }) => {
      setDraft((d) => ({ ...d, [key]: e.target.value }))
      queueCopy(key, e.target.value)
    },
    onBlur: (e: { target: { value: string } }) => {
      clearTimeout(pending.current[key])
      setCopy(key)(e.target.value)
      dropDraft(key)
    },
  })

  /*
   * Kéo một ảnh sang khung khác thì hai bên đổi chỗ, và chú thích đi theo ảnh
   * của nó. Trước đó đổi thứ tự nghĩa là xoá rồi tải lại từng cái — mỗi lần
   * như vậy mất luôn chú thích và điểm căn khung đã chỉnh.
   */
  const plateSwap = useSlotSwap((a, b) => {
    const at = (slot: number) => ({
      caption: copy[`plate${slot as 1 | 2 | 3}` as const],
      url: copy[`plateImg${slot as 1 | 2 | 3}` as const],
    })
    const [one, two] = [at(a), at(b)]
    void saveSite({
      [`plate${a}`]: two.caption,
      [`plateImg${a}`]: two.url,
      [`plate${b}`]: one.caption,
      [`plateImg${b}`]: one.url,
    } as SiteOverrides)
  })

  async function savePlate(slot: 1 | 2 | 3 | 4, file: File): Promise<string | null> {
    try {
      const { url } = await uploadImage(file)
      await saveSite({ [`plateImg${slot}`]: url } as SiteOverrides)
      return url
    } catch (e) {
      setError((e as Error).message)
      return null
    }
  }

  async function patchModule(id: string, patch: Partial<Module>) {
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    try {
      await updateModule(id, patch)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function dropModule(targetId: string) {
    const src = dragModule
    setDragModule(null)
    setOverModule(null)
    if (!src || src === targetId) return
    const order = modules.map((m) => m.id)
    const i = order.indexOf(src)
    const j = order.indexOf(targetId)
    if (i < 0 || j < 0) return
    order.splice(j, 0, order.splice(i, 1)[0])
    setModules(order.map((id) => modules.find((m) => m.id === id)!))
    try {
      setModules(await reorderModules(order))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /**
   * A module's posts, in the order the site shows them.
   *
   * This used to sort by `sort_order` alone. With every value null — which is
   * the normal state, since a number there means somebody dragged the post
   * somewhere — the sort changed nothing and the list stayed in the API's
   * order, `updated_at`, most recently edited first. So the numbers 01…06 named
   * an order the site never used, and the drag handle rearranged a list that
   * did not match the page it was arranging.
   */
  const postsOf = (module_id: string) =>
    orderPosts(posts.filter((p) => p.module_id === module_id))

  /**
   * The posts a reader can actually see in this module.
   *
   * The editor listed every post a module had ever had — drafts, archived,
   * deleted — and numbered them 01…06 as if that were their running order on
   * the site. It was not: sensory had one post published and five archived, and
   * roasting had none at all while the editor said "6 bài". So the numbers named
   * places no reader would ever count to, and the drag handle rearranged
   * archived posts in among live ones.
   */
  const liveOf = (module_id: string) => onlyLive(postsOf(module_id))

  async function patchPost(id: string, patch: { en?: string; vi?: string; date_label?: string }) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    try {
      await updatePost(id, patch)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function dropEntry(module_id: string, targetId: string) {
    const src = dragEntry
    setDragEntry(null)
    if (!src || src === targetId) return
    // Only the posts on the page can be arranged, and only they are given a
    // `sort_order` — the column means "the owner put this here", so writing it
    // on an archived post would claim a placement nobody made.
    const order = liveOf(module_id).map((p) => p.id)
    const i = order.indexOf(src)
    const j = order.indexOf(targetId)
    if (i < 0 || j < 0) return
    order.splice(j, 0, order.splice(i, 1)[0])
    try {
      const updated = await reorderPosts(module_id, order)
      setPosts((ps) => ps.filter((p) => p.module_id !== module_id).concat(updated))
    } catch (e) {
      setError((e as Error).message)
    }
  }


  async function removeEntry(id: string) {
    try {
      await transitionStatus(id, 'delete')
      setPosts((ps) => ps.filter((p) => p.id !== id))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /**
   * What an admin page holds, for the pages that hold something nameable.
   *
   * Content management holds its own three tabs; Templates holds the templates
   * stored in the database, so adding one shows up here without anyone editing
   * this list. The rest hold rules and reference, which the page itself is
   * better at showing than a map row would be.
   */
  function childrenOf(key: string): string[] {
    if (key === 'cms') return TABS.map((t) => t.t)
    if (key === 'templates') return templates.map((t) => `${t.name} · ${t.renderer}`)
    return []
  }

  /**
   * The site map: every page, and what each one actually holds.
   *
   * It used to be assembled from two sources that disagreed. Ghi 01 and Ghi 02
   * are modules *and* nav entries, so each was listed twice — once with the
   * hand-typed name from `navItems.ts`, once with the real one from the
   * database — and Ghi 02, which is private, turned up under Public as well as
   * Practice. A page that is a module now names itself from that module and
   * carries its posts; a module with a page of its own is not listed again.
   *
   * Rows the admin cannot open do not belong on a map of the site, and rows
   * that hold something say what they hold, so nothing here is written by hand
   * twice.
   */
  const tree: { group: NavGroup; color: string; rows: MapRow[] }[] = (
    [
      { group: 'Public', color: ink.green },
      { group: 'Practice', color: '#C25C7C' },
      { group: 'Admin', color: '#6FA8C0' },
    ] as { group: NavGroup; color: string }[]
  ).map((g) => {
    const rows: MapRow[] = []
    // Modules that a nav entry already speaks for — listing them again is the
    // duplicate this map used to show.
    const spokenFor = new Set(NAV.map((n) => n.moduleId).filter(Boolean) as string[])

    for (const item of NAV.filter((n) => n.group === g.group && !n.hiddenFromSidebar)) {
      // Reading modules sit under Trang chủ, the gallery that shows them.
      if (g.group === 'Public' && item.key === 'notes') {
        for (const m of modules.filter((x) => !spokenFor.has(x.id))) {
          rows.push({
            label: m.title,
            desc: m.concept ? `module · ${m.concept}` : 'module',
            kids: liveOf(m.id).map((p, i) => `${displayNumber(i)} · ${p.en}`),
          })
        }
      }

      const m = item.moduleId ? modules.find((x) => x.id === item.moduleId) : undefined
      rows.push({
        // The database wins where it has something to say; the nav entry is the
        // fallback for a module that has not loaded or does not exist yet.
        label: m?.title ?? item.label,
        desc: m?.concept ? `module · ${m.concept}` : item.desc,
        // A site map shows the site: a post nobody can read is not on it.
        kids: m
          ? liveOf(m.id).map((p, i) => `${displayNumber(i)} · ${p.en}`)
          : childrenOf(item.key),
      })
    }
    return { ...g, rows }
  })

  const postCount = posts.length

  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: '#DDEBF0', color: '#0E2C38', padding: '44px 56px 30px' }}>
        <Breadcrumbs style={{ opacity: 0.75 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 44,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: serif,
                fontWeight: 400,
                fontSize: 70,
                lineHeight: 1,
                letterSpacing: '-.04em',
                margin: 0,
              }}
            >
              {copy.cmsTitle}
            </h1>
            <div
              style={{
                fontFamily: sans,
                fontWeight: 300,
                fontSize: 13.5,
                lineHeight: 1.5,
                marginTop: 10,
                maxWidth: 430,
                opacity: 0.85,
              }}
            >
              {copy.cmsIntro}
            </div>
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              opacity: 0.7,
              paddingBottom: 8,
            }}
          >
            {modules.length} module · {postCount} bài
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginTop: 26 }}>
          {TABS.map((x) => (
            <div
              key={x.k}
              onClick={() => setTab(x.k)}
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                padding: '10px 18px',
                cursor: 'pointer',
                background: tab === x.k ? ink.base : 'transparent',
                color: tab === x.k ? paper.cream : ink.soft,
              }}
            >
              {x.t}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FBE7E5',
            color: '#8E1E42',
            fontFamily: sans,
            fontSize: 12.5,
            padding: '10px 56px',
          }}
        >
          {error}
        </div>
      )}

      {tab === 'posts' && (
        <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
          <PostsPanel onChanged={() => void load()} />
        </div>
      )}

      {tab === 'map' && (
        <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
          {tree.map((g) => (
            <div key={g.group} style={{ marginBottom: 40 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderBottom: `2px solid ${ink.base}`,
                  paddingBottom: 9,
                  marginBottom: 6,
                }}
              >
                <div style={{ width: 9, height: 9, background: g.color }} />
                <input
                  value={copy.sections[g.group]}
                  onChange={(e) =>
                    setSite((s) => ({ ...s, sections: { ...s.sections, [g.group]: e.target.value } }))
                  }
                  onBlur={(e) => void saveSite({ sections: { [g.group]: e.target.value } })}
                  title="Tên section — đồng bộ với sidebar"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 0,
                    outline: 'none',
                    color: ink.base,
                    fontFamily: sans,
                    fontSize: 10.5,
                    fontWeight: 500,
                    letterSpacing: '.2em',
                    textTransform: 'uppercase',
                    padding: '0 0 1px',
                  }}
                />
              </div>
              {g.rows.map((r, i) => (
                <div key={`${r.label}-${i}`} style={{ borderBottom: '1px solid #F0EBDB', padding: '11px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 21,
                        lineHeight: 1.1,
                        letterSpacing: '-.02em',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {r.label}
                    </div>
                    <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 12, color: ink.muted }}>
                      {r.desc}
                    </div>
                  </div>
                  {r.kids.map((k, ki) => (
                    <div
                      key={ki}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        padding: '4px 0 4px 26px',
                        borderLeft: `1px solid ${paper.rule}`,
                        margin: '4px 0 0 6px',
                        fontFamily: sans,
                        fontWeight: 300,
                        fontSize: 12.5,
                        color: ink.soft,
                      }}
                    >
                      {k}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'content' && (
        <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
          <div style={sectionHead}>Trang chủ — landing</div>
          <div style={grid(two)}>
            <Field label="Nhãn trên cùng">
              <input
                {...field('lEyebrow')}
                style={boxed}
              />
            </Field>
            <Field label="Nhãn xem mục lục">
              <input {...field('lCta')} style={boxed} />
            </Field>
            <Field
              label={
                <>
                  Tên lớn — dòng 1 · chữ <span style={{ color: '#F2A0A5' }}>ӕ</span> phóng to màu hồng
                </>
              }
            >
              <input
                {...field('lTitle1')}
                style={serifInput}
              />
            </Field>
            <Field label="Tên lớn — dòng 2 (nghiêng, xanh)">
              <input
                {...field('lTitle2')}
                style={serifItalicInput}
              />
            </Field>
            <Field label="Đoạn dẫn — cột 1">
              <textarea
                {...field('lIntro1')}
                rows={4}
                style={area}
              />
            </Field>
            <Field label="Đoạn dẫn — cột 2">
              <textarea
                {...field('lIntro2')}
                rows={4}
                style={area}
              />
            </Field>
          </div>

          {/*
            * Trang Ghi chép và trang Lưu trữ.
            *
            * Năm dòng của trang Ghi chép từng nằm cứng trong mã, còn hai dòng
            * của trang Lưu trữ thì có trong dữ liệu nhưng chưa bao giờ có ô để
            * sửa — khai ra rồi bỏ đó cũng là không sửa được.
            */}
          <div style={{ ...sectionHead, margin: '34px 0 18px' }}>Trang Ghi chép</div>
          <div style={grid(two)}>
            <Field label="Tiêu đề trang">
              <input {...field('notesTitle')} style={serifInput} />
            </Field>
            <Field label="Dòng dưới tiêu đề">
              <input {...field('notesSubtitle')} style={serifItalicInput} />
            </Field>
          </div>
          <div style={grid(two, 18)}>
            <Field label="Đoạn dẫn — góc phải">
              <textarea {...field('notesIntro')} rows={3} style={{ ...area, fontSize: 14 }} />
            </Field>
            <Field label="Dòng hướng dẫn — dưới đoạn dẫn">
              <textarea {...field('notesHint')} rows={3} style={{ ...area, fontSize: 14 }} />
            </Field>
          </div>
          <div style={grid(two, 18)}>
            <Field label="Lời kết — cuối trang">
              <input {...field('notesEnd')} style={serifItalicInput} />
            </Field>
            <Field label="Lời kết — dòng phụ">
              <input {...field('notesEndNote')} style={boxed} />
            </Field>
          </div>

          <div style={{ ...sectionHead, margin: '34px 0 18px' }}>Trang Lưu trữ</div>
          <div style={grid(two)}>
            <Field label="Tiêu đề trang">
              <input {...field('archiveTitle')} style={serifInput} />
            </Field>
            <Field label="Dòng phụ — cạnh số bài">
              <input {...field('archiveNote')} style={boxed} />
            </Field>
          </div>

          <div style={{ ...sectionHead, margin: '34px 0 18px' }}>Mục lục</div>
          <div style={grid(two)}>
            <Field label="Tiêu đề — dòng 1">
              <input {...field('t1')} style={serifInput} />
            </Field>
            <Field label="Tiêu đề — dòng 2 (nghiêng, xanh)">
              <input
                {...field('t2')}
                style={serifItalicInput}
              />
            </Field>
          </div>
          <div style={grid(two, 18)}>
            <Field label="Đoạn dẫn — dạng danh sách">
              <textarea
                {...field('blurb')}
                rows={3}
                style={{ ...area, fontSize: 14 }}
              />
            </Field>
            <Field label="Đoạn dẫn — dạng cột">
              <textarea
                {...field('blurbShort')}
                rows={3}
                style={{ ...area, fontSize: 14 }}
              />
            </Field>
          </div>
          <div style={grid(three, 40)}>
            {([1, 2, 3] as const).map((slot) => (
              <ImageSlot
                key={slot}
                label={`Chú thích ảnh ${slot}`}
                caption={copy[`plate${slot}` as const]}
                url={copy[`plateImg${slot}` as const] || null}
                onCaption={(v) => void saveSite({ [`plate${slot}`]: v } as SiteOverrides)}
                onUpload={(f) => savePlate(slot, f)}
                onClear={() => void saveSite({ [`plateImg${slot}`]: '' } as SiteOverrides)}
                onPlace={(next) => void saveSite({ [`plateImg${slot}`]: next } as SiteOverrides)}
                ratio={16 / 9}
                drag={{
                  ...plateSwap.slotProps(slot),
                  handle: plateSwap.handleProps(slot),
                  marked: plateSwap.over === slot,
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              borderBottom: `2px solid ${ink.base}`,
              paddingBottom: 9,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: ink.muted,
              }}
            >
              Module — kéo thẻ để đổi thứ tự
            </div>
            <div
              onClick={async () => {
                try {
                  const m = await createModule()
                  setModules((ms) => ms.concat([m]))
                  setOpenModule(m.id)
                } catch (e) {
                  setError((e as Error).message)
                }
              }}
              style={{
                fontFamily: sans,
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                background: ink.base,
                color: paper.cream,
                padding: '8px 14px',
                cursor: 'pointer',
              }}
            >
              + module mới
            </div>
          </div>

          {modules.map((m, mi) => {
            // Only what a reader sees. Order is a fact about the page, so a
            // post that is not on the page has no place in this list — the
            // drafts and the archive are managed on Tạo bài đăng.
            const entries = liveOf(m.id)
            const open = openModule === m.id
            // Which fields this module actually uses — see admin/moduleForm.ts.
            const shape = formShapeOf(m)
            return (
              <div
                key={m.id}
                draggable
                onDragStart={() => setDragModule(m.id)}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (overModule !== m.id) setOverModule(m.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  void dropModule(m.id)
                }}
                onDragEnd={() => {
                  setDragModule(null)
                  setOverModule(null)
                }}
                style={{
                  borderBottom: '1px solid #F0EBDB',
                  padding: '13px 0',
                  opacity: dragModule === m.id ? 0.45 : 1,
                }}
              >
                {overModule === m.id && dragModule !== m.id && (
                  <div style={{ height: 2, background: ink.base, margin: '-13px 0 11px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <Hover
                    title="Kéo để đổi thứ tự"
                    style={{
                      fontFamily: sans,
                      fontSize: 13,
                      lineHeight: 1,
                      color: '#C9C2AC',
                      cursor: 'grab',
                      width: 12,
                      flex: 'none',
                      letterSpacing: '.05em',
                    }}
                    hoverStyle={{ color: ink.base }}
                  >
                    ⠿
                  </Hover>
                  <div
                    onClick={() => setOpenModule(open ? null : m.id)}
                    style={{ fontFamily: sans, fontSize: 12, color: ink.muted, cursor: 'pointer', width: 14, flex: 'none' }}
                  >
                    {open ? '▾' : '▸'}
                  </div>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: m.accent, flex: 'none' }} />
                  <div
                    style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.16em', color: ink.faint, width: 26, flex: 'none' }}
                  >
                    {String(mi + 1).padStart(2, '0')}
                  </div>
                  <div
                    onClick={() => setOpenModule(open ? null : m.id)}
                    style={{
                      fontFamily: serif,
                      fontSize: 24,
                      lineHeight: 1.1,
                      letterSpacing: '-.025em',
                      flex: 1,
                      minWidth: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {m.title}
                  </div>
                  <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 12, color: ink.muted, flex: 'none' }}>
                    {countLabel(m.id, entries.length)}
                  </div>
                  <Hover
                    onClick={async () => {
                      try {
                        await deleteModule(m.id)
                        setModules((ms) => ms.filter((x) => x.id !== m.id))
                        setPosts((ps) => ps.filter((p) => p.module_id !== m.id))
                        setOpenModule(null)
                      } catch (e) {
                        setError((e as Error).message)
                      }
                    }}
                    style={{ fontFamily: sans, fontSize: 12, color: ink.faint, cursor: 'pointer', flex: 'none' }}
                    hoverStyle={{ color: '#C25C7C' }}
                  >
                    ✕
                  </Hover>
                </div>

                {open && (
                  <div style={{ padding: '16px 0 6px 39px' }}>
                    <div style={grid(shape.concept ? nameRow : nameRowPlain)}>
                      <Field label="Tên module">
                        <input
                          defaultValue={m.title}
                          onBlur={(e) => void patchModule(m.id, { title: e.target.value })}
                          style={boxed}
                        />
                      </Field>
                      <Field label="Màu">
                        <div style={{ position: 'relative' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 13,
                              height: 13,
                              border: `1px solid ${paper.rule}`,
                              background: m.accent,
                            }}
                          />
                          <input
                            defaultValue={m.accent}
                            onBlur={(e) => void patchModule(m.id, { accent: e.target.value })}
                            style={{ ...boxed, paddingLeft: 31 }}
                          />
                        </div>
                      </Field>
                      {shape.layout && (
                        <Field label="Dàn trang">
                          <select
                            value={m.layout}
                            onChange={(e) => void patchModule(m.id, { layout: e.target.value })}
                            style={boxed}
                          >
                            <option value="band">band</option>
                            <option value="specimen">specimen</option>
                            <option value="sequence">sequence</option>
                          </select>
                        </Field>
                      )}
                      {shape.concept && (
                        <Field label="Concept">
                          <input
                            defaultValue={m.concept}
                            onBlur={(e) => void patchModule(m.id, { concept: e.target.value })}
                            style={boxed}
                          />
                        </Field>
                      )}
                    </div>

                    {shape.blurb && (
                      <div style={grid(one)}>
                        <Field label={<>Mô tả ngắn<Where>hiện ở Mục lục</Where></>}>
                          <textarea
                            defaultValue={m.blurb}
                            onBlur={(e) => void patchModule(m.id, { blurb: e.target.value })}
                            rows={2}
                            style={area}
                          />
                        </Field>
                      </div>
                    )}

                    {shape.longDesc && (
                      <div style={grid(one)}>
                        <Field label={<>Mô tả dài<Where>hiện ở Trang chủ và đầu trang module</Where></>}>
                          <textarea
                            defaultValue={m.long_desc}
                            onBlur={(e) => void patchModule(m.id, { long_desc: e.target.value })}
                            rows={3}
                            style={area}
                          />
                        </Field>
                      </div>
                    )}

                    {shape.designNotes && (
                      <div style={grid(two)}>
                        <Field label={<>Treatment<Where>hiện ở Design system</Where></>}>
                          <textarea
                            defaultValue={m.treatment}
                            onBlur={(e) => void patchModule(m.id, { treatment: e.target.value })}
                            rows={3}
                            style={area}
                          />
                        </Field>
                        <Field label={<>Ghi chú dàn trang<Where>hiện ở Design system</Where></>}>
                          <textarea
                            defaultValue={m.layout_note}
                            onBlur={(e) => void patchModule(m.id, { layout_note: e.target.value })}
                            rows={3}
                            style={area}
                          />
                        </Field>
                      </div>
                    )}

                    {shape.featureCells && (
                      <FeatureCellsEditor
                        overrides={(m.feature_cells as FeatureOverride[] | null) ?? []}
                        onChange={(next) => void patchModule(m.id, { feature_cells: next })}
                        onUpload={async (n, f) => {
                          try {
                            const { url } = await uploadImage(f)
                            const prev = (m.feature_cells as FeatureOverride[] | null) ?? []
                            const rest = prev.filter((o) => o.n !== n)
                            const current = prev.find((o) => o.n === n) ?? { n }
                            await patchModule(m.id, {
                              feature_cells: [...rest, { ...current, img: url }].sort((a, b) => a.n - b.n),
                            })
                            return url
                          } catch (e) {
                            setError((e as Error).message)
                            return null
                          }
                        }}
                      />
                    )}

                    {shape.images.map((group) => (
                      <ModuleImages
                        key={group.label}
                        m={m}
                        group={group}
                        onCaption={(slot, v) =>
                          void patchModule(m.id, { [captionColumn(group, slot)]: v })
                        }
                        onUpload={async (slot, f) => {
                          try {
                            const { url } = await uploadImage(f)
                            await patchModule(m.id, { [imageColumn(group, slot)]: url })
                            return url
                          } catch (e) {
                            setError((e as Error).message)
                            return null
                          }
                        }}
                        onClear={(slot) => void patchModule(m.id, { [imageColumn(group, slot)]: null })}
                        onSwap={(a, b) => {
                          // Ảnh và chú thích của nó đi cùng nhau — đổi chỗ ảnh
                          // mà bỏ chú thích lại là gán nhầm lời cho hình.
                          const cell = (slot: 1 | 2 | 3 | 4) => ({
                            img: (m as Record<string, unknown>)[imageColumn(group, slot)] ?? null,
                            cap: (m as Record<string, unknown>)[captionColumn(group, slot)] ?? null,
                          })
                          const [one, two] = [cell(a), cell(b)]
                          void patchModule(m.id, {
                            [imageColumn(group, a)]: two.img,
                            [captionColumn(group, a)]: two.cap,
                            [imageColumn(group, b)]: one.img,
                            [captionColumn(group, b)]: one.cap,
                          })
                        }}
                        onPlace={(slot, url) =>
                          void patchModule(m.id, { [imageColumn(group, slot)]: url })
                        }
                      />
                    ))}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        borderTop: '1px solid #E8E2CE',
                        paddingTop: 14,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: '.18em',
                          textTransform: 'uppercase',
                          color: ink.muted,
                        }}
                      >
                        Bài trong module
                      </div>
                      {/*
                        Writing a post starts in one place. This list is for
                        reading the order and changing it, so the button hands
                        over to the wizard rather than dropping a blank draft
                        in from the side.
                      */}
                      <Hover
                        onClick={() => nav.newPost()}
                        style={{
                          fontFamily: sans,
                          fontSize: 10.5,
                          letterSpacing: '.14em',
                          textTransform: 'uppercase',
                          border: '1px solid #DAD7C7',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          color: ink.soft,
                        }}
                        hoverStyle={{ borderColor: ink.base, color: ink.base }}
                      >
                        + bài
                      </Hover>
                    </div>

                    {entries.map((e, i) => (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={() => setDragEntry(e.id)}
                        onDragOver={(ev) => ev.preventDefault()}
                        onDrop={(ev) => {
                          ev.preventDefault()
                          void dropEntry(m.id, e.id)
                        }}
                        onDragEnd={() => setDragEntry(null)}
                        style={{
                          display: 'grid',
                          // Titles are short names; descriptions are sentences,
                          // and the ones that got cut off were always these.
                          gridTemplateColumns: '44px minmax(0,0.72fr) minmax(0,1.6fr) 74px 48px',
                          gap: 10,
                          alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: '1px solid #EFEADA',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Hover
                            title="Kéo để đổi thứ tự"
                            style={{ fontFamily: sans, fontSize: 12, lineHeight: 1, color: '#D5CEB8', cursor: 'grab' }}
                            hoverStyle={{ color: ink.base }}
                          >
                            ⠿
                          </Hover>
                          <div style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.12em', color: ink.faint }}>
                            {displayNumber(i)}
                          </div>
                        </div>
                        <input
                          defaultValue={e.en}
                          onBlur={(ev) => void patchPost(e.id, { en: ev.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'transparent',
                            border: 0,
                            color: ink.base,
                            fontFamily: sans,
                            fontSize: 13.5,
                            padding: '4px 2px',
                            outline: 'none',
                          }}
                        />
                        <input
                          defaultValue={e.vi}
                          onBlur={(ev) => void patchPost(e.id, { vi: ev.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'transparent',
                            border: 0,
                            color: ink.soft,
                            fontFamily: sans,
                            fontWeight: 300,
                            fontSize: 13,
                            padding: '4px 2px',
                            outline: 'none',
                          }}
                        />
                        <input
                          defaultValue={e.date_label}
                          onBlur={(ev) => void patchPost(e.id, { date_label: ev.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'transparent',
                            border: 0,
                            color: ink.muted,
                            fontFamily: sans,
                            fontSize: 12,
                            padding: '4px 2px',
                            outline: 'none',
                          }}
                        />
                        <Hover
                          onClick={() => void removeEntry(e.id)}
                          style={{ fontFamily: sans, fontSize: 12, color: ink.faint, cursor: 'pointer' }}
                          hoverStyle={{ color: '#C25C7C' }}
                        >
                          ✕
                        </Hover>
                      </div>
                    ))}

                  </div>
                )}
              </div>
            )
          })}

          <div style={{ ...sectionHead, margin: '44px 0 18px' }}>{copy.sections.Admin}</div>
          <div style={grid(two, 20)}>
            <Field label="Design system — tiêu đề dòng 1">
              <input
                {...field('artT1')}
                style={{ ...serifInput, fontSize: 20 }}
              />
            </Field>
            <Field label="Design system — tiêu đề dòng 2 (nghiêng, xanh)">
              <input
                {...field('artT2')}
                style={{ ...serifItalicInput, fontSize: 20 }}
              />
            </Field>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="Design system — đoạn dẫn">
                <textarea
                  {...field('artIntro')}
                  rows={3}
                  style={area}
                />
              </Field>
            </div>
            <Field label="System conventions — tiêu đề">
              <input
                {...field('logicTitle')}
                style={{ ...serifInput, fontSize: 20 }}
              />
            </Field>
            <Field label="System conventions — đoạn dẫn">
              <textarea
                {...field('logicIntro')}
                rows={2}
                style={area}
              />
            </Field>
            <Field label="Content — tiêu đề">
              <input
                {...field('cmsTitle')}
                style={{ ...serifInput, fontSize: 20 }}
              />
            </Field>
            <Field label="Content — đoạn dẫn">
              <textarea
                {...field('cmsIntro')}
                rows={2}
                style={area}
              />
            </Field>
          </div>

          <Hover
            onClick={async () => {
              // Every field back to its shipped default: clear the whole blob.
              try {
                setSite(await updateSite(Object.fromEntries(
                  Object.keys(SITE_DEFAULTS)
                    .filter((k) => k !== 'sections')
                    .map((k) => [k, '']),
                ) as SiteOverrides))
                await load()
              } catch (e) {
                setError((e as Error).message)
              }
            }}
            style={{
              display: 'inline-block',
              marginTop: 30,
              fontFamily: sans,
              fontSize: 10.5,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: ink.faint,
              borderBottom: `1px solid ${paper.rule}`,
              paddingBottom: 4,
              cursor: 'pointer',
            }}
            hoverStyle={{ color: '#C25C7C', borderColor: '#C25C7C' }}
          >
            Trả về nội dung gốc
          </Hover>
        </div>
      )}
    </div>
  )
}
