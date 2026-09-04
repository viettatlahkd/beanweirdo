import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useIsMobile } from '../../lib/useIsMobile'
import {
  PostRenderer,
  FLAVOR_GROUP_NAMES,
  flavorGroupMeta,
  normalizeBlocks,
  stepIndent,
  longformTextToRuns,
} from 'post-renderer'
import type {
  CardData,
  CardPart,
  LongformBlock,
  ReportBlock,
  ReportChartPoint,
  ReportMetric,
  ReportTable,
  SectionData,
} from 'post-renderer'
import {
  getPost,
  listModules,
  transitionStatus,
  updatePost,
  uploadImage,
  type Module,
  type PostDetail,
  type PostTemplate,
} from '../lib/apiClient'
import { useNav } from '../../lib/nav'
import { ink, paper, sans, serif } from '../../design/tokens'
import { ThemePicker } from '../components/ThemePicker'
import { FocusPicker } from '../components/FocusPicker'
import { blankReportBlock, getBody, resolveTemplate } from '../lib/postData'
import {
  addColumn,
  addRow,
  freeColumnName,
  removeColumn,
  removeRow,
  resizeColumn,
  widthsOf,
} from '../lib/reportTable'
import {
  cloneBlock,
  ensureIds,
  mergeTarget,
  moveBlock,
  removeBlock,
  toBody,
  vanishesWhenEmpty,
  type KeepChoice,
  type ReportContent,
} from '../lib/reportNotes'
import {
  EXPLORATIONS_LABEL,
  fieldNotesLabel,
  nextId,
  notesOn,
  paletteFrom,
  allElements,
  flatElements,
  getElement,
  segmentsFor,
  textToRuns,
  type ListAttrs,
  type ListItem,
  type Palette,
} from 'post-renderer'
import { AddRow, RowShell } from '../components/RowShell'
import { duplicateAt, insertAt, move, removeAt } from '../lib/listOps'
import { useRowDrag } from '../lib/useRowDrag'
import { toArticleData, toCardsData, toLongformData, toMemoData } from '../../lib/postToRenderer'
import { toReportBlocks, toReportNotes } from '../../lib/reportBlocks'

/**
 * The patch shape every editable field ultimately produces — a subset of
 * apiClient.updatePost's PATCH body. `body` is left `unknown` here (rather
 * than the API client's convenience `SectionData[]` narrowing) because it
 * holds a different real shape per template; see lib/postData.ts.
 */
export type EditPatch = Partial<{
  en: string
  lead: string
  pull_quote: string
  further_reading: string[]
  body: unknown
  hero_image_url: string
  /** Màu riêng của bài; null trả nó về theo màu module. */
  theme_color: string | null
}>

type CanvasProps = {
  template: PostTemplate
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
  onHeroDrop: (file: File) => void
}

const REPORT_BLUE = '#6FA8C0'
const TEMPLATE_LABEL: Record<string, string> = {
  article: 'Article',
  cards: 'Cards',
  report: 'Report',
  longform: 'Long-form',
  memo: 'Memo',
}

/**
 * The outer edit screen — fetches the post + modules by id, wires the
 * publish/save/preview footer, and hands the real editing surface to
 * EditorCanvas below. Port of the standalone admin app's
 * app/posts/[id]/edit/page.tsx, adapted to take `postId` as a prop (no
 * next/navigation `useParams`) and to navigate via the admin nav context.
 */
export function Editor({ postId }: { postId: string }) {
  return (
      <EditorContent postId={postId} />
  )
}

function EditorContent({ postId }: { postId: string }) {
  const nav = useNav()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [modules, setModules] = useState<Module[]>([])

  useEffect(() => {
    Promise.all([getPost(postId), listModules()]).then(([p, mods]) => {
      setPost(p)
      setModules(mods)
    })
  }, [postId])

  if (!post) return <div style={{ padding: 32, color: ink.muted, fontSize: 13 }}>Đang tải...</div>

  const template = resolveTemplate(post)
  // Empty means nothing written yet — a body that is an empty array or an
  // object with no keys, depending on which template put it there.
  const hasContent = Array.isArray(post.body)
    ? post.body.length > 0
    : Object.keys((post.body ?? {}) as Record<string, unknown>).length > 0
  const activeModule = modules.find((m) => m.id === post.module_id)

  // Optimistic local update + fire-and-forget remote save. Functional
  // setState keeps this safe against the stale-closure bug this screen used
  // to have around hero uploads: every callback below reads the latest
  // `post` via the updater function's `prev`, never via a captured `post`
  // from the render that created the closure.
  /** The cover, set from the button in the header or by dropping on the page. */
  async function setHero(file: File) {
    const { url } = await uploadImage(file)
    saveHero(url)
    setFraming(url)
  }

  /*
   * Đặt ảnh bìa xong thì mở luôn khung căn.
   *
   * Ảnh bìa của một bài không chỉ hiện một chỗ: trang module dạng dải cắt nó
   * thành 172×130, dạng specimen cắt 3:2. Đặt xong mà không căn thì chủ site
   * phải tự đi tìm xem nó rơi vào khung nào — nên mở khung căn ngay, bày cả hai
   * hình cắt, và đóng lại là xong.
   */
  const [framing, setFraming] = useState<string | null>(null)
  function saveHero(url: string) {
    setPost((prev) => (prev ? { ...prev, hero_image_url: url } : prev))
    updatePost(postId, { hero_image_url: url })
  }

  function applyPatch(patch: EditPatch) {
    setPost((prev) => (prev ? { ...prev, ...(patch as Partial<PostDetail>) } : prev))
    updatePost(postId, patch as Parameters<typeof updatePost>[1])
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: ink.muted, marginBottom: 14 }}>
        Template:
        {/*
          Changing it here rather than by going back: the post already exists,
          so there is nowhere to go back to. Only while it is still empty — the
          templates hold structurally different bodies, and switching one that
          has been written into would drop the writing on the floor.
        */}
        {hasContent ? (
          <b style={{ color: ink.strong, fontWeight: 500 }}>{TEMPLATE_LABEL[template]}</b>
        ) : (
          <select
            aria-label="Template"
            value={template}
            onChange={(e) => applyPatch({ template: e.target.value } as EditPatch)}
            style={{
              fontFamily: 'inherit',
              fontSize: 12,
              color: ink.strong,
              background: paper.white,
              border: `1px solid ${paper.rule}`,
              padding: '3px 8px',
            }}
          >
            {Object.entries(TEMPLATE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        )}
        <HeroPicker
          onPick={(f) => void setHero(f)}
          onLink={(url) => {
            saveHero(url)
            setFraming(url)
          }}
          hasHero={Boolean(post.hero_image_url)}
        />
        {post.hero_image_url && (
          <button
            onClick={() => setFraming(post.hero_image_url)}
            style={{ fontFamily: 'inherit', fontSize: 12, color: ink.green, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            đặt vào khung
          </button>
        )}
        {framing && (
          <FocusPicker
            url={framing}
            name="Ảnh bìa · hiện ở danh sách bài trong module"
            /* Khung kéo lấy hình cắt hẹp hơn — căn vừa nó thì hình kia luôn vừa. */
            ratio={172 / 130}
            previews={[
              { label: 'module dạng dải · 172×130', ratio: 172 / 130 },
              { label: 'module dạng specimen · 3:2', ratio: 3 / 2 },
            ]}
            onCancel={() => setFraming(null)}
            onSave={(url) => {
              saveHero(url)
              setFraming(null)
            }}
          />
        )}
        {/*
          * The colour a post wears stays changeable after it exists — it is
          * decided when the post is made, and the first draft is exactly when
          * somebody discovers the colour was wrong.
          */}
        <span style={{ marginLeft: 'auto' }}>
          <ThemePicker
            value={post.theme_color}
            moduleColor={activeModule?.accent}
            moduleLabel={activeModule?.title}
            themes={modules.map((m) => ({ id: m.id, label: m.title, color: m.accent }))}
            onChange={(theme_color) => applyPatch({ theme_color })}
          />
        </span>
      </div>
      <EditorCanvas
        template={template}
        post={post}
        module={activeModule}
        onChange={applyPatch}
        onHeroDrop={setHero}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, maxWidth: 1320 }}>
        <span style={{ fontSize: 11, color: ink.muted }}>Tự lưu khi rời khỏi ô soạn · trạng thái hiện tại: {post.status}</span>
        <div>
          {/* Opens the preview screen in a new tab via the ?preview= deep
              link the Admin area reads on mount (App.tsx's `initialState`) —
              screens have no URL of their own otherwise, so this query param
              is the one place a real link is used instead of a nav() call. */}
          <a href={`/admin?preview=${postId}`} target="_blank" rel="noreferrer" className="admin-btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Xem trước ↗
          </a>
          <button onClick={() => nav.goCms()} className="admin-btn-ghost" style={{ marginLeft: 8 }}>
            Lưu nháp
          </button>
          <button
            onClick={async () => {
              await transitionStatus(postId, 'publish')
              nav.goCms()
            }}
            className="admin-btn"
            style={{ marginLeft: 8 }}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditorCanvas — the actual WYSIWYG editing surface. Every editable field is
// wired through post-renderer's own render-prop overrides, so what's on
// screen while editing is exactly the public render. Port of the standalone
// admin app's app/posts/[id]/edit/EditorCanvas.tsx, verbatim apart from
// import paths.
// ---------------------------------------------------------------------------

export function EditorCanvas({ template, post, module, onChange, onHeroDrop }: CanvasProps) {
  return (
    /*
      The cover used to have a drop strip of its own above the canvas, so the
      picture appeared twice: once in a box that was not the page, and again
      below where the page actually puts it. Now it appears where it appears,
      and the page itself takes the drop.
    */
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) onHeroDrop(file)
      }}
      style={{ maxWidth: 1320 }}
    >
      <EditorStyles />
      <div style={{ border: `1px solid ${paper.rule}`, overflow: 'hidden', background: paper.white }}>
        {template === 'cards' ? (
          <CardsEditor post={post} module={module} onChange={onChange} />
        ) : template === 'report' ? (
          <ReportEditor post={post} module={module} onChange={onChange} />
        ) : template === 'memo' ? (
          <MemoEditor post={post} module={module} onChange={onChange} />
        ) : template === 'longform' ? (
          <LongformEditor post={post} module={module} onChange={onChange} />
        ) : (
          <ArticleEditor post={post} module={module} onChange={onChange} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// shared bits: hover-to-edit style, the editable text field, the hero uploader
// ---------------------------------------------------------------------------

function EditorStyles() {
  return (
    <style>{`
      .awc-editable{ transition: border-color .12s, background-color .12s; }
      .awc-editable:hover, .awc-editable:focus{ border-color: rgba(0,0,0,.3); background: rgba(255,255,255,.4); outline: none; }
      .awc-hero-drop:hover{ border-color: rgba(0,0,0,.45); }
      .awc-plus-btn{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: #8C8674; background: transparent; border: 1px dashed #EBE5D3; border-radius: 4px; padding: 5px 10px; cursor: pointer; margin: 8px 0; }
      .awc-plus-btn:hover{ border-color: #8C8674; color: #3B3729; }
      .awc-insert-menu{ display: flex; flex-wrap: wrap; gap: 18px; padding: 4px 0 14px; }
      .awc-insert-group{ display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
      .awc-insert-cat{ font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: #8C8674; margin-right: 2px; }
      .awc-insert-menu button{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 11px; padding: 6px 10px; border: 1px solid #EBE5D3; border-radius: 4px; background: #fff; cursor: pointer; color: #3B3729; }
      .awc-insert-menu button:hover{ background: #F6F2E2; }
      .awc-rep-grid{ display: grid; column-gap: 20px; }
      .awc-split{ position: relative; cursor: col-resize; justify-self: center; width: 1px; background: #EBE5D3; }
      .awc-split::after{ content: ''; position: absolute; inset: 0 -5px; }
      .awc-split:hover{ background: #8C8674; }
      .awc-rep-block{ position: relative; padding-left: 26px; padding-right: 50px; margin-bottom: 4px; }

      /* the handle: drag to reorder, Delete to remove — and it says so */
      .awc-grip{ position: absolute; left: 0; top: 1px; width: 18px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: grab; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1; color: #8C8674; background: transparent; border: none; padding: 0; opacity: .35; transition: opacity .12s, color .12s; }
      .awc-rep-block:hover .awc-grip, .awc-grip:focus-visible{ opacity: 1; }
      .awc-grip:hover{ color: #3B3729; }
      .awc-grip:active{ cursor: grabbing; }
      .awc-grip-tip{ position: absolute; top: calc(100% + 6px); left: 0; white-space: nowrap; background: #23211A; color: #FDFBF2; font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 11px; letter-spacing: .01em; padding: 5px 9px; opacity: 0; pointer-events: none; transition: opacity .12s; z-index: 5; }
      .awc-grip:hover .awc-grip-tip, .awc-grip:focus-visible .awc-grip-tip{ opacity: 1; }
      .awc-dropline{ height: 2px; margin: 6px 0; }

      /* the notes column */
      .awc-note-head{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 9.5px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 8px; }
      .awc-note-row{ position: relative; border-left: 2px solid currentColor; padding-left: 9px; padding-right: 16px; margin-bottom: 8px; }
      .awc-note-x{ position: absolute; right: 0; top: 2px; font-size: 10px; color: #8C8674; background: transparent; border: none; cursor: pointer; padding: 2px; opacity: 0; transition: opacity .12s; }
      .awc-note-row:hover .awc-note-x, .awc-note-x:focus-visible{ opacity: 1; }
      .awc-note-add{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 11.5px; background: transparent; border: none; cursor: pointer; padding: 2px 0; }
      .awc-note-slot{ opacity: .45; transition: opacity .12s; }
      .awc-note-slot:hover, .awc-note-slot:focus-visible{ opacity: 1; }

      /* asked when a block with notes is being deleted */
      .awc-dialog{ position: relative; z-index: 6; border: 1px solid #E4DECB; background: #fff; padding: 14px 16px; max-width: 340px; margin: 10px 0; box-shadow: 0 6px 18px rgba(0,0,0,.1); }
      .awc-dialog-q{ font-size: 13px; color: #23211A; margin-bottom: 10px; }
      .awc-dialog-q b{ font-weight: 500; }
      .awc-opt{ display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 9px; font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 12.5px; color: #5C5745; padding: 7px 9px; border: 1px solid #EFEADA; background: transparent; cursor: pointer; text-align: left; transition: background .12s, color .12s; }
      .awc-opt + .awc-opt{ border-top: none; }
      .awc-opt:hover, .awc-opt:focus-visible{ background: #EFEADA; color: #23211A; }
      .awc-opt-del{ color: #A8443A; }
      .awc-opt-del:hover, .awc-opt-del:focus-visible{ background: rgba(168,68,58,.1); color: #A8443A; }
      .awc-tick{ width: 13px; height: 13px; border: 1px solid #8C8674; flex: none; border-radius: 2px; }
      .awc-opt-del .awc-tick{ border-color: #A8443A; }
      .awc-bar{ height: 2px; background: #EFEADA; overflow: hidden; margin-bottom: 10px; }
      .awc-bar i{ display: block; height: 100%; width: 100%; transform-origin: left; animation: awc-run 2s linear forwards; }
      @keyframes awc-run{ from{ transform: scaleX(1) } to{ transform: scaleX(0) } }
      @media (prefers-reduced-motion: reduce){ .awc-bar i{ animation: none; transform: scaleX(.45) } }
      .awc-undo{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; border: 1px solid currentColor; background: transparent; padding: 6px 12px; cursor: pointer; }
      .awc-block-controls{ position: absolute; right: 0; top: 2px; display: flex; gap: 2px; opacity: .35; }
      .awc-rep-block:hover .awc-block-controls, .awc-rep-block:focus-within .awc-block-controls{ opacity: 1; }
      .awc-block-controls button{ width: 20px; height: 20px; font-size: 11px; border: 1px solid #EBE5D3; background: #fff; cursor: pointer; border-radius: 3px; color: #5C5745; line-height: 1; }
      .awc-mini-add, .awc-mini-remove{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 10.5px; color: #8C8674; background: transparent; border: none; cursor: pointer; padding: 2px; }
      .awc-mini-add:hover, .awc-mini-remove:hover{ color: #3B3729; text-decoration: underline; }
      .awc-metrics-grid{ display: grid; grid-template-columns: repeat(auto-fit,minmax(132px,1fr)); gap: 1px; background: #E6E2D2; margin: 10px 0; }
      .awc-metric-cell{ position: relative; background: #fff; padding: 10px 12px 12px; }
      .awc-chart-bars{ display: flex; align-items: flex-end; gap: 8px; height: 96px; border-left: 1px solid #DDD9C8; border-bottom: 1px solid #DDD9C8; padding-left: 8px; margin-bottom: 10px; }
      .awc-chart-bar{ flex: 1; min-height: 2px; }
      .awc-chart-row{ display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .awc-table-wrap{ position: relative; padding-left: 20px; margin: 10px 0; overflow-x: auto; }
      .awc-table-editor{ border-collapse: collapse; width: 100%; table-layout: fixed; }
      .awc-table-editor th, .awc-table-editor td{ border-bottom: 1px solid #EBE5D3; padding: 6px 8px; text-align: left; vertical-align: top; position: relative; }
      .awc-cell-x, .awc-row-x{ position: absolute; font-size: 10px; color: #8C8674; background: transparent; border: none; cursor: pointer; padding: 2px; opacity: 0; transition: opacity .12s; }
      .awc-cell-x{ right: 10px; top: 4px; }
      .awc-row-x{ left: -18px; top: 7px; }
      .awc-table-editor th:hover .awc-cell-x, .awc-table-editor tr:hover .awc-row-x,
      .awc-cell-x:focus-visible, .awc-row-x:focus-visible{ opacity: 1; }
      .awc-col-split{ position: absolute; top: 0; left: -5px; width: 11px; height: 100%; cursor: col-resize; z-index: 2; }
      .awc-col-split::after{ content: ''; position: absolute; left: 5px; top: 4px; bottom: 4px; width: 1px; background: transparent; }
      .awc-col-split:hover::after{ background: #8C8674; }
      .awc-table-adds{ display: flex; gap: 12px; }
      .awc-image-drop{ cursor: pointer; }
      .awc-heading-row{ display: flex; align-items: flex-start; gap: 10px; }
      .awc-heading-row > :first-child{ flex: 1; min-width: 0; }
      .awc-levels{ display: flex; gap: 2px; opacity: 0; transition: opacity .12s; margin-top: 12px; }
      .awc-rep-block:hover .awc-levels, .awc-levels:focus-within{ opacity: 1; }
      .awc-levels button{ font-family: 'JetBrains Mono', monospace; font-size: 9.5px; width: 22px; height: 20px; border: 1px solid #EBE5D3; background: #fff; color: #8C8674; cursor: pointer; border-radius: 3px; }
      .awc-levels button.on{ background: #23211A; border-color: #23211A; color: #FDFBF2; }
      .awc-quote{ display: flex; gap: 10px; align-items: flex-start; border-left: 2px solid; padding-left: 12px; margin: 10px 0; max-width: 620px; }
      .awc-quote > span{ font-family: 'Playfair Display', Georgia, serif; font-size: 38px; line-height: .8; }
      .awc-quote > div{ flex: 1; min-width: 0; }
      .awc-callout{ border-left: 2px solid; padding: 14px 16px; margin: 10px 0; max-width: 620px; }
      .awc-list-edit{ margin: 10px 0; }
      .awc-list-flag{ display: flex; align-items: center; gap: 6px; font-size: 11px; color: #8C8674; margin-bottom: 10px; }
      .awc-list-flag span{ margin-left: 6px; }
      .awc-list-line{ display: block; position: relative; }
      .awc-list-tools{ position: absolute; right: 0; top: -2px; display: flex; gap: 10px; opacity: 0; transition: opacity .12s; background: rgba(253,251,242,.92); padding-left: 8px; }
      .awc-list-line:hover .awc-list-tools, .awc-list-line:focus-within .awc-list-tools{ opacity: 1; }
    `}</style>
  )
}

function EditableField({
  value,
  onCommit,
  multiline = false,
  rows = 2,
  placeholder,
  focus,
  onFocused,
  onKeyDown,
  style,
}: {
  value: string
  onCommit: (value: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
  /** Put the cursor here — used when an emptied block merges into the text above. */
  focus?: boolean
  onFocused?: () => void
  /**
   * Phím bấm trong ô, cho những thao tác không phải là gõ chữ — Tab lùi lề
   * chẳng hạn.
   *
   * Nhận theo chữ đang có trong ô, chứ không phải một hàm "nộp đi": nộp rồi
   * mới lùi là hai lần ghi, lần sau dựng từ dữ liệu trước lần đầu, nên nó xoá
   * mất chữ vừa gõ. Người nhận phải gộp cả hai vào một lần ghi.
   */
  onKeyDown?: (e: KeyboardEvent<HTMLElement>, current: string) => void
  style?: CSSProperties
}) {
  const [local, setLocal] = useState(value)
  const el = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => setLocal(value), [value])

  /*
   * Ô nhiều dòng cao đúng bằng chữ trong nó.
   *
   * Trước đây `rows` quyết định chiều cao, nên trên long-form một ô cao hai
   * dòng cứng: câu một dòng thừa ra 32px trống, còn đoạn ba dòng chỉ được 58px
   * cho 78px chữ — chữ bị cắt và phải cuộn trong ô. Cùng một nguyên nhân sinh
   * ra cả khoảng trống thừa lẫn chữ bị mất, nên `rows` giờ chỉ là mức thấp
   * nhất, còn chiều cao chạy theo nội dung.
   */
  useEffect(() => {
    const node = el.current
    if (!multiline || !node) return
    node.style.height = 'auto'
    const line = parseFloat(getComputedStyle(node).lineHeight) || 0
    node.style.height = `${Math.max(node.scrollHeight, line * rows)}px`
  }, [local, multiline, rows])
  useEffect(() => {
    if (!focus || !el.current) return
    el.current.focus()
    // The cursor lands at the end, where the writer was typing when the block
    // below them disappeared — not at the start of somebody else's sentence.
    const end = el.current.value.length
    el.current.setSelectionRange(end, end)
    onFocused?.()
  }, [focus, onFocused])

  const commit = () => {
    if (local !== value) onCommit(local)
  }

  const commonStyle: CSSProperties = {
    font: 'inherit',
    color: 'inherit',
    letterSpacing: 'inherit',
    margin: 0,
    padding: '2px 4px',
    background: 'transparent',
    border: '1px dashed transparent',
    borderRadius: 3,
    width: '100%',
    display: 'block',
    ...style,
  }

  if (multiline) {
    return (
      <textarea
        ref={el}
        className="awc-editable"
        value={local}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown && ((e) => onKeyDown(e, local))}
        // Ô đã tự cao bằng chữ, nên tay kéo không còn việc gì — và nó là cái
        // dấu `//` nằm rải khắp trang lúc trước.
        style={{ ...commonStyle, resize: 'none', overflow: 'hidden' }}
      />
    )
  }
  return (
    <input
      ref={el}
      className="awc-editable"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown && ((e) => onKeyDown(e, local))}
      style={commonStyle}
    />
  )
}

/** Sets the cover. The picture itself is shown by the page, not by this. */
/**
 * Ảnh bìa: tải lên, hoặc dán một đường dẫn.
 *
 * Trước đây chỉ có tải lên, nên một tấm ảnh đã nằm sẵn ở đâu đó trên mạng vẫn
 * phải tải về rồi tải lên lại. Ô dán link là cùng một lối mà khung ảnh của
 * trang module đã có — hai chỗ đặt ảnh thì nên mở ra bằng cùng một cách.
 */
function HeroPicker({
  onPick,
  onLink,
  hasHero,
}: {
  onPick: (file: File) => void
  onLink: (url: string) => void
  hasHero: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [linking, setLinking] = useState(false)
  const linkStyle: CSSProperties = {
    fontFamily: 'inherit',
    fontSize: 12,
    color: ink.green,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  }
  return (
    <>
      <button onClick={() => inputRef.current?.click()} style={linkStyle}>
        {hasHero ? 'đổi ảnh bìa' : 'thêm ảnh bìa'}
      </button>
      <span style={{ color: ink.faint, fontSize: 11 }}>hoặc</span>
      <button onClick={() => setLinking((v) => !v)} style={linkStyle}>
        đặt link
      </button>
      {linking && (
        <input
          autoFocus
          placeholder="dán link ảnh rồi Enter"
          onKeyDown={(e) => {
            if (e.key === 'Escape') return setLinking(false)
            if (e.key !== 'Enter') return
            const v = (e.target as HTMLInputElement).value.trim()
            setLinking(false)
            if (v) onLink(v)
          }}
          onBlur={() => setLinking(false)}
          style={{
            fontFamily: 'inherit',
            fontSize: 12,
            padding: '3px 8px',
            border: `1px solid ${paper.rule}`,
            background: paper.white,
            minWidth: 260,
          }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onPick(file)
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// article — every editable field is wired through Article's own overrides,
// so what's on screen while editing is exactly the public render.
// ---------------------------------------------------------------------------

function ArticleEditor({ post, module, onChange }: { post: PostDetail; module?: Module; onChange: (patch: EditPatch) => void }) {
  const mobile = useIsMobile()
  // Same adapter as the public journal, so the canvas is edited against what
  // will actually ship.
  const data = toArticleData(post, module?.title ?? post.module_id, [], -1, module)
  const sections = getBody<SectionData>(post)
  const further_reading = post.further_reading ?? []
  /*
   * The list operations hand back the very same array when they refused — the
   * last section, a move to nowhere. Writing that would send a PATCH saying
   * nothing changed, and tell the writer their click did something.
   */
  const setSections = (next: SectionData[]) => {
    if (next !== sections) onChange({ body: next })
  }
  const drag = useRowDrag((from, to) => setSections(move(sections, from, to)))

  function updateSection(index: number, patch: Partial<SectionData>) {
    onChange({ body: sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) })
  }
  function updateFurtherReading(index: number, value: string) {
    onChange({ further_reading: further_reading.map((r, i) => (i === index ? value : r)) })
  }

  return (
    <PostRenderer
      mobile={mobile}
      template="article"
      post={data}
      renderTitle={(title) => <EditableField value={title} onCommit={(v) => onChange({ en: v })} />}
      renderLead={(lead) => <EditableField value={lead} multiline rows={2} onCommit={(v) => onChange({ lead: v })} />}
      renderSectionHeading={(h, i) => <EditableField value={h} onCommit={(v) => updateSection(i, { h: v })} />}
      renderSectionBody={(p, i) => <EditableField value={p} multiline rows={3} onCommit={(v) => updateSection(i, { p: v })} />}
      renderPullQuote={(pull) => <EditableField value={pull} multiline rows={3} onCommit={(v) => onChange({ pull_quote: v })} />}
      /*
       * Chú thích ảnh và ghi chú bên lề. Cả hai hiện trên trang mà không có ô
       * nào gõ được — đo trên ba bài Article nháp thì đây là hai mẩu duy nhất
       * còn hụt.
       */
      renderFigureNote={(note, i) => (
        <EditableField
          value={note}
          multiline
          rows={1}
          placeholder="ghi chú bên lề"
          onCommit={(v) => updateSection(i, { fig: { ...(sections[i].fig as object), note: v } as never })}
        />
      )}
      renderFigureCaption={(caption, i) => (
        <EditableField
          value={caption}
          multiline
          rows={1}
          placeholder="chú thích ảnh"
          onCommit={(v) => updateSection(i, { fig: { ...(sections[i].fig as object), caption: v } as never })}
        />
      )}
      renderFurtherReadingItem={(item, i) => <EditableField value={item} onCommit={(v) => updateFurtherReading(i, v)} />}
      wrapSection={(section, i) => (
        <RowShell
          noun="phần"
          index={i}
          drag={drag}
          onMove={(dir) => setSections(move(sections, i, i + dir))}
          onRemove={() => setSections(removeAt(sections, i, true))}
          onDuplicate={() => setSections(duplicateAt(sections, i))}
        >
          {section}
        </RowShell>
      )}
      renderAfterSections={() => (
        <AddRow label="phần" onAdd={() => setSections(insertAt(sections, sections.length, { h: '', p: '' }))} />
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// cards — Cards has no override for the top-level post title, so that one
// field gets a small editor bar above the real (otherwise unmodified) canvas.
// ---------------------------------------------------------------------------

/**
 * Memo — Ghi 01's format, edited in place.
 *
 * Its title, the line under it and each section heading are the post's own
 * fields, so those are editable; the runs inside a section are the writing
 * itself and stay as they are, the same as long-form.
 */
/**
 * Memo — one flat run of elements, each with its own handle.
 *
 * A section used to be a container with the heading as a property of it, so
 * taking hold of the heading took hold of everything filed underneath and there
 * was no way to say otherwise. That container was a leftover of the old
 * storage. Flat, a heading is an element like any other, and every element in
 * the post obeys one rule instead of two.
 */
/**
 * Long-form — sửa được ngay trên trang nó sẽ in ra.
 *
 * Bài dài nhất trên site có 400 khối và trước lượt này **không sửa được một
 * chữ**: màn soạn vẽ nó ra để nhìn, không một ô nhập nào, kể cả tiêu đề. Lý do
 * cũ là chữ ấy vốn là bản xuất từ Notion nên đừng động vào — nhưng "không sửa
 * được" không phải câu trả lời cho "đừng sửa sai cách".
 *
 * Mỗi dòng chữ là một ô, ghi ngược lại đúng khối nó thuộc về. Định dạng trong
 * dòng (nghiêng, nét dày) nằm ở các `run`; ô chữ thường chỉ sửa được phần chữ,
 * nên **định dạng của dòng vừa sửa sẽ về mặc định** — và điều đó hiện rõ ngay
 * trên trang trong lúc sửa, không phải một thứ mất lặng lẽ.
 */
function LongformEditor({
  post,
  module,
  onChange,
}: {
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
}) {
  const mobile = useIsMobile()
  /*
   * Bài trong kho có thể vẫn còn khối `cont` cũ. Ghi lại thì ghi cả bài ở dạng
   * mới — nửa cũ nửa mới trong một `body` là chỗ để lẫn về sau.
   */
  const blocks = normalizeBlocks(getBody<LongformBlock>(post))
  const write = (next: LongformBlock[]) => onChange({ body: next })
  const at = (i: number, f: (b: LongformBlock) => LongformBlock) =>
    write(blocks.map((b, j) => (j === i ? f(b) : b)))

  /**
   * Chữ mới vào đúng chỗ của nó.
   *
   * `sub` chỉ tới một khối con bên trong `aside`. Không có `sub` thì ghi vào
   * chính khối ấy. Công thức lưu chữ ở `v`, mọi khối khác lưu ở `runs` — ghi
   * nhầm chỗ thì chữ biến mất khỏi trang trong khi dữ liệu vẫn còn.
   */
  const setText = (b: LongformBlock, v: string, sub?: number): LongformBlock => {
    if (sub !== undefined)
      return { ...b, items: (b.items ?? []).map((c, j) => (j === sub ? setText(c, v) : c)) }
    return b.k === 'formula' ? { ...b, v } : { ...b, runs: longformTextToRuns(v) }
  }

  /**
   * Tab lùi vào, Shift+Tab lùi ra.
   *
   * Đoạn văn lùi theo `ind`, gạch đầu dòng lùi theo cấp lồng `lvl` của nó —
   * cùng một cử chỉ cho cùng một ý, dù trong kho là hai trường khác nhau.
   * Khối không có gì để lùi thì để Tab chạy như thường: nó nhảy sang ô sau,
   * đó là điều người dùng chờ đợi ở bàn phím.
   */
  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLElement>, current: string) => {
    if (e.key !== 'Tab') return
    const b = blocks[i]
    if (!b || (b.k !== 'p' && b.k !== 'li')) return
    e.preventDefault()
    const by = e.shiftKey ? -1 : 1
    // Chữ đang gõ và bậc lùi đi cùng một lần ghi. Nộp chữ rồi lùi thành hai
    // lần, lần sau dựng từ `blocks` cũ, và chữ vừa gõ mất.
    at(i, (x) => {
      const text = { ...x, runs: longformTextToRuns(current) }
      if (x.k === 'li') return { ...text, lvl: Math.max(1, Math.min(3, (x.lvl ?? 1) + by)) }
      return stepIndent(text, by)
    })
  }

  const drag = useRowDrag((from, to) => write(move(blocks, from, to)))

  /*
   * Khối trắng theo loại. Tiêu đề mở ra một tầng mới, đoạn văn là thứ hay thêm
   * nhất, còn công thức và ghi chú là hai khối long-form có mà nơi khác không.
   */
  const BLANK: Record<string, LongformBlock> = {
    p: { k: 'p', runs: [{ t: '', w: '300', s: 'normal' }] },
    h2: { k: 'h2', runs: [{ t: '', w: '300', s: 'normal' }] },
    h3: { k: 'h3', runs: [{ t: '', w: '300', s: 'normal' }] },
    li: { k: 'li', runs: [{ t: '', w: '300', s: 'normal' }], lvl: 1 },
    formula: { k: 'formula', v: '' },
    note: { k: 'note', runs: [{ t: '', w: '300', s: 'normal' }] },
  }
  const LABEL: Record<string, string> = {
    p: 'đoạn văn', h2: 'tiêu đề', h3: 'tiêu đề nhỏ', li: 'gạch đầu dòng',
    formula: 'công thức', note: 'ghi chú',
  }

  return (
    <PostRenderer
      mobile={mobile}
      template="longform"
      post={toLongformData(post, module)}
      wrapBlock={(drawn, i, kind) => (
        <RowShell
          noun={LABEL[kind] ?? 'khối'}
          index={i}
          drag={drag}
          onMove={(dir) => write(move(blocks, i, i + dir))}
          onRemove={() => write(removeAt(blocks, i, true))}
          onDuplicate={() => write(duplicateAt(blocks, i))}
        >
          {drawn}
        </RowShell>
      )}
      renderAfterBlocks={() => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '18px 0 8px' }}>
          {Object.keys(BLANK).map((kind) => (
            <button
              key={kind}
              type="button"
              className="awc-plus-btn"
              onClick={() => write(insertAt(blocks, blocks.length, BLANK[kind]))}
            >
              + {LABEL[kind]}
            </button>
          ))}
        </div>
      )}
      renderText={(text, i, sub) => (
        <EditableField
          value={text}
          multiline
          rows={1}
          placeholder="dòng chữ"
          /*
           * Công thức lưu chữ ở `v` chứ không phải `runs`. Ghi nhầm chỗ thì
           * công thức biến mất khỏi trang mà dữ liệu vẫn còn — nên phải hỏi
           * khối là loại gì trước khi ghi.
           */
          onCommit={(v) => at(i, (b) => setText(b, v, sub))}
          onKeyDown={sub === undefined ? onKeyDown(i) : undefined}
          style={{ font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}
        />
      )}
    />
  )
}

function MemoEditor({
  post,
  module,
  onChange,
}: {
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
}) {
  const mobile = useIsMobile()
  const palette = paletteFrom(post.theme_color ?? module?.accent ?? REPORT_BLUE, post.theme_color ? undefined : module?.on_color)
  const data = toMemoData(post, module)
  const elements = flatElements(post.body as { sections?: never[]; elements?: unknown[] }) as ReportBlock[]
  const [menuAt, setMenuAt] = useState<number | null>(null)

  /** Một dòng thông số, sửa tại chỗ; phần còn lại của thân bài giữ nguyên. */
  const specs = ((post.body as { specs?: { k: string; v: string }[] } | null)?.specs ?? [])
  const setSpec = (i: number, patch: Partial<{ k: string; v: string }>) =>
    onChange({
      body: { ...(post.body as object), specs: specs.map((s, j) => (j === i ? { ...s, ...patch } : s)) },
    })

  /*
   * Writing always produces `elements` and drops `sections`, so a post has one
   * representation from the first edit rather than two that can disagree.
   */
  const write = (next: ReportBlock[]) => {
    const { sections, ...rest } = (post.body ?? {}) as Record<string, unknown>
    void sections
    onChange({ body: { ...rest, elements: next } })
  }
  const drag = useRowDrag((from, to) => write(move(elements, from, to)))

  return (
    <PostRenderer
      mobile={mobile}
      template="memo"
      post={data}
      renderTitle={(title) => <EditableField value={title} onCommit={(v) => onChange({ en: v })} />}
      renderSubtitle={(subtitle) => (
        <EditableField
          value={subtitle}
          multiline
          rows={2}
          onCommit={(v) => onChange({ body: { ...(post.body as object), subtitle: v } })}
        />
      )}
      /*
       * Ba dòng thông số đầu trang — Hạt, Nước, Pour. Chúng là điều kiện của
       * buổi pha, tức thứ đổi mỗi lần, mà từ trước tới nay không gõ được ở đâu.
       * Nhãn cũng cho sửa: ba chữ ấy là của chủ site, không phải hệ thống áp.
       */
      renderSpecKey={(key, i) => (
        <EditableField
          value={key}
          placeholder="nhãn"
          onCommit={(v) => setSpec(i, { k: v })}
          style={{ font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' }}
        />
      )}
      renderSpecValue={(value, i) => (
        <EditableField value={value} placeholder="giá trị" onCommit={(v) => setSpec(i, { v })} />
      )}
      wrapElement={(_drawn, i) => (
        <div key={i}>
          <RowShell
            noun="khối"
            index={i}
            drag={drag}
            onMove={(dir) => write(move(elements, i, i + dir))}
            onRemove={() => write(removeAt(elements, i))}
            onDuplicate={() => write(duplicateAt(elements, i))}
          >
            <ReportBlockFields
              block={elements[i]}
              palette={palette}
              onChange={(next) => write(elements.map((x, k) => (k === i ? next : x)))}
            />
          </RowShell>
          <InsertRow
            open={menuAt === i}
            onToggle={() => setMenuAt(menuAt === i ? null : i)}
            onInsert={(t) => {
              write(insertAt(elements, i + 1, blankReportBlock(t)))
              setMenuAt(null)
            }}
          />
        </div>
      )}
      renderAfterElements={() =>
        elements.length === 0 ? (
          <InsertRow
            open={menuAt === -1}
            onToggle={() => setMenuAt(menuAt === -1 ? null : -1)}
            onInsert={(t) => {
              write(insertAt(elements, 0, blankReportBlock(t)))
              setMenuAt(null)
            }}
          />
        ) : null
      }
    />
  )
}

function CardsEditor({ post, module, onChange }: { post: PostDetail; module?: Module; onChange: (patch: EditPatch) => void }) {
  const mobile = useIsMobile()
  const data = toCardsData(post, module)
  const cards = getBody<CardData>(post)
  const setCards = (next: CardData[]) => {
    if (next !== cards) onChange({ body: next })
  }
  const drag = useRowDrag((from, to) => setCards(move(cards, from, to)))

  function updateCard(cardIndex: number, patch: Partial<CardData>) {
    onChange({ body: cards.map((c, i) => (i === cardIndex ? { ...c, ...patch } : c)) })
  }
  function updatePart(cardIndex: number, partIndex: number, nextPart: CardPart) {
    onChange({
      body: cards.map((c, i) =>
        i === cardIndex ? { ...c, parts: c.parts.map((p, pi) => (pi === partIndex ? nextPart : p)) } : c,
      ),
    })
  }
  function updatePartHeading(cardIndex: number, partIndex: number, heading: string) {
    const card = cards[cardIndex]
    updatePart(cardIndex, partIndex, { ...card.parts[partIndex], heading })
  }

  return (
    <div>
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${paper.rule}`, background: paper.hover }}>
        <label style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: ink.muted, display: 'block', marginBottom: 6 }}>
          Tiêu đề bài (template Cards không có ô sửa trực tiếp trong canvas)
        </label>
        <EditableField value={post.en} onCommit={(v) => onChange({ en: v })} style={{ fontFamily: serif, fontSize: 20 }} />
      </div>
      <PostRenderer
      mobile={mobile}
        template="cards"
        post={data}
        renderCardTitle={(title, i) => <EditableField value={title} onCommit={(v) => updateCard(i, { title: v })} />}
        renderCardSub={(sub, i) => <EditableField value={sub} onCommit={(v) => updateCard(i, { sub: v })} />}
        renderCardTag={(tag, i) => <EditableField value={tag} onCommit={(v) => updateCard(i, { tag: v })} />}
        // Cards.tsx only renders renderPartHeading's result when renderPartBody is
        // *not* also provided — with both set, its computed `heading` value is
        // silently dropped and only renderPartBody's return is shown. So the part
        // heading is edited inside CardPartBodyEditor instead of via a separate
        // renderPartHeading override, which would render nothing here.
        renderPartBody={(part, ci, pi) => (
          <CardPartBodyEditor part={part} onCommitHeading={(v) => updatePartHeading(ci, pi, v)} onChange={(next) => updatePart(ci, pi, next)} />
        )}
        wrapCard={(card, i) => (
          <RowShell
            noun="thẻ"
            index={i}
            drag={drag}
            onMove={(dir) => setCards(move(cards, i, i + dir))}
            onRemove={() => setCards(removeAt(cards, i, true))}
            onDuplicate={() => setCards(duplicateAt(cards, i, copyCard))}
          >
            {card}
            <GroupPicker
              chosen={cards[i]?.groups ?? []}
              onToggle={(g) => {
                const now = cards[i]?.groups ?? []
                updateCard(i, { groups: now.includes(g) ? now.filter((x) => x !== g) : [...now, g] })
              }}
            />
          </RowShell>
        )}
        renderAfterCards={() => <AddRow label="thẻ" onAdd={() => setCards(insertAt(cards, cards.length, blankCard(cards)))} />}
      />
    </div>
  )
}

/**
 * Nhóm hương của một thẻ.
 *
 * Nhóm không hiện trên mặt thẻ — chúng chỉ nuôi thanh lọc ở đầu trang. Nghĩa là
 * một thẻ không nhóm thì viết xong rồi *không tìm thấy được*, và cho tới nay
 * không có chỗ nào đặt nhóm cho nó: `blankCard` chép nhóm của thẻ đứng trước
 * chính vì lý do ấy, một cách vá chứ không phải một cách chọn.
 *
 * Từ vựng lấy thẳng từ bộ vẽ, không chép lại: hai bản sao của một danh sách là
 * cách chắc chắn nhất để chúng lệch nhau.
 */
function GroupPicker({
  chosen,
  onToggle,
}: {
  chosen: readonly string[]
  onToggle: (group: string) => void
}) {
  const [adding, setAdding] = useState(false)
  /*
   * Nhóm ngoài bánh xe hương, do chủ site tự đặt.
   *
   * Bộ vẽ đã đỡ sẵn: nhóm nào không nằm trong mười bốn tên chuẩn thì lấy màu
   * từ bảng dự phòng và xếp sau. Thiếu mỗi chỗ nhập — nên bộ thẻ nào cần một
   * nhóm riêng ("hạt", "khói") thì cho tới nay không đặt được.
   */
  const extras = chosen.filter((g) => !FLAVOR_GROUP_NAMES.includes(g))
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 0 2px' }}>
      <span style={{ ...tinyLabel, alignSelf: 'center', marginRight: 4 }}>Nhóm</span>
      {[...FLAVOR_GROUP_NAMES, ...extras].map((g) => {
        const on = chosen.includes(g)
        const meta = flavorGroupMeta(g)
        return (
          <button
            key={g}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(g)}
            style={{
              fontFamily: sans,
              fontSize: 9.5,
              letterSpacing: '.06em',
              padding: '3px 8px',
              borderRadius: 999,
              cursor: 'pointer',
              border: `1px solid ${on ? (meta?.hue ?? ink.base) : paper.rule}`,
              background: on ? (meta?.wash ?? paper.hover) : 'transparent',
              color: on ? (meta?.ink ?? ink.base) : ink.muted,
            }}
          >
            {g}
          </button>
        )
      })}
      {adding ? (
        <input
          autoFocus
          placeholder="tên nhóm mới rồi Enter"
          onKeyDown={(e) => {
            if (e.key === 'Escape') return setAdding(false)
            if (e.key !== 'Enter') return
            const v = (e.target as HTMLInputElement).value.trim()
            setAdding(false)
            if (v && !chosen.includes(v)) onToggle(v)
          }}
          onBlur={() => setAdding(false)}
          style={{
            fontFamily: sans,
            fontSize: 9.5,
            padding: '3px 8px',
            borderRadius: 999,
            border: `1px dashed ${ink.faint}`,
            background: 'transparent',
            minWidth: 150,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            fontFamily: sans,
            fontSize: 9.5,
            letterSpacing: '.06em',
            padding: '3px 8px',
            borderRadius: 999,
            cursor: 'pointer',
            border: `1px dashed ${paper.rule}`,
            background: 'transparent',
            color: ink.muted,
          }}
        >
          + nhóm mới
        </button>
      )}
    </div>
  )
}

const tinyLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 9,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: ink.faint,
}

/**
 * A fresh card.
 *
 * It borrows the colour and the flavour groups of the card before it: a new
 * card almost always belongs beside the one it was added after, and a card
 * with no group at all cannot be found by the filter bar at the top of the
 * page — it would be written and then invisible.
 */
function blankCard(cards: CardData[]): CardData {
  const last = cards[cards.length - 1]
  return {
    n: String(cards.length + 1).padStart(2, '0'),
    hue: last?.hue ?? '#8A8A7C',
    groups: last ? [...last.groups] : [],
    title: '',
    sub: '',
    tag: '',
    parts: [],
  }
}

/** A card owns its groups and its parts; a copy must not share either. */
function copyCard(c: CardData): CardData {
  return { ...c, groups: [...c.groups], parts: c.parts.map((p) => ({ ...p })) }
}

function CardPartBodyEditor({
  part,
  onCommitHeading,
  onChange,
}: {
  part: CardPart
  onCommitHeading: (heading: string) => void
  onChange: (next: CardPart) => void
}) {
  if (part.type === 'method') {
    return (
      <div>
        <EditableField
          value={part.heading}
          onCommit={onCommitHeading}
          style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', color: ink.muted, marginBottom: 9 }}
        />
        <EditableField
          value={part.body}
          multiline
          rows={3}
          onCommit={(v) => onChange({ ...part, body: v })}
          style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 620 }}
        />
      </div>
    )
  }

  if (part.type === 'detail') {
    return (
      <div>
        <EditableField
          value={part.heading}
          onCommit={onCommitHeading}
          style={{ fontWeight: 500, fontStyle: 'italic', fontSize: 14, marginBottom: 12 }}
        />
        {part.rows.map((r, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '9px 0', borderTop: '1px solid #F0EBDB' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <EditableField
                value={r.label}
                onCommit={(v) => onChange({ ...part, rows: part.rows.map((row, i) => (i === ri ? { ...row, label: v } : row)) })}
                style={{ fontSize: 15, lineHeight: 1.45 }}
              />
              <EditableField
                value={r.note ?? ''}
                placeholder="ghi chú (tuỳ chọn)"
                onCommit={(v) => onChange({ ...part, rows: part.rows.map((row, i) => (i === ri ? { ...row, note: v } : row)) })}
                style={{ fontStyle: 'italic', fontSize: 13.5, marginTop: 4 }}
              />
            </div>
            <div style={{ flex: 'none', width: 30 }}>
              <EditableField
                value={r.score}
                onCommit={(v) => onChange({ ...part, rows: part.rows.map((row, i) => (i === ri ? { ...row, score: v } : row)) })}
                style={{ fontFamily: serif, fontSize: 19, color: ink.green, textAlign: 'right' }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // callout
  return (
    <div style={{ background: '#F4F2E8', padding: '18px 20px 19px', maxWidth: 640 }}>
      <EditableField
        value={part.heading}
        onCommit={onCommitHeading}
        style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', color: ink.muted, marginBottom: 10 }}
      />
      {part.lines.map((line, li) => (
        <EditableField
          key={li}
          value={line}
          multiline
          rows={2}
          onCommit={(v) => onChange({ ...part, lines: part.lines.map((l, i) => (i === li ? v : l)) })}
          style={{ fontSize: 14, lineHeight: 1.55 }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// report — the shared Report component is deliberately a read-only render
// (see post-renderer's Report.tsx docblock: "the admin app's insert-menu /
// contentEditable editing chrome is not part of this shared package"). So
// this is a purpose-built admin editor styled to match the same block
// typography and the approved mockup's "+ thêm khối" pattern, operating
// directly on the ReportBlock[] array that PostRenderer's Report will later
// render read-only, byte for byte, on the preview screen.
// ---------------------------------------------------------------------------


/** How long the writer has to take a choice back before it happens. */
const UNDO_MS = 2000

const KEEP_LABEL: Record<KeepChoice, string> = {
  up: 'Lưu lên đoạn trên',
  down: 'Lưu xuống đoạn dưới',
  explorations: `Chuyển sang ${EXPLORATIONS_LABEL}`,
  delete: 'Xoá cùng khối',
}

const KEEP_DONE: Record<KeepChoice, string> = {
  up: 'chuyển lên đoạn trên',
  down: 'chuyển xuống đoạn dưới',
  explorations: `chuyển sang ${EXPLORATIONS_LABEL}`,
  delete: 'xoá cùng khối',
}

function ReportEditor({
  post,
  module,
  onChange,
}: {
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
}) {
  /*
   * Read through the same translator the public page uses. The editor read the
   * stored array raw before, so a post started from a template — which stores
   * its blocks with short keys — opened as a screenful of empty rows: the
   * content was there and nothing on this screen could read it.
   */
  const content = useMemo<ReportContent>(
    () => ({ blocks: ensureIds(toReportBlocks(post.body)), notes: toReportNotes(post.body) }),
    [post.body],
  )
  const { blocks, notes } = content

  const [menuAt, setMenuAt] = useState<number | null>(null)

  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [asking, setAsking] = useState<number | null>(null)
  const [focusAt, setFocusAt] = useState<number | null>(null)
  /*
   * How wide the notes column is while composing. Deliberately not stored: the
   * ratio is a thing the writer does to see better right now, not something
   * about the post. Saving it would make every reader of the post inherit one
   * writer's afternoon.
   */
  const [asideWidth, setAsideWidth] = useState(262)

  /*
   * Everything this screen tints comes from the module's colour, the same way
   * the page derives it — so what the writer sees while composing is what a
   * reader gets, down to the colour of a table heading.
   */
  // The post's own colour wins; without one it follows its module. See 0021.
  const palette = paletteFrom(post.theme_color ?? module?.accent ?? REPORT_BLUE, post.theme_color ? undefined : module?.on_color)
  const accent = palette.accent
  const onAccent = palette.onAccent
  const noteIds = [...notes.explorations, ...notes.fieldNotes].map((n) => n.id)
  /*
   * The same segments the page uses, so what the writer arranges here is what
   * a reader gets — the explorations at the head of the column in both, and a
   * note still level with the block it hangs off. See `segmentsFor`.
   */
  const segments = segmentsFor(blocks, notes)
  const firstAnnotated = segments.findIndex((seg) => seg.anchor)

  function addFieldNote(blockId?: string) {
    if (!blockId) return
    write({ blocks, notes: { ...notes, fieldNotes: [...notes.fieldNotes, { id: nextId('n', noteIds), anchor: blockId, text: '' }] } })
  }

  function write(next: ReportContent) {
    onChange({ body: toBody(next) })
  }
  function setBlocks(next: ReportBlock[]) {
    write({ blocks: next, notes })
  }
  function updateBlock(i: number, next: ReportBlock) {
    setBlocks(blocks.map((b, idx) => (idx === i ? next : b)))
  }
  function insertBlock(afterIndex: number, type: string) {
    const next = [...blocks]
    next.splice(afterIndex + 1, 0, { ...blankReportBlock(type), id: nextId('b', blocks.map((b) => b.id ?? '')) })
    setBlocks(next)
    setMenuAt(null)
  }

  /*
   * Deleting is one path whether the writer pressed Delete on the handle or
   * emptied the last word out of a paragraph. Both destroy a block, so both
   * have to ask about the writing hanging off it — an emptied paragraph that
   * silently took a field note with it would be the worst kind of data loss:
   * the one nobody was warned about.
   */
  function requestRemove(i: number, thenFocus: number | null = null) {
    if (notesOn(notes, blocks[i]?.id).length > 0) {
      setAsking(i)
      return
    }
    write(removeBlock(content, i, 'delete'))
    setFocusAt(thenFocus)
  }

  function commitRemove(i: number, choice: KeepChoice) {
    write(removeBlock(content, i, choice))
    setAsking(null)
  }

  function drop(to: number) {
    if (dragFrom !== null && dragFrom !== to) setBlocks(moveBlock(blocks, dragFrom, to))
    setDragFrom(null)
    setDragOver(null)
  }

  return (
    <div>
      <div style={{ background: accent, color: onAccent, padding: '28px 32px 22px' }}>
        <EditableField
          value={post.en}
          onCommit={(v) => onChange({ en: v })}
          style={{ fontFamily: serif, fontWeight: 400, fontSize: 44, letterSpacing: '-.02em', lineHeight: 1 }}
        />
        <EditableField
          value={post.lead ?? ''}
          placeholder="mô tả ngắn (tuỳ chọn)"
          onCommit={(v) => onChange({ lead: v })}
          style={{ fontSize: 13, marginTop: 10, maxWidth: 420 }}
        />
      </div>

      <div style={{ padding: '20px 32px 40px' }}>
        <InsertRow open={menuAt === -1} onToggle={() => setMenuAt(menuAt === -1 ? null : -1)} onInsert={(t) => insertBlock(-1, t)} />

        <div className="awc-rep-grid" style={{ gridTemplateColumns: `minmax(0,1fr) 11px ${asideWidth}px` }}>
          <ColumnSplit width={asideWidth} onWidth={setAsideWidth} rows={segments.length} />

          {segments.map((seg, si) => (
            <Fragment key={seg.start}>
              <div style={{ gridColumn: 1, gridRow: si + 1, minWidth: 0 }}>
                {blocks.slice(seg.start, seg.end).map((b, bi) => {
                  const i = seg.start + bi
                  return (
                    <div
                      key={b.id ?? i}
                      onDragOver={(e) => {
                        if (dragFrom === null) return
                        e.preventDefault()
                        setDragOver(i)
                      }}
                      onDrop={() => drop(i)}
                    >
                      {dragOver === i && dragFrom !== null && dragFrom !== i && <div className="awc-dropline" style={{ background: accent }} />}
                      <div className="awc-rep-block">
                        <BlockGrip
                          onLift={() => setDragFrom(i)}
                          onDone={() => {
                            setDragFrom(null)
                            setDragOver(null)
                          }}
                          onMove={(dir) => setBlocks(moveBlock(blocks, i, i + dir))}
                          onRemove={() => requestRemove(i)}
                        />
                        <div className="awc-block-controls">
                          {/*
                            * Annotating a block is a thing you do to that block,
                            * so the control is on it — not a faint slot in the
                            * margin you have to find first.
                            */}
                          <button type="button" onClick={() => addFieldNote(b.id)} aria-label="thêm ghi chú cho khối này">
                            ✎
                          </button>
                          <button type="button" onClick={() => write(cloneBlock(content, i))} aria-label="nhân bản khối">
                            ⧉
                          </button>
                          <button type="button" onClick={() => requestRemove(i)} aria-label="xoá khối">
                            ×
                          </button>
                        </div>
                        <ReportBlockFields
                          block={b}
                          palette={palette}
                          focus={focusAt === i}
                          onFocused={() => setFocusAt(null)}
                          onChange={(next) => updateBlock(i, next)}
                          onEmptied={() => requestRemove(i, mergeTarget(blocks, i))}
                        />
                        {asking === i && (
                          <KeepNotesDialog
                            count={notesOn(notes, b.id).length}
                            canUp={i > 0}
                            canDown={i < blocks.length - 1}
                            accent={accent}
                            onDo={(choice) => commitRemove(i, choice)}
                            onCancel={() => setAsking(null)}
                          />
                        )}
                      </div>
                      <InsertRow open={menuAt === i} onToggle={() => setMenuAt(menuAt === i ? null : i)} onInsert={(t) => insertBlock(i, t)} />
                    </div>
                  )
                })}
              </div>

              <div style={{ gridColumn: 3, gridRow: si + 1, minWidth: 0 }}>
                {si === 0 && (
                  <ExplorationsEditor
                    notes={notes}
                    accent={accent}
                    onChange={(explorations) => write({ blocks, notes: { ...notes, explorations } })}
                  />
                )}
                <FieldNotesEditor
                  notes={notes}
                  blockId={seg.anchor}
                  label={si === firstAnnotated ? fieldNotesLabel('report') : null}
                  accent={accent}
                  onChange={(fieldNotes) => write({ blocks, notes: { ...notes, fieldNotes } })}
                />
              </div>
            </Fragment>
          ))}
        </div>

        {blocks.length === 0 && (
          <div style={{ color: ink.muted, fontSize: 13, padding: '8px 0 20px' }}>Chưa có khối nào — bấm "+ thêm khối" để bắt đầu.</div>
        )}
      </div>
    </div>
  )
}

/**
 * The line between the writing and the notes, and the grip on it.
 *
 * Dragging it changes nothing that gets saved — see `asideWidth`. It exists so
 * a writer working on a long note can give it room for a minute and then take
 * the room back.
 */
function ColumnSplit({ width, onWidth, rows }: { width: number; onWidth: (w: number) => void; rows: number }) {
  const from = useRef<{ x: number; w: number } | null>(null)
  return (
    <div
      className="awc-split"
      style={{ gridColumn: 2, gridRow: `1 / ${Math.max(rows, 1) + 1}` }}
      role="separator"
      aria-label="kéo để đổi bề rộng cột ghi chú"
      onPointerDown={(e) => {
        from.current = { x: e.clientX, w: width }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!from.current) return
        const next = from.current.w - (e.clientX - from.current.x)
        onWidth(Math.min(460, Math.max(150, next)))
      }}
      onPointerUp={() => {
        from.current = null
      }}
    />
  )
}

/**
 * The handle in the left margin.
 *
 * One control, and hovering it says so: drag to reorder, Delete to remove.
 * The same two things work from the keyboard — arrows move, Delete removes —
 * because a handle that can only be dragged is a handle half the people using
 * it cannot reach.
 */
function BlockGrip({
  onLift,
  onDone,
  onMove,
  onRemove,
}: {
  onLift: () => void
  onDone: () => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <button
      type="button"
      className="awc-grip"
      draggable
      onDragStart={onLift}
      onDragEnd={onDone}
      aria-label="Kéo thả để đổi thứ tự · Delete để xoá"
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          onMove(-1)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          onMove(1)
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          onRemove()
        }
      }}
    >
      ⠿
      <span className="awc-grip-tip">Kéo thả để đổi thứ tự · Delete để xoá</span>
    </button>
  )
}

/**
 * Asked when a block being deleted has writing beside it.
 *
 * One open list, no confirm step: ticking a line is the decision, and the two
 * seconds after it are the way back. Deleting the notes is a line in the same
 * list rather than a button off to the side, because it is the same kind of
 * choice as the other three — where this writing goes.
 */
function KeepNotesDialog({
  count,
  canUp,
  canDown,
  accent,
  onDo,
  onCancel,
}: {
  count: number
  canUp: boolean
  canDown: boolean
  accent: string
  onDo: (choice: KeepChoice) => void
  onCancel: () => void
}) {
  const [choice, setChoice] = useState<KeepChoice | null>(null)
  const act = useRef(onDo)
  useEffect(() => {
    act.current = onDo
  })
  useEffect(() => {
    if (!choice) return
    const t = setTimeout(() => act.current(choice), UNDO_MS)
    return () => clearTimeout(t)
  }, [choice])

  const options: KeepChoice[] = [
    ...(canUp ? (['up'] as KeepChoice[]) : []),
    ...(canDown ? (['down'] as KeepChoice[]) : []),
    'explorations',
    'delete',
  ]

  if (choice) {
    return (
      <div className="awc-dialog" role="dialog">
        <div className="awc-dialog-q">
          Ghi chú <b>{KEEP_DONE[choice]}</b>.
        </div>
        <div className="awc-bar">
          <i style={{ background: accent }} />
        </div>
        <button type="button" className="awc-undo" style={{ color: accent, borderColor: accent }} onClick={() => setChoice(null)}>
          ← quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="awc-dialog" role="dialog" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="awc-dialog-q">
        Khối này có {count} ghi chú. Làm gì với chúng?
      </div>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={o === 'delete' ? 'awc-opt awc-opt-del' : 'awc-opt'}
          onClick={() => setChoice(o)}
        >
          {KEEP_LABEL[o]}
          <span className="awc-tick" />
        </button>
      ))}
    </div>
  )
}

/** The consecutive run, at the head of the notes column. */
function ExplorationsEditor({
  notes,
  accent,
  onChange,
}: {
  notes: ReportContent['notes']
  accent: string
  onChange: (explorations: ReportContent['notes']['explorations']) => void
}) {
  const taken = [...notes.explorations, ...notes.fieldNotes].map((n) => n.id)
  return (
    <div style={{ marginTop: 16 }}>
      <div className="awc-note-head" style={{ color: accent }}>
        {EXPLORATIONS_LABEL}
      </div>
      {notes.explorations.map((e, i) => (
        <div key={e.id} className="awc-note-row" style={{ borderColor: accent }}>
          <EditableField
            value={e.text}
            multiline
            rows={2}
            placeholder="ghi chú"
            onCommit={(v) => onChange(notes.explorations.map((x, j) => (j === i ? { ...x, text: v } : x)))}
            style={{ fontSize: 12.5, lineHeight: 1.55, color: ink.strong }}
          />
          <button
            type="button"
            className="awc-note-x"
            aria-label="xoá ghi chú"
            onClick={() => onChange(notes.explorations.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="awc-note-add"
        aria-label={`thêm vào ${EXPLORATIONS_LABEL}`}
        style={{ color: accent }}
        onClick={() => onChange([...notes.explorations, { id: nextId('n', taken), text: '' }])}
      >
        + ghi chú
      </button>
    </div>
  )
}

/** The comments hanging off one block, in that block's own row. */
function FieldNotesEditor({
  notes,
  blockId,
  label,
  accent,
  onChange,
}: {
  notes: ReportContent['notes']
  blockId?: string
  label: string | null
  accent: string
  onChange: (fieldNotes: ReportContent['notes']['fieldNotes']) => void
}) {
  if (!blockId) return null
  const mine = notes.fieldNotes.filter((n) => n.anchor === blockId)
  return (
    <div style={{ marginBottom: 14 }}>
      {label && mine.length > 0 && (
        <div className="awc-note-head" style={{ color: accent }}>
          {label}
        </div>
      )}
      {mine.map((n) => (
        <div key={n.id} className="awc-note-row" style={{ borderColor: accent }}>
          <EditableField
            value={n.text}
            multiline
            rows={2}
            placeholder="ghi chú"
            onCommit={(v) => onChange(notes.fieldNotes.map((x) => (x.id === n.id ? { ...x, text: v } : x)))}
            style={{ fontSize: 12.5, lineHeight: 1.55, color: ink.strong }}
          />
          <button
            type="button"
            className="awc-note-x"
            aria-label="xoá ghi chú"
            onClick={() => onChange(notes.fieldNotes.filter((x) => x.id !== n.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

function InsertRow({
  open,
  onToggle,
  onInsert,
}: {
  open: boolean
  onToggle: () => void
  onInsert: (type: string) => void
}) {
  return (
    <div>
      <button type="button" className="awc-plus-btn" onClick={onToggle} aria-expanded={open}>
        + thêm khối
      </button>
      {open && (
        <div className="awc-insert-menu">
          {/*
            * Straight out of the store, grouped the way it files them. It used
            * to be a list written out by hand here, which is how `list` came to
            * exist in the store and be missing from this menu, and how a block
            * kept the name the code calls it — "Meta" — instead of the name it
            * was given for people to read.
            */}
          {(['text', 'data', 'media'] as const).map((category) => {
            const inCategory = allElements().filter((e) => e.category === category)
            if (inCategory.length === 0) return null
            return (
              <div key={category} className="awc-insert-group">
                <div className="awc-insert-cat">{CATEGORY_LABEL[category]}</div>
                {inCategory.map((e) => (
                  <button key={e.name} type="button" title={e.description} onClick={() => onInsert(e.name)}>
                    {e.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const HEADING_SIZE: Record<1 | 2 | 3, number> = { 1: 28, 2: 22, 3: 17 }

const CATEGORY_LABEL: Record<'text' | 'data' | 'media', string> = {
  text: 'Chữ',
  data: 'Số liệu',
  media: 'Hình',
}

/** The grey word standing in for a block with nothing written in it yet. */
const GHOST: Record<string, string | undefined> = Object.fromEntries(
  allElements().map((e) => [e.name, e.title]),
)

function ReportBlockFields({
  block,
  palette,
  focus,
  onFocused,
  onChange,
  onEmptied,
}: {
  block: ReportBlock
  palette: Palette
  focus?: boolean
  onFocused?: () => void
  onChange: (next: ReportBlock) => void
  onEmptied?: () => void
}) {
  /*
   * Emptying the words out of a paragraph is the writer saying there is no
   * paragraph, so the block goes and the cursor joins the text above it.
   * A heading emptied is almost always a heading about to be rewritten, so it
   * keeps its place and shows its name in grey until it is.
   */
  const commitText = (v: string, next: ReportBlock) => {
    if (v.trim() === '' && vanishesWhenEmpty(block) && onEmptied) onEmptied()
    else onChange(next)
  }

  switch (block.type) {
    case 'meta':
      return (
        <EditableField
          value={block.text}
          placeholder={GHOST.meta}
          focus={focus}
          onFocused={onFocused}
          onCommit={(v) => commitText(v, { ...block, text: v })}
          style={{ fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: ink.muted }}
        />
      )
    case 'heading': {
      const level = block.level ?? 1
      return (
        <div className="awc-heading-row">
          <EditableField
            value={block.text}
            placeholder={`${GHOST.heading} ${level}`}
            focus={focus}
            onFocused={onFocused}
            onCommit={(v) => commitText(v, { ...block, text: v })}
            style={{ fontFamily: serif, fontSize: HEADING_SIZE[level], color: level === 3 ? palette.ink : ink.base, margin: '10px 0 6px' }}
          />
          <div className="awc-levels">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={n === level ? 'on' : undefined}
                aria-label={`tiêu đề cấp ${n}`}
                aria-pressed={n === level}
                onClick={() => onChange({ ...block, level: n })}
              >
                H{n}
              </button>
            ))}
          </div>
        </div>
      )
    }
    case 'quote':
      return (
        <div className="awc-quote" style={{ borderColor: palette.edge }}>
          <span aria-hidden style={{ color: palette.edge }}>“</span>
          <div>
            <EditableField
              value={block.text}
              multiline
              rows={2}
              placeholder="trích dẫn"
              onCommit={(v) => onChange({ ...block, text: v })}
              style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.35, color: ink.base }}
            />
            <EditableField
              value={block.attribution ?? ''}
              placeholder="nguồn (tuỳ chọn)"
              onCommit={(v) => onChange({ ...block, attribution: v })}
              style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: palette.ink }}
            />
          </div>
        </div>
      )
    case 'list':
      return <ListEditor attributes={block} palette={palette} onChange={onChange} />
    case 'callout':
      return (
        <div className="awc-callout" style={{ background: palette.tint, borderColor: palette.accent }}>
          <EditableField
            value={block.heading ?? ''}
            placeholder="nhãn (tuỳ chọn)"
            onCommit={(v) => onChange({ ...block, heading: v })}
            style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.ink }}
          />
          <EditableField
            value={block.text}
            multiline
            rows={3}
            placeholder="nội dung khối nhấn"
            onCommit={(v) => onChange({ ...block, text: v })}
            style={{ fontSize: 14.5, lineHeight: 1.55, color: ink.strong }}
          />
        </div>
      )
    case 'paragraph':
      return (
        <EditableField
          value={block.text}
          multiline
          rows={3}
          placeholder={GHOST.paragraph}
          focus={focus}
          onFocused={onFocused}
          onCommit={(v) => commitText(v, { ...block, text: v })}
          style={{ fontSize: 15, lineHeight: 1.55, color: ink.strong, maxWidth: 620 }}
        />
      )
    case 'metrics':
      return <MetricsEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />
    case 'chart':
      return <ChartEditor points={block.points} accent={palette.accent} onChange={(points) => onChange({ ...block, points })} />
    case 'table':
      return <TableEditor table={block.table} palette={palette} onChange={(table) => onChange({ ...block, table })} />
    case 'image':
      return (
        <ImageBlockEditor
          caption={block.caption}
          imageUrl={block.imageUrl}
          palette={palette}
          onChange={(patch) => onChange({ ...block, ...patch })}
        />
      )
  }
}

/**
 * A list, edited where it is read.
 *
 * The first version of this drew its own stack of fields, and that was wrong in
 * a way worth naming: the numbers, the bullets and the indenting all vanished,
 * so a phase reading `#2` on the page — which only means anything beside the
 * `02` in front of it — read as nonsense while it was being written. The rest
 * of this screen edits on the real canvas for exactly that reason.
 *
 * So the element draws itself, and the lines inside it are fields.
 */
function ListEditor({
  attributes,
  palette,
  onChange,
}: {
  attributes: ListAttrs
  palette: Palette
  onChange: (next: ReportBlock) => void
}) {
  const element = getElement('list')!
  const write = (items: ListItem[]) => onChange({ ...attributes, items } as unknown as ReportBlock)

  /** Rewrites the one item a path points at, however deep it sits. */
  function at(items: ListItem[], path: number[], change: (item: ListItem) => ListItem): ListItem[] {
    const [head, ...rest] = path
    return items.map((item, i) => {
      if (i !== head) return item
      return rest.length === 0 ? change(item) : { ...item, children: at(item.children ?? [], rest, change) }
    })
  }

  /** Drops the one item a path points at; the last top-level line stays. */
  function without(items: ListItem[], path: number[]): ListItem[] {
    const [head, ...rest] = path
    if (rest.length === 0) return items.length > 1 ? removeAt(items, head) : items
    return items.map((item, i) =>
      i === head ? { ...item, children: without(item.children ?? [], rest) } : item,
    )
  }

  return (
    <div className="awc-list-edit">
      <label className="awc-list-flag">
        <input
          type="checkbox"
          checked={Boolean(attributes.ordered)}
          onChange={(e) => onChange({ ...attributes, ordered: e.target.checked } as unknown as ReportBlock)}
        />
        đánh số
        <span>
          <code>*nhấn*</code> <code>_số đo_</code>
        </span>
      </label>

      <element.View
        attributes={attributes}
        palette={palette}
        index={0}
        render={{
          renderListLine: (text, path) => (
            <span className="awc-list-line">
              <EditableField
                value={text}
                placeholder="một dòng"
                onCommit={(v) => write(at(attributes.items, path, (it) => ({ ...it, runs: textToRuns(v) })))}
                style={{ font: 'inherit', color: 'inherit' }}
              />
              <span className="awc-list-tools">
                <button
                  type="button"
                  className="awc-mini-add"
                  onClick={() => write(at(attributes.items, path, (it) => ({ ...it, sub: [...(it.sub ?? []), ''] })))}
                >
                  + dòng phụ
                </button>
                <button
                  type="button"
                  className="awc-mini-add"
                  onClick={() =>
                    write(at(attributes.items, path, (it) => ({ ...it, children: [...(it.children ?? []), { runs: [{ t: '' }] }] })))
                  }
                >
                  + mục con
                </button>
                <button
                  type="button"
                  className="awc-mini-remove"
                  aria-label="xoá dòng"
                  onClick={() => write(without(attributes.items, path))}
                >
                  xoá dòng
                </button>
              </span>
            </span>
          ),
          renderListSub: (text, path, subIndex) => (
            <EditableField
              value={text}
              placeholder="dòng phụ"
              onCommit={(v) =>
                write(
                  at(attributes.items, path, (it) => ({
                    ...it,
                    sub: v === '' ? it.sub?.filter((_, k) => k !== subIndex) : it.sub?.map((y, k) => (k === subIndex ? v : y)),
                  })),
                )
              }
              style={{ font: 'inherit', color: 'inherit' }}
            />
          ),
          renderAfterList: () => (
            <button
              type="button"
              className="awc-mini-add"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => write(insertAt(attributes.items, attributes.items.length, { runs: [{ t: '' }] }))}
            >
              + dòng
            </button>
          ),
        }}
      />
    </div>
  )
}

function MetricsEditor({ items, onChange }: { items: ReportMetric[]; onChange: (items: ReportMetric[]) => void }) {
  function update(i: number, patch: Partial<ReportMetric>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  return (
    <div className="awc-metrics-grid">
      {items.map((m, i) => (
        <div key={i} className="awc-metric-cell">
          <EditableField
            value={m.label}
            placeholder="nhãn"
            onCommit={(v) => update(i, { label: v })}
            style={{ fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: ink.muted }}
          />
          <EditableField
            value={m.value}
            placeholder="giá trị"
            onCommit={(v) => update(i, { value: v })}
            style={{ fontFamily: serif, fontSize: 22, color: ink.base, marginTop: 4 }}
          />
          <button type="button" className="awc-mini-remove" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="xoá số liệu">
            xoá
          </button>
        </div>
      ))}
      <button type="button" className="awc-mini-add" onClick={() => onChange([...items, { label: '', value: '' }])}>
        + số liệu
      </button>
    </div>
  )
}

function ChartEditor({ points, accent, onChange }: { points: ReportChartPoint[]; accent: string; onChange: (points: ReportChartPoint[]) => void }) {
  function update(i: number, patch: Partial<ReportChartPoint>) {
    onChange(points.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  return (
    <div>
      <div className="awc-chart-bars">
        {points.map((p, i) => (
          <div key={i} className="awc-chart-bar" style={{ height: `${Math.max(0, Math.min(100, p.heightPct))}%`, background: accent }} />
        ))}
      </div>
      {points.map((p, i) => (
        <div key={i} className="awc-chart-row">
          <EditableField value={p.label} placeholder="nhãn" onCommit={(v) => update(i, { label: v })} style={{ fontSize: 11 }} />
          <input
            type="number"
            min={0}
            max={100}
            aria-label={`chiều cao cột ${i + 1}`}
            defaultValue={p.heightPct}
            onBlur={(e) => update(i, { heightPct: Number(e.target.value) || 0 })}
            className="admin-field"
            style={{ width: 70, flex: 'none' }}
          />
          <button type="button" className="awc-mini-remove" onClick={() => onChange(points.filter((_, idx) => idx !== i))} aria-label="xoá điểm">
            xoá
          </button>
        </div>
      ))}
      <button type="button" className="awc-mini-add" onClick={() => onChange([...points, { label: '', heightPct: 50 }])}>
        + điểm
      </button>
    </div>
  )
}

/**
 * The table, drawn the shape it will be read in.
 *
 * The controls used to live inside the table — a spare header cell holding
 * "+ cột", a spare cell on every row holding "xoá hàng" — which gave the
 * editor a column the page does not have, so the widths a writer set here were
 * never the widths a reader saw. They sit outside it now, and the boundaries
 * between headings can be dragged.
 */
function TableEditor({ table, palette, onChange }: { table: ReportTable; palette: Palette; onChange: (table: ReportTable) => void }) {
  const el = useRef<HTMLTableElement>(null)
  const drag = useRef<{ x: number; table: ReportTable } | null>(null)
  const widths = widthsOf(table)

  return (
    <div className="awc-table-wrap">
      <table ref={el} className="awc-table-editor">
        <colgroup>
          {widths.map((w, ci) => (
            <col key={ci} style={{ width: `${w}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {table.columns.map((c, ci) => (
              <th key={ci}>
                <EditableField
                  value={c}
                  placeholder="tên cột"
                  onCommit={(v) => onChange({ ...table, columns: table.columns.map((col, i) => (i === ci ? v : col)) })}
                  style={{ fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.ink }}
                />
                {table.columns.length > 1 && (
                  <button
                    type="button"
                    className="awc-cell-x"
                    onClick={() => onChange(removeColumn(table, ci))}
                    aria-label={`xoá cột ${ci + 1}`}
                  >
                    ✕
                  </button>
                )}
                {/*
                  * The grip for the boundary to this column's LEFT, drawn
                  * inside this cell rather than off the right edge of the one
                  * before it: sibling cells paint in order, so a grip hanging
                  * out of the earlier cell ends up underneath the later one's
                  * field, and the drag selects a heading instead of moving it.
                  */}
                {ci > 0 && (
                  <span
                    className="awc-col-split"
                    role="separator"
                    aria-label={`kéo để đổi bề rộng cột ${ci}`}
                    onPointerDown={(e) => {
                      drag.current = { x: e.clientX, table }
                      e.currentTarget.setPointerCapture(e.pointerId)
                    }}
                    onPointerMove={(e) => {
                      const from = drag.current
                      const box = el.current?.getBoundingClientRect()
                      if (!from || !box || box.width === 0) return
                      onChange(resizeColumn(from.table, ci - 1, ((e.clientX - from.x) / box.width) * 100))
                    }}
                    onPointerUp={() => {
                      drag.current = null
                    }}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.cells.map((cell, ci) => (
                <td key={ci}>
                  {ci === 0 && table.rows.length > 1 && (
                    <button
                      type="button"
                      className="awc-row-x"
                      onClick={() => onChange(removeRow(table, ri))}
                      aria-label={`xoá hàng ${ri + 1}`}
                    >
                      ✕
                    </button>
                  )}
                  <EditableField
                    value={cell}
                    onCommit={(v) =>
                      onChange({ ...table, rows: table.rows.map((r, i) => (i === ri ? { cells: r.cells.map((c, ci2) => (ci2 === ci ? v : c)) } : r)) })
                    }
                    style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="awc-table-adds">
        <button type="button" className="awc-mini-add" onClick={() => onChange(addColumn(table, freeColumnName(table.columns)))}>
          + cột
        </button>
        <button type="button" className="awc-mini-add" onClick={() => onChange(addRow(table))}>
          + hàng
        </button>
      </div>
    </div>
  )
}

function ImageBlockEditor({
  caption,
  imageUrl,
  palette,
  onChange,
}: {
  caption: string
  imageUrl?: string | null
  palette: Palette
  onChange: (patch: { caption?: string; imageUrl?: string | null }) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const { url } = await uploadImage(file)
      onChange({ imageUrl: url })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div
        className="awc-image-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          height: 160,
          background: imageUrl ? undefined : palette.tint,
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
        {!imageUrl && <span style={{ fontFamily: 'inherit', fontSize: 11, color: palette.ink }}>{uploading ? 'đang tải…' : 'thả ảnh hoặc bấm để chọn'}</span>}
      </div>
      <EditableField value={caption} placeholder="chú thích ảnh" onCommit={(v) => onChange({ caption: v })} style={{ fontSize: 10, color: palette.ink, marginTop: 8 }} />
    </div>
  )
}
