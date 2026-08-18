import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
import { Stepper } from '../components/Stepper'
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
import { blankReportBlock, getBody, resolveTemplate, toArticleData, toCardsData } from '../lib/postData'

/**
 * The patch shape every editable field ultimately produces — a subset of
 * apiClient.updatePost's PATCH body. `body` is left `unknown` here (rather
 * than the API client's convenience `SectionData[]` narrowing) because it
 * holds a different real shape per template; see lib/postData.ts.
 */
export type EditPatch = Partial<{
  en: string
  lead: string
  pullQuote: string
  furtherReading: string[]
  body: unknown
  heroImageUrl: string
}>

type CanvasProps = {
  template: PostTemplate
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
  onHeroDrop: (file: File) => void
}

const REPORT_BLUE = '#6FA8C0'
const TEMPLATE_LABEL: Record<string, string> = { article: 'Article', cards: 'Cards', report: 'Report' }

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
  const activeModule = modules.find((m) => m.id === post.moduleId)

  // Optimistic local update + fire-and-forget remote save. Functional
  // setState keeps this safe against the stale-closure bug this screen used
  // to have around hero uploads: every callback below reads the latest
  // `post` via the updater function's `prev`, never via a captured `post`
  // from the render that created the closure.
  function applyPatch(patch: EditPatch) {
    setPost((prev) => (prev ? { ...prev, ...(patch as Partial<PostDetail>) } : prev))
    updatePost(postId, patch as Parameters<typeof updatePost>[1])
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <Stepper current="editor" />
      <div style={{ fontSize: 12, color: ink.muted, marginBottom: 14 }}>
        Template: <b style={{ color: ink.strong, fontWeight: 500 }}>{TEMPLATE_LABEL[template]}</b>
      </div>
      <EditorCanvas
        template={template}
        post={post}
        module={activeModule}
        onChange={applyPatch}
        onHeroDrop={async (file) => {
          const { url } = await uploadImage(file)
          setPost((prev) => (prev ? { ...prev, heroImageUrl: url } : prev))
          updatePost(postId, { heroImageUrl: url })
        }}
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
    <div style={{ maxWidth: 1320 }}>
      <EditorStyles />
      <HeroUploader heroImageUrl={post.heroImageUrl} onDrop={onHeroDrop} />
      <div style={{ marginTop: 16, border: `1px solid ${paper.rule}`, overflow: 'hidden', background: paper.white }}>
        {template === 'cards' ? (
          <CardsEditor post={post} onChange={onChange} />
        ) : template === 'report' ? (
          <ReportEditor post={post} onChange={onChange} />
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
      .awc-rep-block{ position: relative; padding-right: 34px; margin-bottom: 4px; }
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
  style,
}: {
  value: string
  onCommit: (value: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
  style?: CSSProperties
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])

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
      className="awc-editable"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      style={commonStyle}
    />
  )
}

function HeroUploader({ heroImageUrl, onDrop }: { heroImageUrl: string | null; onDrop: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      className="awc-hero-drop"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) onDrop(file)
      }}
      onClick={() => inputRef.current?.click()}
      style={{
        height: 140,
        border: '2px dashed rgba(0,0,0,.3)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
        fontSize: 12,
        color: 'rgba(0,0,0,.55)',
        background: 'rgba(255,255,255,.25)',
        cursor: 'pointer',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color .12s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onDrop(file)
          e.target.value = ''
        }}
      />
      {heroImageUrl && (
        <img
          src={heroImageUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
        />
      )}
      <span style={{ position: 'relative' }}>
        {heroImageUrl ? '⬇ kéo ảnh mới vào để thay, hoặc bấm để chọn file' : '⬇ kéo ảnh hero thả vào đây, hoặc bấm để chọn file'}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// article — every editable field is wired through Article's own overrides,
// so what's on screen while editing is exactly the public render.
// ---------------------------------------------------------------------------

function ArticleEditor({ post, module, onChange }: { post: PostDetail; module?: Module; onChange: (patch: EditPatch) => void }) {
  const data = toArticleData(post, module)
  const sections = getBody<SectionData>(post)
  const furtherReading = post.furtherReading ?? []

  function updateSection(index: number, patch: Partial<SectionData>) {
    onChange({ body: sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) })
  }
  function updateFurtherReading(index: number, value: string) {
    onChange({ furtherReading: furtherReading.map((r, i) => (i === index ? value : r)) })
  }

  return (
    <PostRenderer
      template="article"
      post={data}
      renderTitle={(title) => <EditableField value={title} onCommit={(v) => onChange({ en: v })} />}
      renderLead={(lead) => <EditableField value={lead} multiline rows={2} onCommit={(v) => onChange({ lead: v })} />}
      renderSectionHeading={(h, i) => <EditableField value={h} onCommit={(v) => updateSection(i, { h: v })} />}
      renderSectionBody={(p, i) => <EditableField value={p} multiline rows={3} onCommit={(v) => updateSection(i, { p: v })} />}
      renderPullQuote={(pull) => <EditableField value={pull} multiline rows={3} onCommit={(v) => onChange({ pullQuote: v })} />}
      renderFurtherReadingItem={(item, i) => <EditableField value={item} onCommit={(v) => updateFurtherReading(i, v)} />}
    />
  )
}

// ---------------------------------------------------------------------------
// cards — Cards has no override for the top-level post title, so that one
// field gets a small editor bar above the real (otherwise unmodified) canvas.
// ---------------------------------------------------------------------------

function CardsEditor({ post, onChange }: { post: PostDetail; onChange: (patch: EditPatch) => void }) {
  const data = toCardsData(post)
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

function ReportEditor({ post, onChange }: { post: PostDetail; onChange: (patch: EditPatch) => void }) {
  const blocks = getBody<ReportBlock>(post)
  const [menuAt, setMenuAt] = useState<number | null>(null)

  function setBlocks(next: ReportBlock[]) {
    onChange({ body: next })
  }
  function updateBlock(i: number, next: ReportBlock) {
    setBlocks(blocks.map((b, idx) => (idx === i ? next : b)))
  }
  function removeBlock(i: number) {
    setBlocks(blocks.filter((_, idx) => idx !== i))
  }
  function moveBlock(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    setBlocks(next)
  }
  function insertBlock(afterIndex: number, type: ReportBlock['type']) {
    const next = [...blocks]
    next.splice(afterIndex + 1, 0, blankReportBlock(type))
    setBlocks(next)
    setMenuAt(null)
  }

  return (
    <div>
      <div style={{ background: REPORT_BLUE, color: '#0E2C38', padding: '28px 32px 22px' }}>
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
        {blocks.map((b, i) => (
          <div key={i}>
            <ReportBlockEditor
              block={b}
              onChange={(next) => updateBlock(i, next)}
              onRemove={() => removeBlock(i)}
              onMoveUp={i > 0 ? () => moveBlock(i, -1) : undefined}
              onMoveDown={i < blocks.length - 1 ? () => moveBlock(i, 1) : undefined}
            />
            <InsertRow open={menuAt === i} onToggle={() => setMenuAt(menuAt === i ? null : i)} onInsert={(t) => insertBlock(i, t)} />
          </div>
        ))}
        {blocks.length === 0 && (
          <div style={{ color: ink.muted, fontSize: 13, padding: '8px 0 20px' }}>Chưa có khối nào — bấm "+ thêm khối" để bắt đầu.</div>
        )}
      </div>
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

function ReportBlockEditor({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: ReportBlock
  onChange: (next: ReportBlock) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div className="awc-rep-block">
      <div className="awc-block-controls">
        {onMoveUp && (
          <button type="button" onClick={onMoveUp} aria-label="chuyển khối lên">
            ↑
          </button>
        )}
        {onMoveDown && (
          <button type="button" onClick={onMoveDown} aria-label="chuyển khối xuống">
            ↓
          </button>
        )}
        <button type="button" onClick={onRemove} aria-label="xoá khối">
          ×
        </button>
      </div>
      <ReportBlockFields block={block} onChange={onChange} />
    </div>
  )
}

function ReportBlockFields({ block, onChange }: { block: ReportBlock; onChange: (next: ReportBlock) => void }) {
  switch (block.type) {
    case 'meta':
      return (
        <EditableField
          value={block.text}
          onCommit={(v) => onChange({ ...block, text: v })}
          style={{ fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: ink.muted }}
        />
      )
    case 'heading':
      return (
        <EditableField
          value={block.text}
          onCommit={(v) => onChange({ ...block, text: v })}
          style={{ fontFamily: serif, fontSize: 28, color: ink.base, margin: '14px 0 6px' }}
        />
      )
    case 'paragraph':
      return (
        <EditableField
          value={block.text}
          multiline
          rows={3}
          onCommit={(v) => onChange({ ...block, text: v })}
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
