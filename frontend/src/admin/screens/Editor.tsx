import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { PostRenderer } from 'post-renderer'
import type {
  CardData,
  CardPart,
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
import { ink, paper, serif } from '../../design/tokens'
import { blankReportBlock, getBody, resolveTemplate } from '../lib/postData'
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
import { EXPLORATIONS_LABEL, fieldNotesLabel, nextId, notesOn } from 'post-renderer'
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
        <HeroPicker onPick={(f) => void setHero(f)} hasHero={Boolean(post.hero_image_url)} />
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
          /*
           * Long-form's words are a parsed export and its title is the first
           * heading inside them, so there is no field here to hook. Shown as it
           * will read, and left alone — editing it as an article, which is what
           * happened before, wrote article-shaped sections over the export.
           */
          <PostRenderer template="longform" post={toLongformData(post, module)} />
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
      .awc-insert-menu{ display: flex; flex-wrap: wrap; gap: 6px; padding: 0 0 14px; }
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
      .awc-dropline{ height: 2px; background: #6FA8C0; margin: 6px 0; }

      /* the notes column */
      .awc-note-head{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 9.5px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 8px; }
      .awc-note-row{ position: relative; border-left: 2px solid #6FA8C0; padding-left: 9px; padding-right: 16px; margin-bottom: 8px; }
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
      .awc-table-editor{ border-collapse: collapse; width: 100%; }
      .awc-table-editor th, .awc-table-editor td{ border-bottom: 1px solid #EBE5D3; padding: 6px 8px; text-align: left; vertical-align: top; }
      .awc-image-drop{ cursor: pointer; }
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
  style?: CSSProperties
}) {
  const [local, setLocal] = useState(value)
  const el = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => setLocal(value), [value])
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
        style={{ ...commonStyle, resize: 'vertical' }}
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
      style={commonStyle}
    />
  )
}

/** Sets the cover. The picture itself is shown by the page, not by this. */
function HeroPicker({ onPick, hasHero }: { onPick: (file: File) => void; hasHero: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          fontFamily: 'inherit',
          fontSize: 12,
          color: ink.green,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {hasHero ? 'đổi ảnh bìa' : 'thêm ảnh bìa'}
      </button>
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
  // Same adapter as the public journal, so the canvas is edited against what
  // will actually ship.
  const data = toArticleData(post, module?.title ?? post.module_id, [], -1, module)
  const sections = getBody<SectionData>(post)
  const further_reading = post.further_reading ?? []

  function updateSection(index: number, patch: Partial<SectionData>) {
    onChange({ body: sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) })
  }
  function updateFurtherReading(index: number, value: string) {
    onChange({ further_reading: further_reading.map((r, i) => (i === index ? value : r)) })
  }

  return (
    <PostRenderer
      template="article"
      post={data}
      renderTitle={(title) => <EditableField value={title} onCommit={(v) => onChange({ en: v })} />}
      renderLead={(lead) => <EditableField value={lead} multiline rows={2} onCommit={(v) => onChange({ lead: v })} />}
      renderSectionHeading={(h, i) => <EditableField value={h} onCommit={(v) => updateSection(i, { h: v })} />}
      renderSectionBody={(p, i) => <EditableField value={p} multiline rows={3} onCommit={(v) => updateSection(i, { p: v })} />}
      renderPullQuote={(pull) => <EditableField value={pull} multiline rows={3} onCommit={(v) => onChange({ pull_quote: v })} />}
      renderFurtherReadingItem={(item, i) => <EditableField value={item} onCommit={(v) => updateFurtherReading(i, v)} />}
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
function MemoEditor({
  post,
  module,
  onChange,
}: {
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
}) {
  const data = toMemoData(post, module)
  const body = (post.body ?? {}) as { sections?: { h: string }[] }
  const sections = body.sections ?? []

  return (
    <PostRenderer
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
      renderSectionHeading={(heading, i) => (
        <EditableField
          value={heading}
          onCommit={(v) =>
            onChange({
              body: {
                ...(post.body as object),
                sections: sections.map((s, k) => (k === i ? { ...s, h: v } : s)),
              },
            })
          }
        />
      )}
    />
  )
}

function CardsEditor({ post, module, onChange }: { post: PostDetail; module?: Module; onChange: (patch: EditPatch) => void }) {
  const data = toCardsData(post, module)
  const cards = getBody<CardData>(post)

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
      />
    </div>
  )
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

const BLOCK_TYPES: { type: ReportBlock['type']; label: string }[] = [
  { type: 'meta', label: 'Meta' },
  { type: 'heading', label: 'Tiêu đề' },
  { type: 'paragraph', label: 'Đoạn văn' },
  { type: 'metrics', label: 'Số liệu' },
  { type: 'chart', label: 'Biểu đồ' },
  { type: 'table', label: 'Bảng' },
  { type: 'image', label: 'Ảnh' },
]

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

  const accent = module?.accent ?? REPORT_BLUE
  const onAccent = module?.on_color ?? '#0E2C38'
  const noteIds = [...notes.explorations, ...notes.fieldNotes].map((n) => n.id)
  // Named once at the top, as on the page — see Report.tsx.
  const firstAnnotated = blocks.findIndex((b) => notesOn(notes, b.id).length > 0)

  function write(next: ReportContent) {
    onChange({ body: toBody(next) })
  }
  function setBlocks(next: ReportBlock[]) {
    write({ blocks: next, notes })
  }
  function updateBlock(i: number, next: ReportBlock) {
    setBlocks(blocks.map((b, idx) => (idx === i ? next : b)))
  }
  function insertBlock(afterIndex: number, type: ReportBlock['type']) {
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
          <ColumnSplit width={asideWidth} onWidth={setAsideWidth} rows={blocks.length} />
          {blocks.map((b, i) => (
            <Fragment key={b.id ?? i}>
              <div
                style={{ gridColumn: 1, gridRow: i + 1, minWidth: 0 }}
                onDragOver={(e) => {
                  if (dragFrom === null) return
                  e.preventDefault()
                  setDragOver(i)
                }}
                onDrop={() => drop(i)}
              >
                {dragOver === i && dragFrom !== null && dragFrom !== i && <div className="awc-dropline" />}
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
                    <button type="button" onClick={() => write(cloneBlock(content, i))} aria-label="nhân bản khối">
                      ⧉
                    </button>
                    <button type="button" onClick={() => requestRemove(i)} aria-label="xoá khối">
                      ×
                    </button>
                  </div>
                  <ReportBlockFields
                    block={b}
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

              <div style={{ gridColumn: 3, gridRow: i + 1, minWidth: 0 }}>
                <FieldNotesEditor
                  notes={notes}
                  blockId={b.id}
                  label={i === firstAnnotated ? fieldNotesLabel('report') : null}
                  accent={accent}
                  takenIds={noteIds}
                  onChange={(fieldNotes) => write({ blocks, notes: { ...notes, fieldNotes } })}
                />
                {/* At the foot, for the same reason the page puts them there. */}
                {i === blocks.length - 1 && (
                  <ExplorationsEditor
                    notes={notes}
                    accent={accent}
                    onChange={(explorations) => write({ blocks, notes: { ...notes, explorations } })}
                  />
                )}
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
  takenIds,
  onChange,
}: {
  notes: ReportContent['notes']
  blockId?: string
  label: string | null
  accent: string
  takenIds: string[]
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
      <button
        type="button"
        className="awc-note-add awc-note-slot"
        aria-label="thêm ghi chú cho khối này"
        style={{ color: accent }}
        onClick={() => onChange([...notes.fieldNotes, { id: nextId('n', takenIds), anchor: blockId, text: '' }])}
      >
        + ghi chú
      </button>
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
  onInsert: (type: ReportBlock['type']) => void
}) {
  return (
    <div>
      <button type="button" className="awc-plus-btn" onClick={onToggle} aria-expanded={open}>
        + thêm khối
      </button>
      {open && (
        <div className="awc-insert-menu">
          {BLOCK_TYPES.map((t) => (
            <button key={t.type} type="button" onClick={() => onInsert(t.type)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** The grey word standing in for a block with nothing written in it yet. */
const GHOST: Partial<Record<ReportBlock['type'], string>> = Object.fromEntries(
  BLOCK_TYPES.map((t) => [t.type, t.label]),
)

function ReportBlockFields({
  block,
  focus,
  onFocused,
  onChange,
  onEmptied,
}: {
  block: ReportBlock
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
    case 'heading':
      return (
        <EditableField
          value={block.text}
          placeholder={GHOST.heading}
          focus={focus}
          onFocused={onFocused}
          onCommit={(v) => commitText(v, { ...block, text: v })}
          style={{ fontFamily: serif, fontSize: 28, color: ink.base, margin: '14px 0 6px' }}
        />
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
      return <ChartEditor points={block.points} onChange={(points) => onChange({ ...block, points })} />
    case 'table':
      return <TableEditor table={block.table} onChange={(table) => onChange({ ...block, table })} />
    case 'image':
      return (
        <ImageBlockEditor
          caption={block.caption}
          imageUrl={block.imageUrl}
          onChange={(patch) => onChange({ ...block, ...patch })}
        />
      )
  }
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

function ChartEditor({ points, onChange }: { points: ReportChartPoint[]; onChange: (points: ReportChartPoint[]) => void }) {
  function update(i: number, patch: Partial<ReportChartPoint>) {
    onChange(points.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  return (
    <div>
      <div className="awc-chart-bars">
        {points.map((p, i) => (
          <div key={i} className="awc-chart-bar" style={{ height: `${Math.max(0, Math.min(100, p.heightPct))}%`, background: REPORT_BLUE }} />
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

function TableEditor({ table, onChange }: { table: ReportTable; onChange: (table: ReportTable) => void }) {
  function addColumn() {
    onChange({ columns: [...table.columns, `Cột ${table.columns.length + 1}`], rows: table.rows.map((r) => ({ cells: [...r.cells, ''] })) })
  }
  function removeColumn(ci: number) {
    onChange({ columns: table.columns.filter((_, i) => i !== ci), rows: table.rows.map((r) => ({ cells: r.cells.filter((_, i) => i !== ci) })) })
  }
  function addRow() {
    onChange({ ...table, rows: [...table.rows, { cells: table.columns.map(() => '') }] })
  }
  function removeRow(ri: number) {
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== ri) })
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="awc-table-editor">
        <thead>
          <tr>
            {table.columns.map((c, ci) => (
              <th key={ci}>
                <EditableField
                  value={c}
                  onCommit={(v) => onChange({ ...table, columns: table.columns.map((col, i) => (i === ci ? v : col)) })}
                  style={{ fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: REPORT_BLUE }}
                />
                <button type="button" className="awc-mini-remove" onClick={() => removeColumn(ci)} aria-label={`xoá cột ${ci + 1}`}>
                  xoá cột
                </button>
              </th>
            ))}
            <th>
              <button type="button" className="awc-mini-add" onClick={addColumn}>
                + cột
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.cells.map((cell, ci) => (
                <td key={ci}>
                  <EditableField
                    value={cell}
                    onCommit={(v) =>
                      onChange({ ...table, rows: table.rows.map((r, i) => (i === ri ? { cells: r.cells.map((c, ci2) => (ci2 === ci ? v : c)) } : r)) })
                    }
                    style={{ fontSize: 14 }}
                  />
                </td>
              ))}
              <td>
                <button type="button" className="awc-mini-remove" onClick={() => removeRow(ri)} aria-label={`xoá hàng ${ri + 1}`}>
                  xoá hàng
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="awc-mini-add" onClick={addRow}>
        + hàng
      </button>
    </div>
  )
}

function ImageBlockEditor({
  caption,
  imageUrl,
  onChange,
}: {
  caption: string
  imageUrl?: string | null
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
          background: imageUrl ? undefined : '#E9F1F4',
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
        {!imageUrl && <span style={{ fontFamily: 'inherit', fontSize: 11, color: '#4B6873' }}>{uploading ? 'đang tải…' : 'thả ảnh hoặc bấm để chọn'}</span>}
      </div>
      <EditableField value={caption} placeholder="chú thích ảnh" onCommit={(v) => onChange({ caption: v })} style={{ fontSize: 10, color: '#4B6873', marginTop: 8 }} />
    </div>
  )
}
