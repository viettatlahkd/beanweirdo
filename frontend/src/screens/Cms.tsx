import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { displayNumber } from '../lib/postText'
import { onlyLive, orderPosts } from '../lib/postOrder'
import { byBandThenOrder } from '../lib/moduleOrder'
import { resolveSite, SITE_DEFAULTS, type SiteCopy, type SiteOverrides } from '../content/site'
import {
  createModule,
  deleteModule,
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
import {
  transitionStatus,
  getSite,
  createTag,
  renameTag,
  deleteTag,
  type Tag,
} from '../admin/lib/apiClient'
import {
  forgetModules,
  forgetTags,
  listModulesCached,
  listTagsCached,
} from '../admin/lib/lists'
import { tagColor } from '../lib/notesFilter'
import { PostsPanel } from '../admin/components/PostsPanel'
import { ModuleImages } from '../admin/components/ModuleImages'
import { captionColumn, formShapeOf, imageColumn } from '../admin/moduleForm'
import { FocusPicker } from '../admin/components/FocusPicker'
import { coverStyle } from '../lib/imageFocus'
import { depthOf, possibleParents } from '../lib/contentTree'
import { MODULE_LAYOUTS } from '../content/layouts'
import { useSlotSwap, type SlotSwap } from '../admin/lib/useSlotSwap'
import { FeatureCellsEditor } from '../admin/components/FeatureCellsEditor'
import type { FeatureOverride } from '../content/notes'
import { ink, paper, sans, serif } from '../design/tokens'
import { Button, IconButton } from '../design/Button'
import { radius } from '../design/controls'
import { IconChevron, IconClose, IconDrag, IconPlus, IconTrash, IconUpload } from '../design/icons'
import { useToast } from '../design/Toaster'
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
/** The parent picker sits alone: a full-width select for one short name reads as a mistake. */
const parentRow = 'minmax(0,340px)'

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

/** The two tabs, named once so nothing else can drift from them. */
export const TABS = [
  { k: 'posts', t: 'Bài viết' },
  { k: 'config', t: 'Cấu hình' },
] as const

/**
 * The boxes inside `Cấu hình`, in the order the grid lays them out.
 *
 * Every `id` here must exist as an anchor in the tab below, and every such
 * anchor must be named here: the grid opens a box by id, so a box renamed on
 * one side and not the other opens onto an empty screen — and nothing about
 * that is a type error or a failing render. `Cms.sections.test.tsx` runs the
 * two lists against each other.
 *
 * `Cấu trúc` and `Chữ trên trang` were two tabs, each one scroll several
 * screenfuls long, and the site owner could not find the field that puts a
 * module inside another module in either of them. One box holds one subject,
 * and the grid is the whole list of subjects on one screen.
 */
export const CONFIG_BOXES = [
  { id: 'landing', t: 'Trang chủ', d: 'Nhãn trên cùng, tên lớn hai dòng, hai đoạn dẫn' },
  { id: 'modules', t: 'Cây module', d: 'Thêm module, đặt nó nằm trong module khác, dàn trang và ảnh' },
  { id: 'index', t: 'Trang mục lục', d: 'Tiêu đề, hai đoạn dẫn và ba ảnh khay' },
  { id: 'tag', t: 'Tag', d: 'Danh sách tag, dùng chung cho ghi chép và bài đăng' },
  { id: 'notes', t: 'Trang Ghi chép', d: 'Tiêu đề, đoạn dẫn, dòng hướng dẫn, lời kết' },
] as const

export type ConfigBox = (typeof CONFIG_BOXES)[number]['id']

/**
 * The index names itself, so a test — and a screen reader — can tell an index
 * entry from the breadcrumb of the same name overhead.
 */
export const GRID_LABEL = 'Mục cấu hình'

/**
 * The left column of `Cấu hình`: every subject, as an index.
 *
 * It was a grid of five cards, and clicking one replaced the grid with that
 * one subject. That made five screens where there is one job — the site
 * owner kept going back to the grid to reach the next field. Now the right
 * column holds all five at once and this column is only the way to jump, so
 * nothing is ever hidden behind a click.
 *
 * `aria-current` rather than `aria-pressed`: these do not toggle anything on,
 * they say which part of one long page you are looking at.
 */
function BoxIndex({ active, onPick }: { active: ConfigBox | null; onPick: (id: ConfigBox) => void }) {
  return (
    <nav
      aria-label={GRID_LABEL}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        // Dính lại khi cột phải cuộn: chỉ mục mà cuộn mất thì nó không còn là
        // chỉ mục, chỉ là một cái tiêu đề ở trên cùng.
        position: 'sticky',
        top: 16,
      }}
    >
      {CONFIG_BOXES.map((b) => (
        <button
          key={b.id}
          type="button"
          className="ab-box"
          aria-current={active === b.id}
          onClick={() => onPick(b.id)}
          style={{
            display: 'block',
            textAlign: 'left',
            background: active === b.id ? paper.hover : paper.white,
            border: `1px solid ${active === b.id ? ink.border : paper.rule}`,
            borderRadius: radius,
            padding: '12px 14px 13px',
            cursor: 'pointer',
            font: 'inherit',
            color: 'inherit',
          }}
        >
          <div
            style={{
              fontFamily: serif,
              fontSize: 17,
              lineHeight: 1.15,
              letterSpacing: '-.02em',
              color: ink.base,
            }}
          >
            {b.t}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: 11.5,
              lineHeight: 1.4,
              color: ink.muted,
              marginTop: 5,
            }}
          >
            {b.d}
          </div>
        </button>
      ))}
    </nav>
  )
}

/**
 * One subject in the right column.
 *
 * Everything is on screen at once, so the only thing a pick changes is which
 * subject is lit. Dimming the rest is a hint, not a lock — they stay readable
 * and stay editable, because a person who jumped to `Tag` may well fix the
 * line above it without going back to the index first.
 */
function Section({
  id,
  active,
  children,
}: {
  id: ConfigBox
  active: ConfigBox | null
  children: ReactNode
}) {
  const lit = active === null || active === id
  return (
    <section
      id={id}
      aria-labelledby={`${id}-head`}
      style={{
        // Chừa chỗ cho thanh tab dính phía trên, để phần được cuộn tới không
        // nằm khuất dưới nó.
        scrollMarginTop: 72,
        opacity: lit ? 1 : 0.34,
        transition: 'opacity .18s ease',
      }}
    >
      {children}
    </section>
  )
}

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
  const file = useRef<HTMLInputElement>(null)
  const { marked, handle, ...dragProps } = drag ?? { marked: false, handle: undefined }
  return (
    <div {...dragProps} style={{ outline: marked ? `2px solid ${ink.base}` : undefined, outlineOffset: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {handle && (
          <div
            {...handle}
            title="Kéo sang khung khác để đổi chỗ hai ảnh"
            aria-label={`kéo ${label} sang khung khác`}
            style={{ lineHeight: 0, color: ink.faint, cursor: 'grab', userSelect: 'none' }}
          >
            <IconDrag size={15} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' }}>
        {/*
          A `<label>` wrapping a hidden file input is what this was: it could be
          clicked but not tabbed to, and it was drawn with a dashed 1px rule
          that read as a drop zone rather than a control. A real button that
          forwards the click keeps the keyboard in play.
        */}
        <input
          ref={file}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
          style={{ display: 'none' }}
        />
        <Button
          size="sm"
          level="secondary"
          onClick={() => file.current?.click()}
          icon={<IconUpload size={14} />}
        >
          {url ? 'Đổi ảnh' : 'Tải ảnh lên'}
        </Button>
        {url && (
          <Button size="sm" onClick={() => setPlacing(url)}>
            Đặt vào khung
          </Button>
        )}
        <Button size="sm" onClick={() => setLinking(!linking)} aria-expanded={linking}>
          Dán link
        </Button>
        {url && (
          <IconButton size="sm" level="danger" label="Bỏ ảnh này" onClick={onClear}>
            <IconClose size={15} />
          </IconButton>
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
/**
 * Thêm, đổi tên, xoá tag.
 *
 * Cùng một khuôn với tag của Ghi 02, kể cả phần khó nhất của nó: xoá một tag
 * thì phải nói trước những gì đang đeo nó sẽ về đâu. Xoá lặng lẽ là để lại bài
 * trỏ vào một tag không còn tồn tại — nó biến mất khỏi mọi thanh lọc mà vẫn nằm
 * đó, đúng cái lỗi "viết xong rồi không tìm thấy được".
 */
/**
 * Tag: danh sách bên trái, chi tiết bên phải.
 *
 * Trước đây mỗi tag là một ô nhập nằm thẳng trong danh sách, và **gõ xong rời
 * ô là đổi tên luôn** — không có bước xác nhận nào giữa "tôi bấm nhầm vào đây"
 * và "tag đã đổi tên trên mọi bài đang đeo nó". Nút xoá cũng lặp lại trên từng
 * dòng, nên thứ nguy hiểm nhất lại là thứ nhiều nhất trên màn.
 *
 * Nay danh sách chỉ để đọc và chọn. Đổi tên và xoá nằm ở khung chi tiết, mỗi
 * lần một tag, và đổi tên phải bấm Lưu.
 */
function TagsPanel() {
  const [tags, setTags] = useState<Tag[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [asking, setAsking] = useState<{ id: string; wearing: { posts: string[]; notes: string[] } } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  /** Tag đang mở ở khung chi tiết. */
  const [picked, setPicked] = useState<string | null>(null)
  /** Ô tạo tag, và ô đổi tên — cả hai chỉ ghi khi bấm nút. */
  const [fresh, setFresh] = useState('')
  const [rename, setRename] = useState('')

  const load = () => void listTagsCached().then(setTags)
  useEffect(load, [])

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id)
    try {
      await fn()
      setErr(null)
      // Bỏ bản đang giữ trước khi đọc lại, nếu không `load()` trả về đúng cái
      // danh sách mà lượt ghi vừa rồi đã làm cho cũ.
      forgetTags()
      load()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const open = tags.find((t) => t.id === picked) ?? null
  const pick = (t: Tag) => {
    setPicked(t.id)
    setRename(t.label)
    setAsking(null)
  }

  const create = () => {
    const v = fresh.trim()
    if (!v) return
    setFresh('')
    void run('new', () => createTag(v))
  }

  const dot = (label: string, size = 9) => (
    <span
      style={{ width: size, height: size, borderRadius: 999, background: tagColor(label), flex: 'none' }}
    />
  )

  return (
    <div style={{ marginBottom: 18 }}>
      {err && <div role="alert" style={{ fontSize: 12, color: '#8E1E42', marginBottom: 10 }}>{err}</div>}

      {/* Tạo tag: một ô và một nút. Gõ không tạo gì cho tới khi bấm. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={fresh}
          aria-label="tên tag mới"
          placeholder="tên tag mới"
          onChange={(e) => setFresh(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create()
          }}
          style={{ ...boxed, maxWidth: 260, padding: '6px 10px', fontSize: 13 }}
        />
        <Button size="sm" level="primary" disabled={!fresh.trim() || busy === 'new'} onClick={create} icon={<IconPlus size={14} />}>
          Tạo tag
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,240px) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        {/* Danh sách — chỉ để đọc và chọn. */}
        <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${paper.rule}` }}>
          {tags.length === 0 && (
            <div style={{ fontFamily: sans, fontSize: 12.5, color: ink.faint, padding: '10px 12px' }}>
              chưa có tag nào
            </div>
          )}
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={picked === t.id}
              onClick={() => pick(t)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                width: '100%',
                textAlign: 'left',
                background: picked === t.id ? paper.white : 'transparent',
                border: 0,
                borderLeft: `2px solid ${picked === t.id ? ink.base : 'transparent'}`,
                padding: '8px 12px',
                fontFamily: sans,
                fontSize: 13,
                color: ink.base,
                cursor: 'pointer',
              }}
            >
              {dot(t.label)}
              {t.label}
            </button>
          ))}
        </div>

        {/* Chi tiết — mỗi lần một tag. */}
        <div style={{ border: `1px solid ${paper.rule}`, padding: 16, background: paper.white }}>
          {!open ? (
            <div style={{ fontFamily: sans, fontSize: 12.5, color: ink.faint }}>
              Chọn một tag bên trái để sửa tên hoặc xoá.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {dot(open.label, 11)}
                <span style={{ fontFamily: serif, fontSize: 20, lineHeight: 1.1 }}>{open.label}</span>
              </div>

              <Field label="Tên tag">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={rename}
                    aria-label={`tên tag ${open.label}`}
                    onChange={(e) => setRename(e.target.value)}
                    style={{ ...boxed, maxWidth: 260, padding: '6px 10px', fontSize: 13 }}
                  />
                  <Button
                    size="sm"
                    level="primary"
                    disabled={busy === open.id || !rename.trim() || rename.trim() === open.label}
                    onClick={() => {
                      const v = rename.trim()
                      if (v && v !== open.label) void run(open.id, () => renameTag(open.id, v))
                    }}
                  >
                    Lưu tên
                  </Button>
                </div>
              </Field>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  level="danger"
                  disabled={busy === open.id}
                  icon={<IconTrash size={14} />}
                  onClick={() =>
                    void run(open.id, async () => {
                      try {
                        await deleteTag(open.id)
                        setPicked(null)
                      } catch (e) {
                        // Máy chủ từ chối vì còn thứ đang đeo, và trả về danh sách ấy.
                        const w = (e as { payload?: { wearing?: { posts: string[]; notes: string[] } } }).payload?.wearing
                        if (!w) throw e
                        setAsking({ id: open.id, wearing: w })
                      }
                    })
                  }
                >
                  Xoá tag
                </Button>
                {asking?.id === open.id && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: ink.mid }}>
                    {asking.wearing.posts.length + asking.wearing.notes.length} thứ đang đeo — chuyển sang
                    <select
                      aria-label="chuyển sang tag"
                      defaultValue=""
                      onChange={(e) => {
                        const to = e.target.value === '' ? null : e.target.value
                        setAsking(null)
                        setPicked(null)
                        void run(open.id, () => deleteTag(open.id, to))
                      }}
                      style={{ ...boxed, width: 'auto', padding: '3px 6px', fontSize: 11.5 }}
                    >
                      <option value="">(bỏ trống)</option>
                      {tags.filter((o) => o.id !== open.id).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Cms() {
  const nav = useNav()
  const toast = useToast()
  // Tab nằm trong địa chỉ, không nằm trong state: ba tab là ba chỗ khác nhau
  // để đứng, nên một đường link tới sơ đồ trang không được mở ra danh sách bài.
  const tab = nav.cmsTab
  const [site, setSite] = useState<SiteOverrides>({})
  const [modules, setModules] = useState<Module[]>([])
  // The site map names what Templates holds, so it has to know.
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [dragModule, setDragModule] = useState<string | null>(null)
  const [overModule, setOverModule] = useState<string | null>(null)
  const [dragEntry, setDragEntry] = useState<string | null>(null)
  /** Đang hỏi lại trước khi xoá sạch nội dung đã sửa của cả trang. */
  const [resetting, setResetting] = useState(false)
  /**
   * Phần nào của `Cấu hình` đang được chiếu sáng. `null` là chưa chọn gì.
   *
   * Nó không còn quyết định phần nào **có mặt** — cả năm phần luôn ở đó, cuộn
   * tới được. Nên `null` không phải một màn riêng: nó chỉ có nghĩa là chưa ai
   * bấm vào chỉ mục, và lúc ấy cả năm phần đều rõ như nhau. Làm mờ bốn phần
   * ngay khi mới mở màn là tự chọn hộ người ta một chỗ để nhìn.
   *
   * Không nằm trong địa chỉ, vì nó là chỗ đang nhìn trong một trang, không
   * phải một trang.
   */
  const [box, setBox] = useState<ConfigBox | null>(null)

  /**
   * Bấm một mục ở chỉ mục: chiếu sáng phần ấy và cuộn tới nó.
   *
   * Cuộn nằm trong `requestAnimationFrame` vì `setBox` ở dòng trên làm bốn
   * phần kia mờ đi, và cuộn trước khi trình duyệt vẽ xong là cuộn theo bố cục
   * cũ. `block: 'start'` đi cùng `scrollMarginTop` của `Section`.
   */
  const pickBox = useCallback((id: ConfigBox) => {
    setBox(id)
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const load = useCallback(async () => {
    try {
      const [s, m, p] = await Promise.all([getSite(), listModulesCached(), listPosts('all')])
      setSite(s)
      setModules(m)
      setPosts(p)
    } catch (e) {
      toast.fromError(e)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  /*
   * Cùng một hàm trang công khai dùng. Màn này từng giữ phép hoà riêng của nó,
   * và đó là lý do sửa được một chỗ mà lỗi vẫn còn: ba bản sao của một luật.
   */
  const copy = useMemo(() => resolveSite(site), [site])

  async function saveSite(patch: SiteOverrides) {
    setSite((s) => ({ ...s, ...patch }))
    try {
      setSite(await updateSite(patch))
    } catch (e) {
      toast.fromError(e)
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
      toast.fromError(e)
      return null
    }
  }

  async function patchModule(id: string, patch: Partial<Module>) {
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    forgetModules()
    try {
      await updateModule(id, patch)
    } catch (e) {
      toast.fromError(e)
    }
  }

  /*
   * Modules in the order the site reads them.
   *
   * This list used to come straight off `sort_order`, while the sidebar and Mục
   * lục put every journal below every reading module — so `Ghi 01` sat fourth
   * here and fifth there, and dragging it one place up moved a number nobody
   * could see. Same class of bug as the post numbering below: a handle that
   * rearranges a list which is not the list on the page.
   *
   * Writing 1..N back over this order also heals the stored numbers, since the
   * bands come out already contiguous and `byBandThenOrder` then changes
   * nothing.
   */
  const shownModules = useMemo(() => [...modules].sort(byBandThenOrder), [modules])

  const kindOf = (id: string) => modules.find((m) => m.id === id)?.kind

  /*
   * A journal cannot be dragged in among the reading modules. The site sorts
   * every `special` module below every `normal` one, so such a drop would write
   * a number the page ignores and the thẻ would spring back on the next load —
   * better to refuse the drop than to fake it.
   *
   * The rule was a caption standing permanently between the two bands. It is a
   * toast instead: a line of print nobody is reading explains the refusal to
   * everyone except the person who just ran into it.
   */
  const BAND_RULE = 'Nhật ký — luôn xếp sau các module đọc'

  const sameBand = (a: string, b: string) => {
    const ka = kindOf(a)
    return ka !== undefined && ka === kindOf(b)
  }

  async function dropModule(targetId: string) {
    const src = dragModule
    setDragModule(null)
    setOverModule(null)
    if (!src || src === targetId) return
    if (!sameBand(src, targetId)) {
      toast.info(BAND_RULE)
      return
    }
    // `shownModules`, not `modules`: the numbers written here become the site's
    // order, so they have to be written over the list the owner just dragged.
    const order = shownModules.map((m) => m.id)
    const i = order.indexOf(src)
    const j = order.indexOf(targetId)
    if (i < 0 || j < 0) return
    order.splice(j, 0, order.splice(i, 1)[0])
    setModules(order.map((id) => modules.find((m) => m.id === id)!))
    forgetModules()
    try {
      setModules(await reorderModules(order))
    } catch (e) {
      toast.fromError(e)
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
      toast.fromError(e)
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
      toast.fromError(e)
    }
  }


  async function removeEntry(id: string) {
    try {
      await transitionStatus(id, 'delete')
      setPosts((ps) => ps.filter((p) => p.id !== id))
    } catch (e) {
      toast.fromError(e)
    }
  }

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
              Content
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
              Mọi thứ trong khu quản trị: bài viết, và cấu hình của trang.
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

        {/*
          Three places to stand, so three real buttons. They were `<div onClick>`,
          which meant the only way into the other two tabs was the mouse — and
          `aria-pressed` now says which one you are on rather than leaving it to
          the fill colour alone.
        */}
        <div style={{ display: 'flex', gap: 6, marginTop: 26, flexWrap: 'wrap' }}>
          {TABS.map((x) => (
            <button
              key={x.k}
              type="button"
              className="ab-tab"
              aria-pressed={tab === x.k}
              onClick={() => nav.goCms(x.k)}
            >
              {x.t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'posts' && (
        <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
          <PostsPanel onChanged={() => void load()} />
        </div>
      )}

      {tab === 'config' && (
        /*
         * Hai cột: chỉ mục bên trái, toàn bộ nội dung bên phải.
         *
         * `align-items: start` là thứ làm cột trái dính được — một `grid` mặc
         * định kéo mỗi ô cao bằng hàng, và một `position: sticky` bên trong một
         * ô cao bằng cả nội dung thì không bao giờ có chỗ để dính.
         */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(210px, 258px) minmax(0, 1fr)',
            alignItems: 'start',
            gap: 34,
            padding: '34px 56px 130px',
            maxWidth: 1180,
          }}
        >
          <BoxIndex active={box} onPick={pickBox} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 40, minWidth: 0 }}>

          {/*
            Ba ô chữ này từng là tiêu đề của cây sơ đồ, và cây ấy chỉ để đọc.
            Bỏ cây đi thì ba ô phải có chỗ đứng: chúng vẽ ra nhãn sidebar
            (`Sidebar.tsx`) và chặng đầu của đường dẫn (`crumbs.ts`), nên
            chúng là thứ sửa được duy nhất trên cây cũ.
          */}
          <Section id="modules" active={box}>
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
            id="modules-head"
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
            <Button
              level="primary"
              icon={<IconPlus size={16} />}
              onClick={async () => {
                try {
                  const m = await createModule()
                  forgetModules()
                  setModules((ms) => ms.concat([m]))
                  setOpenModule(m.id)
                  toast.ok(`Đã tạo module “${m.title}”`)
                } catch (e) {
                  toast.fromError(e)
                }
              }}
            >
              Module mới
            </Button>
          </div>

          {shownModules.map((m, mi) => {
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
                  if (dragModule && !sameBand(dragModule, m.id)) return
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
                      lineHeight: 0,
                      color: ink.faint,
                      cursor: 'grab',
                      flex: 'none',
                    }}
                    hoverStyle={{ color: ink.base }}
                  >
                    <IconDrag size={16} />
                  </Hover>
                  {/*
                    The arrow and the module name were two separate `<div onClick>`
                    doing the same thing, so a keyboard could reach neither. One
                    button carrying both is also one tab stop instead of two.
                  */}
                  <IconButton
                    size="sm"
                    label={open ? `Đóng ${m.title}` : `Mở ${m.title}`}
                    aria-expanded={open}
                    onClick={() => setOpenModule(open ? null : m.id)}
                  >
                    <IconChevron size={14} open={open} />
                  </IconButton>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: m.accent, flex: 'none' }} />
                  <div
                    style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.16em', color: ink.faint, width: 26, flex: 'none' }}
                  >
                    {String(mi + 1).padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    className="ab-disclose"
                    aria-expanded={open}
                    onClick={() => setOpenModule(open ? null : m.id)}
                    style={{
                      fontFamily: serif,
                      fontSize: 24,
                      lineHeight: 1.1,
                      letterSpacing: '-.025em',
                      color: ink.base,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {m.title}
                  </button>
                  <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 12, color: ink.muted, flex: 'none' }}>
                    {countLabel(m.id, entries.length)}
                  </div>
                  <IconButton
                    size="sm"
                    level="danger"
                    label={`Xoá module ${m.title}`}
                    onClick={async () => {
                      try {
                        await deleteModule(m.id)
                        forgetModules()
                        setModules((ms) => ms.filter((x) => x.id !== m.id))
                        setPosts((ps) => ps.filter((p) => p.module_id !== m.id))
                        setOpenModule(null)
                        toast.ok(`Đã xoá module “${m.title}”`)
                      } catch (e) {
                        toast.fromError(e)
                      }
                    }}
                  >
                    <IconTrash size={14} />
                  </IconButton>
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
                            {MODULE_LAYOUTS.map((l) => (
                              <option key={l.key} value={l.key}>
                                {l.label}
                              </option>
                            ))}
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

                    {/*
                      Where this module sits in the tree.

                      Migration 0025 gave `modules` a `parent_id`, and every
                      surface on the site learned to read it — but nothing in
                      here could set it, so filing one module inside another
                      meant calling the API by hand. That is exactly the chore
                      this whole change set out to remove.

                      The list leaves out the module itself and everything
                      already inside it: a module cannot be put inside its own
                      contents. The API refuses the same thing, so this only
                      keeps the impossible choice off the screen.
                    */}
                    <div style={grid(parentRow)}>
                      <Field label={<>Nằm trong<Where>để trống là ở tầng trên cùng</Where></>}>
                        <select
                          value={m.parent_id ?? ''}
                          onChange={(e) => void patchModule(m.id, { parent_id: e.target.value || null })}
                          style={boxed}
                        >
                          <option value="">— không nằm trong mục nào —</option>
                          {possibleParents(modules, m.id).map((x) => (
                            <option key={x.id} value={x.id}>
                              {'　'.repeat(depthOf(modules, x.id))}
                              {x.title}
                            </option>
                          ))}
                        </select>
                      </Field>
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
                            toast.fromError(e)
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
                            toast.fromError(e)
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
                      <Button
                        size="sm"
                        onClick={() => nav.newPost()}
                        icon={<IconPlus size={14} />}
                      >
                        Bài mới
                      </Button>
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
                            style={{ lineHeight: 0, color: ink.faint, cursor: 'grab' }}
                            hoverStyle={{ color: ink.base }}
                          >
                            <IconDrag size={14} />
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
                        <IconButton
                          size="sm"
                          level="danger"
                          label={`Bỏ “${e.en}” khỏi module`}
                          onClick={() => void removeEntry(e.id)}
                        >
                          <IconClose size={14} />
                        </IconButton>
                      </div>
                    ))}

                  </div>
                )}
              </div>
            )
          })}
          </Section>

          <Section id="landing" active={box}>
          <div id="landing-head" style={sectionHead}>Trang chủ — landing</div>
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
          </Section>

          {/*
            * Tag dùng chung cho cả ghi chép lẫn bài đăng — sửa ở đây, ăn cả hai
            * chỗ. Trước đây bốn dạng ghi viết cứng trong code, muốn đổi một chữ
            * là phải sửa code.
            */}
          <Section id="tag" active={box}>
          <div id="tag-head" style={sectionHead}>Tag</div>
          <TagsPanel />

          </Section>

          <Section id="notes" active={box}>
          <div id="notes-head" style={sectionHead}>Trang Ghi chép</div>
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

          </Section>

          <Section id="index" active={box}>
          <div id="index-head" style={sectionHead}>Trang mục lục</div>
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

          </Section>

          {/*
            The most destructive control on the screen was the faintest thing
            on it — 10.5px in `ink.faint`, styled as a footnote, and it wiped
            every copy field on the site with no way back. It asks first now,
            and the question is a second press rather than a `confirm()` the
            browser can suppress.

            Nó nằm ở cuối cột nội dung, ngoài mọi phần: nó xoá chữ của cả năm
            phần một lúc, nên không thuộc phần nào. Và nó không mờ đi theo phần
            nào cả — một nút xoá lúc mờ lúc rõ là một nút xoá bấm nhầm.
          */}
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {resetting ? (
              <>
                <span style={{ fontFamily: sans, fontSize: 12.5, color: ink.danger }}>
                  Xoá mọi chữ đã sửa trên toàn bộ trang, không hoàn tác được. Chắc chưa?
                </span>
                <Button
                  level="danger"
                  onClick={async () => {
                    setResetting(false)
                    // Every field back to its shipped default: clear the whole blob.
                    try {
                      setSite(await updateSite(Object.fromEntries(
                        Object.keys(SITE_DEFAULTS).map((k) => [k, '']),
                      ) as SiteOverrides))
                      await load()
                      toast.ok('Đã trả toàn bộ nội dung về bản gốc')
                    } catch (e) {
                      toast.fromError(e)
                    }
                  }}
                >
                  Xoá hết, trả về gốc
                </Button>
                <Button onClick={() => setResetting(false)}>Thôi</Button>
              </>
            ) : (
              <Button level="danger" onClick={() => setResetting(true)}>
                Trả về nội dung gốc…
              </Button>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
