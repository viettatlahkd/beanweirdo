import {
  Component,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  PostRenderer,
  FLAVOR_GROUP_NAMES,
  flavorGroupMeta,
  normalizeBlocks,
  ElementList,
  longformTextToRuns,
} from 'post-renderer'
import type {
  CardData,
  CardPart,
  FigureData,
  LongformBlock,
  ReportBlock,
  ReportChartPoint,
  ReportMetric,
  ReportTable,
  SectionData,
} from 'post-renderer'
import {
  getPost,
  transitionStatus,
  updatePost,
  uploadImage,
  type Module,
  type PostDetail,
  type PostTemplate,
} from '../lib/apiClient'
import { listModulesCached } from '../lib/lists'
import { TEMPLATE_LABEL } from '../../content/templates'
import { useNav } from '../../lib/nav'
import { toPath } from '../../lib/routes'
import { usePostAddresses } from '../../data/usePostAddresses'
import { radius } from '../../design/controls'
import { ink, paper, sans, serif } from '../../design/tokens'
import { IconLink } from '../../design/icons'
import { useToast } from '../../design/Toaster'
import { ThemePicker } from '../components/ThemePicker'
import { AuthorPicker } from '../components/AuthorPicker'
import type { AuthorRef } from 'api-contract'
import { CoverBand } from '../components/CoverBand'
import { FramingProvider, useCropping, useFraming } from '../components/framing'
import { PlateImageUpload, PlateUpload } from '../components/PlateUpload'
import { blankReportBlock, getBody, ORDERED_LIST, resolveTemplate } from '../lib/postData'
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
  fillStyle,
  cropStyle,
  safeHref,
  allElements,
  flatElements,
  htmlToMarkdown,
  Inline,
  rawIndexFor,
  type Palette,
} from 'post-renderer'
import { AddRow, FlowThing, Grip, RowShell } from '../components/RowShell'
import { duplicateAt, insertAt, move, removeAt } from '../lib/listOps'
import { withPastedBlocks } from '../lib/pasteBlocks'
import { insertThing, moveIntoRun, toRuns, writeRun } from '../lib/flow'
import { linesThrough } from '../lib/mdBlocks'
import { focusThingLater, lineOfPoint } from '../lib/flowFocus'
import { emptyHistory, historyKey, inverseOf, record, redo, undo, type History } from '../lib/editHistory'
import { spaceBlock, type BlockFocus } from '../lib/blockKeys'
import { insertLongformThing, runAtIndex, toLongformRuns, writeLongformRun } from '../lib/longformFlow'
import { insertSectionThing, isStoredElement, runAtSection, toSectionRuns, writeSectionRun } from '../lib/articleFlow'
import { BlockIcon } from '../components/BlockIcon'
import { LiveText, liveMarkdown, takeBlock } from '../components/LiveText'
import type { LiveEdges } from '../components/liveKeys'
import { applyMark, markFor } from '../lib/marks'
import { useRowDrag } from '../lib/useRowDrag'
import {
  toArticleData,
  toBitesizeData,
  toCardsData,
  toLongformData,
  toMemoData,
  type BitesizeBody,
} from '../../lib/postToRenderer'
import type { BitesizeLength } from 'post-renderer'
import { captureFrame, looksLikeVideo, probeMedia } from '../../lib/mediaShape'
import { toReportBlocks, toReportNotes } from '../../lib/reportBlocks'

/**
 * The patch shape every editable field ultimately produces — a subset of
 * apiClient.updatePost's PATCH body. `body` is left `unknown` here (rather
 * than the API client's convenience `SectionData[]` narrowing) because it
 * holds a different real shape per template; see lib/postData.ts.
 */
type EditPatch = Partial<{
  en: string
  lead: string
  pull_quote: string
  further_reading: string[]
  body: unknown
  hero_image_url: string
  /**
   * Ảnh của các ô ảnh cố định do khuôn bài đặt tên — migration 0027.
   *
   * Ghi cả bản đồ chứ không ghi từng khoá: `plate_images` là một cột jsonb,
   * nên PATCH một khoá lẻ sẽ thay cả cột bằng mỗi khoá ấy.
   */
  plate_images: Record<string, string | null>
  /** Màu riêng của bài; null trả nó về theo màu module. */
  theme_color: string | null
}>

/**
 * Những việc chỉ ảnh bìa mới làm được, gom một chỗ.
 *
 * Ảnh bìa không cất trong `plate_images` như các ô khác: nó là cột riêng
 * `hero_image_url`, nhận cả clip, và gỡ nó ra thì khung hình tự động của clip
 * cũng phải đi theo. Nên ba việc này không viết được trong `PlateImageUpload`
 * mà phải đi từ màn sửa xuống.
 *
 * Để `optional` vì `EditorCanvas` còn được dựng trần trong hàng chục bài kiểm;
 * vắng nó thì góc ô ảnh bìa chỉ còn nút tải tệp, đúng với việc chỗ dựng ấy
 * thật sự không nối gì.
 */
type HeroActions = {
  /** Dán một địa chỉ ảnh thay vì tải tệp lên. */
  link: (url: string, ratio: number | null) => void
  /**
   * Mở lại khung cắt cho tấm đang có.
   *
   * Vắng khi ảnh bìa là một clip: khung cắt vẽ bằng `background-image` nên clip
   * không vẽ ra được, và căn tâm một hình đang chạy cũng vô nghĩa. Một cái nút
   * bấm vào không xảy ra gì còn tệ hơn là không có nút.
   */
  reframe?: (ratio: number | null) => void
  /** Gỡ ảnh bìa, kèm khung hình của clip nếu có. */
  clear: () => void
}

type CanvasProps = {
  template: PostTemplate
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
  /** `ratio` là hình dạng thật của ô ảnh bìa, đo lúc bấm nút ở góc ô. */
  onHeroDrop: (file: File, ratio?: number | null) => void
  hero?: HeroActions
}

const REPORT_BLUE = '#6FA8C0'

/**
 * The outer edit screen — fetches the post + modules by id, wires the
 * publish/save/preview footer, and hands the real editing surface to
 * EditorCanvas below. Port of the standalone admin app's
 * app/posts/[id]/edit/page.tsx, adapted to take `postId` as a prop (no
 * next/navigation `useParams`) and to navigate via the admin nav context.
 */
export function Editor({ postId }: { postId: string }) {
  return (
    /*
     * Khung cắt ảnh bọc cả màn, chứ không dựng riêng ở từng chỗ đăng ảnh: chủ
     * site muốn mọi chỗ đăng ảnh ra cùng một hộp thoại, và một hộp cho cả màn
     * thì không có cách nào lệch nhau được.
     */
    <FramingProvider>
      <EditorContent postId={postId} />
    </FramingProvider>
  )
}

function EditorContent({ postId }: { postId: string }) {
  const nav = useNav()
  const addresses = usePostAddresses()
  const [post, setPost] = useState<PostDetail | null>(null)
  /** Dòng tác giả lúc tải bài; `AuthorPicker` tự giữ và tự ghi từ đó. */
  const [byline, setByline] = useState<AuthorRef[]>([])
  const [modules, setModules] = useState<Module[]>([])
  /*
   * Phải đứng TRÊN chỗ `return` sớm bên dưới. State của khung căn ảnh từng
   * đứng dưới, cạnh hàm dùng nó — đọc thì gọn, chạy thì vỡ: lượt vẽ đầu `post`
   * còn null nên hàm thoát sớm và chỉ chạy bốn hook; tải xong bài thì lượt sau
   * chạy năm. React đếm không khớp là ném lỗi và cả màn trắng xoá. Nghĩa là
   * bấm "Sửa" bài nào cũng trắng, không riêng bài nào.
   */
  const frame = useFraming()
  const toast = useToast()

  /**
   * Khung cắt cho ảnh bìa.
   *
   * `ratio` là ô ảnh bìa **trên chính bài đang sửa**, đo từ trang lúc bấm nút ở
   * góc ô. Trước đây chỗ này ghi cứng 172/130 — hình cắt ở danh sách bài trong
   * module — nên mở một bài bitesize ra căn ảnh thì hộp thoại bày một khung
   * chẳng liên quan gì đến ô ảnh đang nhìn: ô ấy lấy hình dạng theo chính tấm
   * ảnh (`frameOf` trong `Bitesize.tsx`), article thì là một dải dọc rộng
   * 300px. Luật 15.4 nói khung phải "đúng hình dạng ô trên trang công khai".
   *
   * Hai hình cắt của danh sách module xuống làm ô xem trước: ảnh bìa vẫn rơi
   * vào đó, chỉ là chúng không phải thứ đang được căn. Thả tệp thẳng lên trang
   * thì không có ô nào để đo, nên lúc ấy mới quay về 172/130.
   */
  const frameHero = (url: string, ratio?: number | null) =>
    frame({
      url,
      name: 'Ảnh bìa',
      ratio: ratio ?? 172 / 130,
      previews: [
        { label: 'module dạng dải · 172×130', ratio: 172 / 130 },
        { label: 'module dạng specimen · 3:2', ratio: 3 / 2 },
      ],
    })

  /*
   * Lịch sử sửa bài, giữ trong ref chứ không trong state.
   *
   * Nó không vẽ ra gì cả — đổi nó không cần vẽ lại màn hình — và nó phải đọc
   * được từ trong hàm cập nhật của `setPost`, nơi một biến state sẽ là bản
   * của lượt vẽ cũ.
   */
  const history = useRef<History>(emptyHistory)

  /*
   * Mọi lượt lưu của màn này đi qua `save`, để nút Publish đợi được chúng.
   *
   * Bấm Publish ngay sau khi gõ thì ô soạn rời tiêu điểm, lượt lưu cuối bắt
   * đầu, và lệnh đăng chạy song song với nó — trước kia vô hại vì chữ nào cũng
   * lên trang thẳng, nay thì lệnh đăng có thể chép bản nháp **trước** khi dòng
   * vừa gõ tới nơi. `dirty` là "đã sửa trong phiên này": máy chủ chỉ báo
   * `has_draft` lúc tải bài.
   */
  const inFlight = useRef(new Set<Promise<unknown>>())
  const [dirty, setDirty] = useState(false)
  const [publishing, setPublishing] = useState(false)
  function save(patch: Parameters<typeof updatePost>[1]) {
    const p = Promise.resolve(updatePost(postId, patch))
    inFlight.current.add(p)
    void p.finally(() => inFlight.current.delete(p)).catch(() => {})
    queueMicrotask(() => setDirty(true))
    return p
  }

  useEffect(() => {
    Promise.all([getPost(postId), listModulesCached()]).then(([{ authors, ...p }, mods]) => {
      setByline(authors)
      setPost(p)
      setModules(mods)
    })
  }, [postId])

  /*
   * Cmd+Z ở mức cả màn, không ở mức từng ô.
   *
   * Lùi từng ô là lùi trong một cái ô đã đóng lại từ lâu: xoá nhầm một khối
   * thì không có ô nào để mà lùi trong đó nữa. `historyKey` là chỗ quyết định
   * khi nào phím này thuộc về màn và khi nào trả lại cho trình duyệt.
   */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const want = historyKey(e, document.activeElement)
      if (!want) return
      e.preventDefault()
      step(want === 'undo' ? undo : redo)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!post) return <div style={{ padding: 32, color: ink.muted, fontSize: 13 }}>Đang tải...</div>

  const template = resolveTemplate(post)
  // Empty means nothing written yet — a body that is an empty array or an
  // object with no keys, depending on which template put it there.
  const hasContent = Array.isArray(post.body)
    ? post.body.length > 0
    : Object.keys((post.body ?? {}) as Record<string, unknown>).length > 0
  const activeModule = modules.find((m) => m.id === post.module_id)
  const published = post.status === 'published'
  /** Bài đã đăng có chỗ sửa chưa lên trang — từ máy chủ lúc tải, hoặc vừa sửa. */
  const pending = published && (Boolean(post.has_draft) || dirty)
  const saveNote = published
    ? pending
      ? 'Đã đăng · có thay đổi đang lưu nháp, chưa lên trang — bấm "Đăng thay đổi"'
      : 'Đã đăng · sửa gì cũng chỉ lưu nháp cho tới khi bấm Đăng'
    : `Tự lưu nháp khi rời khỏi ô soạn · trạng thái hiện tại: ${post.status}`

  // Optimistic local update + fire-and-forget remote save. Functional
  // setState keeps this safe against the stale-closure bug this screen used
  // to have around hero uploads: every callback below reads the latest
  // `post` via the updater function's `prev`, never via a captured `post`
  // from the render that created the closure.
  /** The cover, set from the button in the header or by dropping on the page. */
  async function setHero(file: File, ratio?: number | null) {
    const { url } = await uploadImage(file)
    // Lưu trước rồi mới căn: người dùng bấm Huỷ thì ảnh vẫn ở lại, huỷ là huỷ
    // việc căn chứ không phải huỷ tấm ảnh vừa tải lên. `frameHero` tự bỏ qua
    // clip — căn tâm chẳng có nghĩa gì với một hình đang chạy.
    saveHero(url)
    saveHero(await frameHero(url, ratio))
  }

  function saveHero(url: string) {
    setPost((prev) => (prev ? { ...prev, hero_image_url: url } : prev))
    void save({ hero_image_url: url })
    void reshapeForMedia(url)
    if (looksLikeVideo(url)) void autoPoster(url)
  }

  /*
   * Đính một tệp vào bài bitesize thì hệ tự đo và tự đổi dàn trang.
   *
   * Chủ site: "giả định là t không báo cho m biết trước đâu, input của user chỉ
   * là 1 video m phải tự nhận diện và reformat trên base set m đã có". Nên
   * không có bước nào bắt khai đây là ảnh hay clip, ngang hay dọc.
   *
   * Đo xong mới ghi, và chỉ ghi khi đo được: link hỏng hay máy chủ treo thì bài
   * giữ nguyên dàn trang đang có chứ không bị đổi bừa. Đọc template từ `prev`
   * chứ không từ `post` — xem ghi chú về stale closure ở trên.
   */
  async function reshapeForMedia(url: string) {
    const shape = await probeMedia(url)
    if (!shape) return
    setPost((prev) => {
      if (!prev || resolveTemplate(prev) !== 'bitesize') return prev
      /*
       * `PostDetail['body']` khai là `SectionData[] | null` cho tiện, nhưng cột
       * thật là jsonb và hình dạng của nó do template quyết — bitesize cất một
       * đối tượng ở đây. Xem chú thích cùng ý ở `Editor.test.tsx`.
       */
      const body = { ...((prev.body ?? {}) as object), media: shape.kind, portrait: shape.portrait }
      void save({ body } as unknown as Parameters<typeof updatePost>[1])
      return { ...prev, body: body as unknown as PostDetail['body'] }
    })
  }

  /**
   * Ảnh đại diện cho clip.
   *
   * Lấy tự động một khung ở giây thứ nhất ngay khi đính clip vào; đổi tay được
   * bằng chính dòng "thumbnail" trong thanh đặt ảnh. Lấy không được — máy chủ
   * không cho đọc pixel — thì im lặng bỏ qua, bài vẫn lưu bình thường.
   */
  async function autoPoster(url: string) {
    const frame = await captureFrame(url)
    if (!frame) return
    const { url: posterUrl } = await uploadImage(
      new File([frame], 'poster.jpg', { type: 'image/jpeg' }),
    )
    writeBody({ poster: posterUrl })
  }

  /** Ghi thêm vào `body` jsonb mà không đụng phần đã có. */
  function writeBody(patch: Record<string, unknown>) {
    setPost((prev) => {
      if (!prev) return prev
      const body = { ...((prev.body ?? {}) as object), ...patch }
      void save({ body } as unknown as Parameters<typeof updatePost>[1])
      return { ...prev, body: body as unknown as PostDetail['body'] }
    })
  }

  function applyPatch(patch: EditPatch) {
    setPost((prev) => {
      if (!prev) return prev
      // Ghi bước lùi từ `prev`, không từ `post` của lượt vẽ đã tạo ra closure
      // này — cùng lý do với ghi chú stale closure ở trên.
      history.current = record(
        history.current,
        inverseOf(prev as unknown as Record<string, unknown>, patch as Record<string, unknown>),
        Date.now(),
      )
      return { ...prev, ...(patch as Partial<PostDetail>) }
    })
    void save(patch as Parameters<typeof updatePost>[1])
  }

  /**
   * Đi lại một bước đã ghi.
   *
   * Không đi qua `applyPatch`: bản vá này **là** lịch sử, ghi nó vào lịch sử
   * lần nữa là tự sinh ra một bước để rồi lùi chính nó.
   */
  function step(pick: typeof undo) {
    setPost((prev) => {
      if (!prev) return prev
      const done = pick(history.current, prev as unknown as Record<string, unknown>)
      if (!done) return prev
      history.current = done.history
      void save(done.patch as Parameters<typeof updatePost>[1])
      return { ...prev, ...(done.patch as Partial<PostDetail>) }
    })
  }

  /*
   * Đọc thẳng `post.body`, không qua `getBody`.
   *
   * `getBody` trả về MẢNG — nó viết cho template cất thân bài thành một dãy
   * khối, và với body dạng đối tượng thì nó trả mảng rỗng chứ không báo gì.
   * Bitesize cất một đối tượng, nên đi qua đó là `poster` luôn rỗng và không
   * có lỗi nào để lần ra.
   */
  const body = (post.body ?? {}) as { poster?: string }
  const heroIsClip = Boolean(post.hero_image_url && looksLikeVideo(post.hero_image_url))

  /**
   * Ba việc của ảnh bìa mà `PlateImageUpload` không tự làm được.
   *
   * Thanh "ảnh bìa: tải ảnh lên – đặt link – đặt vào khung – xoá" ở đầu khung
   * sửa đã bỏ: mọi ô ảnh nay có nút ngay ở góc ô, nên một hàng chữ ở trên đầu
   * nói về một ô ở giữa trang là thứ phải đối chiếu chứ không phải thứ để
   * dùng. Chủ site: *"bỏ cái phần này đi vì giờ ảnh như nào là có nút hết
   * rồi"*.
   *
   * Nhưng ba việc của nó thì không bỏ được, nên chúng đi xuống đây:
   * ảnh bìa cất ở cột riêng `hero_image_url` chứ không trong `plate_images`,
   * nó nhận cả clip, và gỡ nó ra thì khung hình tự động của clip cũng mất chỗ
   * bám.
   */
  const heroActions: HeroActions = {
    link: (url, ratio) => {
      saveHero(url)
      void frameHero(url, ratio).then(saveHero)
    },
    reframe: heroIsClip
      ? undefined
      : (ratio) => {
          if (post.hero_image_url) void frameHero(post.hero_image_url, ratio).then(saveHero)
        },
    clear: () => {
      applyPatch({ hero_image_url: '' } as EditPatch)
      // Khung hình của clip cũ không còn chỗ bám vào nữa.
      if (body.poster) writeBody({ poster: null })
    },
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: ink.muted, marginBottom: 12 }}>
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

      <div style={{ marginBottom: 12 }}>
        <AuthorPicker key={postId} postId={postId} initial={byline} />
      </div>

      <CanvasFailure key={postId}>
        <EditorCanvas
          template={template}
          post={post}
          module={activeModule}
          onChange={applyPatch}
          onHeroDrop={setHero}
          hero={heroActions}
        />
      </CanvasFailure>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, maxWidth: 1320 }}>
        <span style={{ fontSize: 11, color: ink.muted }}>{saveNote}</span>
        <div>
          {/* A real link because it opens a second tab, where a nav() call
              cannot reach. Every screen has an address of its own now, so this
              is the address of the preview screen and nothing special. */}
          <a href={toPath({ area: 'admin', screen: 'postPreview', slug: addresses.slugOf(postId) })} target="_blank" rel="noreferrer" className="admin-btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Xem trước ↗
          </a>
          <button onClick={() => nav.goCms()} className="admin-btn-ghost" style={{ marginLeft: 8 }}>
            Lưu nháp
          </button>
          {/*
            * Publish là việc duy nhất đưa chữ lên trang (migration 0028).
            *
            * Bài đã đăng thì mọi ô soạn chỉ lưu vào bản nháp của nó; nút này
            * chép bản nháp ấy lên. Nên nó đợi các lượt lưu đang chạy trước —
            * xem `save` — rồi mới đăng, và luôn nói ra kết quả: một lần bấm
            * không có hồi âm từng là lý do chủ site không biết bài đã lên chưa.
            */}
          <button
            onClick={async () => {
              if (published && !pending) {
                toast.info('Không có thay đổi nào chưa đăng')
                return
              }
              if (publishing) return
              setPublishing(true)
              const card = toast.busy(published ? 'Đang đăng các thay đổi…' : 'Đang đăng bài…')
              try {
                await Promise.allSettled([...inFlight.current])
                await transitionStatus(postId, 'publish')
                card.ok(published ? 'Đã đăng các thay đổi' : 'Đã đăng bài')
                nav.goCms()
              } catch (e) {
                card.fail(e)
                setPublishing(false)
              }
            }}
            disabled={publishing}
            className="admin-btn"
            style={{ marginLeft: 8 }}
          >
            {publishing ? 'Đang đăng…' : published ? (pending ? 'Đăng thay đổi' : 'Đã đăng') : 'Publish'}
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

export function EditorCanvas({ template, post, module, onChange, onHeroDrop, hero }: CanvasProps) {
  return (
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

      {/*
        Ô trang bìa: một băng ngang trên đầu, GIỐNG NHAU ở cả sáu khuôn.

        Một dải thả ảnh ở chỗ này từng bị bỏ đi vì ảnh hiện hai lần — một lần
        trong một cái hộp không phải trang, một lần ở đúng chỗ trang đặt nó —
        và chủ site nhắc lại đúng điều ấy: *"hiện 1 chỗ thôi chứ?"*. Nên lần
        này ô ảnh bìa mà template vẽ **không vẽ ảnh nữa trong màn sửa**: nó
        đứng đó giữ chỗ, còn tấm ảnh chỉ nằm ở băng này.

        Nghĩa là khung sửa cố ý không còn giống hệt trang thật ở đúng một chỗ.
        Chủ site chốt như vậy: *"trong màn sửa thì nó hiển thị thế để có chỗ
        đẩy ảnh lên và quy chuẩn thôi, còn nó như nào thì phải click xem
        trước"*. Đổi lại, sáu khuôn có cùng một chỗ đặt ảnh bìa, và `cards`,
        `report`, `longform` — ba khuôn không vẽ ô ảnh bìa nào — lần đầu có
        đường đặt ảnh bìa ngay trên trang sửa.
      */}
      {hero && (
        <CoverBand
          imageUrl={post.hero_image_url}
          onPick={onHeroDrop}
          onLink={hero.link}
          onReframe={hero.reframe}
          onClear={hero.clear}
        />
      )}

      <div data-flow-root style={{ border: `1px solid ${paper.rule}`, overflow: 'hidden', background: paper.white }}>
        {/*
          `onHeroDrop` đi tiếp xuống ba khuôn có ô ảnh bìa vẽ sẵn trên trang.
          Ảnh bìa không phải một địa chỉ đơn thuần: đính vào thì còn phải đo
          khung hình để bitesize tự đổi dàn trang, lấy poster nếu là clip, và
          mở khung cắt nếu là ảnh — nên nút ở góc ô gọi đúng đường ấy thay vì
          tự ghi `hero_image_url`.
        */}
        {template === 'cards' ? (
          <CardsEditor post={post} module={module} onChange={onChange} />
        ) : template === 'report' ? (
          <ReportEditor post={post} module={module} onChange={onChange} />
        ) : template === 'bitesize' ? (
          <BitesizeEditor post={post} module={module} onChange={onChange} onHeroDrop={onHeroDrop} hero={hero} />
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
      .awc-insert-menu{ display: flex; flex-direction: column; gap: 10px; }
      .awc-insert-group{ display: flex; flex-direction: column; gap: 1px; }
      .awc-insert-glyph{ flex: 0 0 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 1px solid #EBE5D3; border-radius: 6px; color: #5C5647; background: #FDFBF2; }
      .awc-insert-menu button:hover .awc-insert-glyph{ border-color: #DCD5C0; background: #FFFDF6; color: #23211A; }
      .awc-insert-cat{ font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #8C8674; padding: 2px 6px; }
      .awc-insert-menu button{ display: flex; align-items: center; gap: 10px; font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 14px; text-align: left; padding: 8px 10px; width: 100%; border: none; border-radius: 4px; background: transparent; cursor: pointer; color: #23211A; }
      .awc-insert-menu button:hover, .awc-insert-menu button.on, .awc-insert-menu button:focus-visible{ background: #F1ECDC; outline: none; }
      .awc-rep-grid{ display: grid; column-gap: 20px; }
      .awc-split{ position: relative; cursor: col-resize; justify-self: center; width: 1px; background: #EBE5D3; }
      .awc-split::after{ content: ''; position: absolute; inset: 0 -5px; }
      .awc-split:hover{ background: #8C8674; }
      /*
       * Máng bên trái, ngoài cột chữ.
       *
       * Trước đây tay nắm ở lề trái còn ✎ ⧉ × thì tuyệt đối bên phải, đè lên
       * chính đoạn đang viết — và dải "+ THÊM KHỐI" thì chiếm hẳn một dòng
       * sau mỗi khối. Nay mọi nút dồn về một máng ngoài lề: cột chữ không
       * còn bị cắt ở hai đầu, và không nút nào nằm trên chữ.
       */
      .awc-rep-block{ position: relative; padding-left: 122px; margin-bottom: 2px; }
      .awc-gutter{ position: absolute; left: 0; top: 0; width: 114px; display: flex; align-items: center; gap: 2px; transition: top .08s; }
      /*
       * Ẩn từng NÚT, không ẩn cả máng.
       *
       * Ẩn cả máng thì cái menu đang mở — vốn là con của máng — cũng mờ đi
       * ngay khi chuột rời khỏi khối, nên nó cứ chớp tắt và phải bấm thêm
       * lần nữa mới dứt điểm. Đúng cái chủ site báo.
       */
      .awc-gutter > button, .awc-gutter > .awc-block-controls > button{ opacity: 0; transition: opacity .12s, background .12s; }
      .awc-rep-block:hover .awc-gutter > button, .awc-rep-block:focus-within .awc-gutter > button,
      .awc-rep-block:hover .awc-gutter > .awc-block-controls > button,
      .awc-rep-block:focus-within .awc-gutter > .awc-block-controls > button{ opacity: 1; }
      /*
       * flex: 0 0 26px, không phải width: 26px.
       *
       * Đo trong Chrome: bốn nút width 20px trong một máng 46px co lại còn
       * **8px** mỗi cái — bé như hạt bụi và bấm trượt liên tục. Flex item co
       * được, nên phải nói thẳng là không co.
       *
       * Dùng dấu con: luật này mà với tới nút trong menu thì mỗi mục của menu
       * bị ép thành ô 26×26 và chữ vỡ mỗi dòng một từ.
       */
      .awc-gutter > button, .awc-gutter > .awc-block-controls > button{ flex: 0 0 28px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 500; line-height: 1; color: #5C5647; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; padding: 0; }
      .awc-gutter > button:hover, .awc-gutter > .awc-block-controls > button:hover{ background: #EFEADA; border-color: #DCD5C0; color: #23211A; }
      /* Menu nổi lên trên chữ, không đẩy chữ đi chỗ khác. */
      /*
       * Menu vẽ ra ngoài khung sửa (portal) và định vị theo màn hình.
       *
       * Khung sửa mang \`overflow: hidden\`, nên menu nằm trong nó bị cắt cụt ở
       * mép dưới — chủ site: *"add + bị cắt mất"*. Ra ngoài rồi thì còn phải tự
       * lật lên trên khi sát đáy màn hình, xem \`BlockMenu\`.
       */
      .awc-menu-pop{ position: fixed; z-index: 1000; background: #fff; border: 1px solid #EBE5D3; border-radius: 8px; box-shadow: 0 10px 32px rgba(35,33,26,.16); padding: 8px; max-height: 340px; overflow-y: auto; width: 264px; }

      /* the handle: drag to reorder, Delete to remove — and it says so */
      .awc-grip{ position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: grab; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1; color: #8C8674; background: transparent; border: none; padding: 0; opacity: .35; transition: opacity .12s, color .12s; }
      .awc-rep-block:hover .awc-grip, .awc-grip:focus-visible{ opacity: 1; }
      .awc-grip:hover{ color: #3B3729; }
      .awc-grip:active{ cursor: grabbing; }
      /* Esc trong khối chọn cả khối (con trỏ lên tay nắm): khung sáng quanh nó cho thấy Delete sẽ xoá cái gì. */
      [data-flow="thing"]:has(.awc-grip:focus-visible){ outline: 2px solid #DCD5C0; outline-offset: 2px; }
      .awc-grip-tip{ position: absolute; top: calc(100% + 6px); left: 0; white-space: nowrap; background: #23211A; color: #FDFBF2; font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 11px; letter-spacing: .01em; padding: 5px 9px; opacity: 0; pointer-events: none; transition: opacity .12s; z-index: 5; }
      .awc-grip:hover .awc-grip-tip, .awc-grip:focus-visible .awc-grip-tip{ opacity: 1; }
      .awc-dropline{ height: 2px; margin: 6px 0; background: #5A4632; }

      /* the notes column */
      .awc-note-head{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 9.5px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 8px; }
      .awc-note-row{ position: relative; border-left: 2px solid currentColor; padding-left: 9px; padding-right: 16px; margin-bottom: 8px; }
      .awc-note-x{ position: absolute; right: 0; top: 2px; font-size: 10px; color: #8C8674; background: transparent; border: none; cursor: pointer; padding: 2px; opacity: 0; transition: opacity .12s; }
      .awc-note-row:hover .awc-note-x, .awc-note-x:focus-visible{ opacity: 1; }
      .awc-note-add{ font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-size: 11.5px; background: transparent; border: none; cursor: pointer; padding: 2px 0; }

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
      .awc-block-controls{ display: contents; }
      .awc-block-controls button{ width: 20px; height: 20px; font-size: 11px; border: none; background: transparent; cursor: pointer; border-radius: 3px; color: #8C8674; line-height: 1; }
      .awc-block-controls button:hover{ background: #EFEADA; color: #23211A; }
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
    `}</style>
  )
}

/**
 * Cái clipboard mang tới, đọc về markdown.
 *
 * Bản HTML được ưu tiên vì nó là bản **giữ định dạng**: Notion và Lark bỏ đậm
 * và bỏ link khi viết bản `text/plain`, nên đọc bản chữ thuần là chấp nhận
 * mất chữ đậm và mất địa chỉ của mọi lần dán. Đọc bản HTML rồi dịch về
 * markdown thì định dạng sống sót mà style của trang nguồn không theo sang.
 *
 * Nguồn nào chỉ đặt chữ thuần — trình soạn mã, cửa sổ terminal — thì bản ấy
 * thường đã là markdown sẵn.
 */
function clipboardMarkdown(e: ClipboardEvent<HTMLElement>): string {
  const html = e.clipboardData.getData('text/html')
  /*
   * Phải thấy một cái thẻ thật thì mới coi là HTML.
   *
   * Có nguồn trả về chính chữ thuần cho ô `text/html`. Đem chữ thuần đi phân
   * tích như HTML là nuốt sạch ký tự xuống dòng — sáu gạch đầu dòng về một
   * dòng, đúng cái lỗi lượt này đang sửa.
   */
  if (/<[a-z!/]/i.test(html)) {
    const drawn = htmlToMarkdown(html)
    if (drawn.trim() !== '') return drawn
  }
  return e.clipboardData.getData('text/plain')
}

/**
 * Chỗ trong chữ mà con trỏ chuột vừa chỉ vào, tính theo chữ **đã vẽ**.
 *
 * Không có nó thì bấm vào giữa một đoạn sẽ nhảy về cuối dòng — thao tác
 * thường nhất trong một ô nhập trở thành thao tác hỏng.
 */
function drawnIndexAt(root: HTMLElement, x: number, y: number): number {
  type WithCaret = Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const doc = document as WithCaret
  const spot = doc.caretPositionFromPoint?.(x, y)
  const range = spot ? null : doc.caretRangeFromPoint?.(x, y)
  const node = spot?.offsetNode ?? range?.startContainer
  const offset = spot?.offset ?? range?.startOffset ?? 0
  if (!node || !root.contains(node)) return (root.textContent ?? '').length

  let seen = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let text: Node | null
  while ((text = walker.nextNode())) {
    if (text === node) return seen + offset
    seen += text.textContent?.length ?? 0
  }
  return seen
}

/**
 * A canvas that throws takes the whole screen down with it, and all the owner
 * sees is an empty page while the network tab shows the post arriving fine.
 * Saying what broke turns "it shows nothing" into a report someone can act on.
 */
class CanvasFailure extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div role="alert" style={{ padding: 24, border: `1px solid ${ink.border}`, borderRadius: radius, fontFamily: sans, fontSize: 13, color: ink.base }}>
        Không vẽ được mặt soạn của bài này. Nội dung vẫn còn nguyên; hãy chụp dòng dưới đây gửi lại.
        <pre style={{ marginTop: 12, fontSize: 12, color: ink.danger, whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      </div>
    )
  }
}

function EditableField({
  value,
  onCommit,
  multiline = false,
  rows = 2,
  placeholder,
  focus,
  focusCaret,
  onFocused,
  onBlurred,
  onKeyDown,
  onPasteText,
  onType,
  pasteAsText = false,
  markdown = false,
  accentInk = ink.base,
  style,
}: {
  value: string
  onCommit: (value: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
  /** Put the cursor here — used when an emptied block merges into the text above. */
  focus?: boolean
  /** Chỗ đặt con trỏ trong ô; vắng nghĩa là cuối chữ. */
  focusCaret?: number
  onFocused?: () => void
  /**
   * Rời ô — **luôn** báo, kể cả khi chữ không đổi.
   *
   * `onCommit` chỉ chạy khi chữ có đổi, nên chỗ nào treo việc "đóng ô lại" vào
   * nó thì bấm vào rồi bấm ra mà không gõ gì là ô kẹt luôn ở mặt gõ.
   */
  onBlurred?: () => void
  /**
   * Phím bấm trong ô, cho những thao tác không phải là gõ chữ — Tab lùi lề
   * chẳng hạn.
   *
   * Nhận theo chữ đang có trong ô, chứ không phải một hàm "nộp đi": nộp rồi
   * mới lùi là hai lần ghi, lần sau dựng từ dữ liệu trước lần đầu, nên nó xoá
   * mất chữ vừa gõ. Người nhận phải gộp cả hai vào một lần ghi.
   */
  onKeyDown?: (e: KeyboardEvent<HTMLElement>, current: string) => void
  /**
   * Chỗ đọc cái vừa dán trước khi ô nhập thấy nó.
   *
   * Trả `true` nghĩa là đã nhận và tự xử lý — ô nhập không dán nữa. Trả
   * `false` thì trình duyệt dán như thường: một dòng chữ vẫn chỉ là gõ chữ,
   * và chặn nó lại là làm hỏng thao tác quen thuộc nhất trong một ô nhập.
   */
  onPasteText?: (text: string) => boolean
  /**
   * Chữ trong ô, báo ra **ngay lúc gõ** chứ không đợi rời ô.
   *
   * Menu `/` lọc theo từng chữ vừa gõ, mà `onCommit` chỉ chạy lúc rời ô —
   * đợi tới đó thì menu chỉ hiện ra sau khi người viết đã bỏ đi.
   */
  onType?: (text: string, caret: number) => void
  /**
   * Dán vào ô này là **chèn chữ**, không phải sinh khối mới.
   *
   * Với một dải chữ liền thì cấu trúc đã nằm ngay trong chữ, nên cái dán vào
   * chỉ cần về đúng markdown rồi chèn tại con trỏ. Vẫn đọc bản HTML trước để
   * chữ đậm và link của Notion không rơi mất.
   */
  pasteAsText?: boolean
  /**
   * Ô vẽ markdown khi không gõ, và chỉ hiện chữ thô lúc con trỏ nằm trong nó.
   *
   * Luật nhóm 16: màn soạn vẽ đúng thứ trang sẽ vẽ. Một ô luôn hiện `**chữ**`
   * là bắt người viết đọc ký hiệu thay vì đọc bài — họ phải sang ô Xem trước
   * mới biết đoạn mình vừa viết trông ra sao.
   */
  markdown?: boolean
  /** Màu của bài, cho chữ nhấn và link lúc vẽ. */
  accentInk?: string
  style?: CSSProperties
}) {
  const [local, setLocal] = useState(value)
  const el = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => setLocal(value), [value])

  /*
   * Ô markdown có hai mặt: mặt vẽ và mặt gõ. `caret` mang chỗ cần đặt con trỏ
   * khi lật từ mặt này sang mặt kia — `null` nghĩa là đang ở mặt vẽ.
   */
  const [caret, setCaret] = useState<number | null>(null)
  const editing = caret !== null
  useEffect(() => {
    const node = el.current
    if (!editing || !node) return
    node.focus()
    node.setSelectionRange(caret, caret)
    // Chỉ chạy khi vừa lật sang mặt gõ; theo dõi `caret` nữa thì mỗi lần
    // người viết bấm sang chỗ khác trong ô, con trỏ lại bị kéo về chỗ cũ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

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
    /*
     * Đo từ 0, không từ `auto`.
     *
     * `height: auto` trên một `textarea` rơi về thuộc tính `rows`, nên
     * `scrollHeight` đọc ra ba dòng kể cả khi trong ô chỉ có một. Đo trong
     * Chrome thật: một đoạn một dòng ra 80px thay vì 17px.
     */
    node.style.height = '0px'
    /*
     * Ô markdown bỏ mức thấp nhất theo `rows`.
     *
     * Đo trong Chrome thật: một đoạn một dòng có mặt vẽ cao 17px còn mặt gõ
     * cao 75.8px, vì `rows={3}` ép sàn ba dòng. Bấm vào một đoạn ngắn là cả
     * trang giật xuống 47px. Hai mặt của cùng một ô phải cao bằng nhau, nên
     * mặt gõ cũng chạy theo nội dung như mặt vẽ.
     */
    const css = getComputedStyle(node)
    const line = parseFloat(css.lineHeight) || 0
    /*
     * Cộng thêm viền.
     *
     * Cả hai mặt dùng `box-sizing: border-box`, nên `height` phải bao cả viền,
     * mà `scrollHeight` thì không đếm viền. Thiếu hai pixel ấy là mỗi lần bấm
     * vào một ô, cả trang nhích lên một cái.
     */
    const border = (parseFloat(css.borderTopWidth) || 0) + (parseFloat(css.borderBottomWidth) || 0)
    node.style.height = markdown
      ? `${node.scrollHeight + border}px`
      : `${Math.max(node.scrollHeight, line * rows) + border}px`
    // `editing` nằm trong deps vì ô markdown chỉ dựng `textarea` lúc lật sang
    // mặt gõ: không nghe nó thì chiều cao không bao giờ được đặt, và ô giữ
    // nguyên sàn ba dòng của thuộc tính `rows`.
  }, [local, multiline, rows, markdown, editing])
  /*
   * Chỗ khác gọi con trỏ về ô này.
   *
   * Một phím trong danh sách hay một khối vừa biến mất đều để lại câu hỏi
   * "giờ con trỏ ở đâu", và câu trả lời gần như không bao giờ là "cuối ô" —
   * nhập một mục lên thì con trỏ phải đứng ở **chỗ nối**, tách một mục thì
   * phải ở đầu mục mới. Nên chỗ gọi nói rõ vị trí; không nói thì mới là cuối.
   */
  /*
   * Đặt con trỏ **đúng một lần** cho mỗi lần được gọi tới.
   *
   * Không chốt lại thì effect chạy mỗi lượt vẽ — chỗ gọi thường truyền một
   * arrow mới cho `onFocused` nên deps đổi liên tục — và mỗi lần chạy nó kéo
   * con trỏ về chỗ cũ. Hệ quả: vừa bôi đen xong là vùng chọn biến mất. Test
   * bắt được đúng lúc chuyển sang mô hình dải, nơi bôi đen là việc chính.
   */
  const placed = useRef(false)
  useEffect(() => {
    if (!focus) {
      placed.current = false
      return
    }
    // Ô đang ở mặt vẽ thì phải lật sang mặt gõ trước khi có gì để đặt con trỏ.
    if (markdown && caret === null) {
      setCaret(focusCaret ?? value.length)
      return
    }
    if (placed.current) return
    const node = el.current
    if (!node) return
    placed.current = true
    node.focus()
    const spot = Math.max(0, Math.min(focusCaret ?? node.value.length, node.value.length))
    node.setSelectionRange(spot, spot)
    onFocused?.()
  }, [focus, focusCaret, markdown, caret, value.length, onFocused])

  const commit = () => {
    // Rời ô là quay về mặt vẽ, kể cả khi chữ không đổi — nếu không thì một ô
    // đã bấm vào rồi bấm ra vẫn nằm ở mặt chữ thô suốt buổi.
    setCaret(null)
    if (local !== value) onCommit(local)
    onBlurred?.()
  }

  /*
   * Vùng chọn cần khôi phục sau khi chèn dấu.
   *
   * Chèn `**` vào giữa chữ làm mọi vị trí phía sau xê dịch, nên để trình
   * duyệt tự giữ vùng chọn là để nó ôm nhầm chữ. Phải đặt lại sau lượt vẽ,
   * khi ô đã mang chữ mới.
   */
  const pending = useRef<{ start: number; end: number } | null>(null)
  useEffect(() => {
    const want = pending.current
    const node = el.current
    if (!want || !node) return
    pending.current = null
    node.setSelectionRange(want.start, want.end)
  }, [local])

  /** `Cmd+B` · `Cmd+U` · `Cmd+K`. Trả `true` nghĩa là đã nhận phím. */
  function format(e: KeyboardEvent<HTMLElement>): boolean {
    /*
     * Bật ở mọi ô đang giữ markdown, không riêng ô hai mặt.
     *
     * Dải chữ liền mạch cũng là markdown, chỉ khác là nó tự lo phần vẽ. Quên
     * nó ở đây là Cmd+B với Cmd+K chết ngay trong chỗ người viết gõ nhiều
     * nhất — test bắt được đúng lúc chuyển sang mô hình dải.
     */
    if (!markdown && !pasteAsText) return false
    const mark = markFor(e)
    const node = el.current
    if (!mark || !node) return false
    e.preventDefault()
    const out = applyMark(local, node.selectionStart ?? 0, node.selectionEnd ?? 0, mark)
    pending.current = { start: out.start, end: out.end }
    setLocal(out.text)
    return true
  }

  const paste =
    pasteAsText
      ? (e: ClipboardEvent<HTMLElement>) => {
          const node = el.current
          const text = clipboardMarkdown(e)
          if (!text || !node) return
          e.preventDefault()
          /*
           * Tự chèn chứ không nhờ `execCommand`.
           *
           * `execCommand` đã bị khai tử, và jsdom không dựng nó — nên nhờ nó
           * là vừa mất chỗ dựa vừa không kiểm được. Tự ghép chữ thì chỗ nào
           * cũng chạy như nhau, và vùng chọn sau khi dán do mình đặt.
           */
          const from = node.selectionStart ?? local.length
          const to = node.selectionEnd ?? from
          const next = local.slice(0, from) + text + local.slice(to)
          pending.current = { start: from + text.length, end: from + text.length }
          setLocal(next)
          onType?.(next, from + text.length)
        }
      : onPasteText
        ? (e: ClipboardEvent<HTMLElement>) => {
            const text = clipboardMarkdown(e)
            if (text && onPasteText(text)) e.preventDefault()
          }
        : undefined

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
    // Hai mặt của cùng một ô phải đo cùng một kiểu, nếu không thì lật mặt là
    // trang nhích.
    boxSizing: 'border-box',
    ...style,
  }

  /*
   * Mặt vẽ. Con trỏ chưa vào ô thì người viết nhìn thấy bài, không nhìn thấy
   * ký hiệu — `**chữ**` hiện ra là chữ nhấn, `[chữ](địa chỉ)` hiện ra là link.
   * Bấm vào là lật sang mặt gõ, ngay tại chỗ vừa bấm.
   */
  if (markdown && !editing) {
    const enter = (at: number) => setCaret(Math.max(0, Math.min(at, value.length)))
    return (
      <div
        className="awc-editable awc-md-view"
        role="textbox"
        tabIndex={0}
        aria-label={placeholder}
        onMouseDown={(e) => {
          // Chặn mặc định để cú bấm không mở link đang nằm trong chữ, và để
          // trình duyệt khỏi đặt vùng chọn vào một cái div sắp biến mất.
          e.preventDefault()
          enter(rawIndexFor(value, drawnIndexAt(e.currentTarget, e.clientX, e.clientY)))
        }}
        onFocus={() => enter(value.length)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            enter(value.length)
          }
        }}
        style={{ ...commonStyle, cursor: 'text', minHeight: '1.2em', whiteSpace: 'pre-wrap' }}
      >
        {value === '' ? (
          <span style={{ color: ink.muted }}>{placeholder}</span>
        ) : (
          <Inline text={value} accentInk={accentInk} />
        )}
      </div>
    )
  }

  if (multiline) {
    return (
      <textarea
        ref={el}
        className="awc-editable"
        // Ô còn chữ chưa ghi thì Cmd+Z là của trình duyệt, không của màn soạn
        // — xem `historyKey`.
        data-dirty={local !== value ? 'true' : undefined}
        value={local}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => {
          setLocal(e.target.value)
          onType?.(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (format(e)) return
          onKeyDown?.(e, local)
        }}
        onPaste={paste}
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
      data-dirty={local !== value ? 'true' : undefined}
      value={local}
      placeholder={placeholder}
      onChange={(e) => {
          setLocal(e.target.value)
          onType?.(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }}
      onBlur={commit}
      onKeyDown={(e) => {
          if (format(e)) return
          onKeyDown?.(e, local)
        }}
      onPaste={paste}
      style={commonStyle}
    />
  )
}

/**
 * Ghi ảnh cho **một** ô ảnh cố định mà không làm mất những ô khác.
 *
 * `plate_images` là một cột jsonb, và PATCH ghi đè cả giá trị của cột chứ
 * không trộn — gửi lên mỗi `{ primary: … }` là hai ô kia biến mất. Nên bản đồ
 * cũ phải đi cùng, mỗi lần.
 *
 * `null` là gỡ ảnh ra. Không xoá hẳn khoá đi: một khoá còn đó với giá trị rỗng
 * đọc ra vẫn là "ô này chưa có ảnh", và `plateImage` trả `null` cho cả hai.
 */
/** Tên ba ô ảnh của article, đúng chữ hiện trên chính ô ấy khi nó còn trống. */
const ARTICLE_PLATE_NAME: Record<string, string> = {
  primary: 'Ảnh chính',
  secondary: 'Ảnh phụ',
  detail: 'Chi tiết · ô vuông ở cột phải',
  hero: 'Khung ảnh hồng · cạnh tiêu đề',
}

function platePatch(post: PostDetail, key: string, url: string | null): EditPatch {
  return { plate_images: { ...(post.plate_images ?? {}), [key]: url } }
}

// ---------------------------------------------------------------------------
// article — every editable field is wired through Article's own overrides,
// so what's on screen while editing is exactly the public render.
// ---------------------------------------------------------------------------

function ArticleEditor({
  post,
  module,
  onChange,
}: {
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
}) {
  // Same adapter as the public journal, so the canvas is edited against what
  // will actually ship.
  /*
   * Không bỏ ảnh bìa: khung ảnh hồng (`hero`) nay có nút riêng và mặc định
   * mang ảnh bìa, nên màn sửa phải cho thấy nó đang mang gì.
   */
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
  const sectionRuns = toSectionRuns(sections)
  /** Which row has its insert menu open; `-1` is the trough at the foot. */
  const [menuAt, setMenuAt] = useState<number | null>(null)

  /*
   * One `+` trough, the same one every other template uses.
   *
   * Article used to have a lone "+ PHẦN" button under the last section, which
   * could only append and could only append a section — so the store's blocks
   * were out of reach here while the other five templates had them.
   */
  const insertPlus = (at: number, insertAtIndex: number) => (
    <InsertPlus
      open={menuAt === at}
      onToggle={() => setMenuAt(menuAt === at ? null : at)}
      onInsert={(t) => {
        setSections(insertAt(sections, insertAtIndex, blankReportBlock(t) as never))
        setMenuAt(null)
      }}
    />
  )

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
      renderLead={(lead) => <EditableField value={lead} multiline rows={1} placeholder="mô tả" onCommit={(v) => onChange({ lead: v })} />}
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
      /*
       * Nút tải ảnh ở góc từng ô ảnh.
       *
       * Article có nhiều ô ảnh cố định nhất trong sáu khuôn — hero, cặp ô mở
       * đầu, ô vuông ở cột phải, cộng một ô cho mỗi phần có hình — và ba ô ở
       * giữa xưa nay không có chỗ nào đặt ảnh vào cả.
       *
       * Trừ `hero`: ảnh bìa nay đặt ở băng "trang bìa" trên đầu khung sửa, một
       * chỗ đặt cho cả sáu khuôn, nên ô hero ở đây không có nút và không vẽ
       * ảnh.
       */
      renderPlateAction={(slot) => {
        /*
         * Khung ảnh hồng: mặc định theo ảnh bìa, và đặt được ảnh riêng — tải
         * lên hoặc dán link. Nút chỉ biết ảnh RIÊNG của khung, nên "gỡ" chỉ
         * hiện khi có ảnh riêng, và gỡ xong là khung lại mang ảnh bìa.
         */
        if (slot.key === 'hero')
          return (
            <PlateImageUpload
              imageUrl={post.plate_images?.hero || null}
              name={ARTICLE_PLATE_NAME.hero}
              onUrl={(url) => onChange(platePatch(post, 'hero', url))}
              onClear={() => onChange(platePatch(post, 'hero', null))}
            />
          )
        // `fig-3` là ô ảnh của phần thứ ba; ảnh của nó nằm trong `body`, cạnh
        // chú thích và ghi chú bên lề của chính phần ấy.
        const at = slot.key.startsWith('fig-') ? Number(slot.key.slice(4)) : NaN
        if (Number.isInteger(at)) {
          const setFigImage = (imageUrl: string | null) =>
            updateSection(at, { fig: { ...(sections[at]?.fig as FigureData), imageUrl } })
          return (
            <PlateImageUpload
              imageUrl={slot.imageUrl}
              name={`Ảnh của phần ${at + 1}`}
              onUrl={(url) => setFigImage(url)}
              onClear={() => setFigImage(null)}
            />
          )
        }
        return (
          <PlateImageUpload
            imageUrl={slot.imageUrl}
            name={ARTICLE_PLATE_NAME[slot.key] ?? 'Ô ảnh của khuôn bài'}
            onUrl={(url) => onChange(platePatch(post, slot.key, url))}
            onClear={() => onChange(platePatch(post, slot.key, null))}
          />
        )
      }}
      wrapSection={(section, i) => {
        /*
         * Mọi phần liền nhau nhập vào **một** ô duy nhất, để bôi đen đi được
         * từ đoạn này sang đoạn kia. Phần có ảnh đứng riêng: ảnh không viết ra
         * markdown được, gộp vào thì nó biến mất khỏi chỗ soạn.
         */
        const run = runAtSection(sectionRuns, i)
        if (run?.kind === 'text') {
          if (i !== run.at[0]) return null
          return (
            <LiveRun
              key={i}
              text={run.text}
              at={run.at[0]}
              menuOpen={menuAt === i}
              onToggleMenu={() => setMenuAt(menuAt === i ? null : i)}
              onCommit={(md) => setSections(writeSectionRun(sections, run.at, md))}
              onInsertAt={(lines, t, md) => {
                const thing = blankReportBlock(t) as never as SectionData
                const next = insertSectionThing(sections, run.at, md, lines, thing)
                setSections(next)
                setMenuAt(null)
                return next.indexOf(thing)
              }}
              drop={{
                active: drag.from !== null,
                onDrop: (lines) => {
                  if (drag.from !== null)
                    setSections(moveIntoRun(sections, drag.from, run.at, run.text, lines, insertSectionThing))
                  drag.end()
                },
              }}
              onBackspaceAtStart={() => {
                const before = run.at[0] - 1
                if (before < 0) return false
                setSections(removeAt(sections, before, true))
                return true
              }}
              onDeleteAtEnd={() => {
                const after = run.at[1] + 1
                if (after >= sections.length) return false
                setSections(removeAt(sections, after, true))
                return true
              }}
            />
          )
        }
        return (
          <RowShell
            noun={isStoredElement(sections[i]) ? 'khối' : 'phần'}
            index={i}
            drag={drag}
            onMove={(dir) => setSections(move(sections, i, i + dir))}
            // Phần chữ thì giữ lại cái cuối cùng; khối (bảng, ảnh) thì xoá được
            // cả khi nó là thứ duy nhất trong bài — bài rỗng vẫn có dải chữ để gõ.
            onRemove={() => setSections(removeAt(sections, i, !isStoredElement(sections[i])))}
            onDuplicate={() => setSections(duplicateAt(sections, i))}
            plus={insertPlus(i, i + 1)}
            onAddLine={() => setSections(insertAt(sections, i + 1, { h: '', p: '' } as SectionData))}
          >
            {isStoredElement(sections[i]) ? (
              <StoredBlockFields
                block={sections[i] as unknown as ReportBlock}
                palette={paletteFrom(post.theme_color ?? module?.accent ?? REPORT_BLUE)}
                onChange={(next) =>
                  setSections(sections.map((x, k) => (k === i ? (next as never) : x)))
                }
              />
            ) : (
              section
            )}
          </RowShell>
        )
      }}
      /* Bài rỗng thì đây là mặt soạn **duy nhất** — xem `renderAfterElements`. */
      renderAfterSections={() =>
        sections.length === 0 ? (
          <LiveRun
            text=""
            at={0}
            menuOpen={menuAt === -1}
            onToggleMenu={() => setMenuAt(menuAt === -1 ? null : -1)}
            onCommit={(md) => setSections(writeSectionRun(sections, [0, -1], md))}
            onInsertAt={(lines, t, md) => {
              const thing = blankReportBlock(t) as never as SectionData
              const next = insertSectionThing(sections, [0, -1], md, lines, thing)
              setSections(next)
              setMenuAt(null)
              return next.indexOf(thing)
            }}
          />
        ) : (
          <div className="awc-rep-block">
            <div className="awc-gutter" style={{ opacity: 1 }}>
              {insertPlus(-1, sections.length)}
            </div>
          </div>
        )
      }
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
  /*
   * Bài trong kho có thể vẫn còn khối `cont` cũ. Ghi lại thì ghi cả bài ở dạng
   * mới — nửa cũ nửa mới trong một `body` là chỗ để lẫn về sau.
   */
  const blocks = normalizeBlocks(getBody<LongformBlock>(post))
  const write = (next: LongformBlock[]) => onChange({ body: next })
  /** Khối đang mở menu chèn; `-1` là cái máng ở cuối bài. */
  const [menuAt, setMenuAt] = useState<number | null>(null)
  const runs = toLongformRuns(blocks)
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

  const drag = useRowDrag((from, to) => write(move(blocks, from, to)))

  /*
   * Khối trắng nay lấy từ kho (`blankReportBlock`), không còn bảng riêng ở
   * đây — đó chính là chỗ làm menu của long-form khác mọi khuôn khác.
   *
   * `LABEL` ở lại vì `RowShell` cần gọi tên khối **cũ** cho đúng khi nói "xoá
   * đoạn văn"; bài đang có 400 khối viết bằng từ vựng ấy.
   */
  const LABEL: Record<string, string> = {
    p: 'đoạn văn', h2: 'tiêu đề', h3: 'tiêu đề nhỏ', li: 'gạch đầu dòng',
    formula: 'công thức', note: 'ghi chú',
  }

  /**
   * Ảnh cho một khung ảnh, kể cả khung nằm trong một hộp ghi chú.
   *
   * `fig-12` là khung của khối thứ 12; `fig-12-3` là khung con thứ 3 bên trong
   * hộp ghi chú ở khối 12. Khung ảnh của long-form đến từ bản xuất Notion, nên
   * `src` của nó xưa nay chỉ đọc — bài mất ảnh thì khung trắng nằm đó.
   */
  const setFigSrc = (key: string, src: string | null) => {
    const [, outer, inner] = key.split('-')
    const i = Number(outer)
    if (!Number.isInteger(i)) return
    if (inner === undefined) return at(i, (b) => ({ ...b, src: src ?? undefined }))
    const j = Number(inner)
    at(i, (b) => ({
      ...b,
      items: (b.items ?? []).map((c, k) => (k === j ? { ...c, src: src ?? undefined } : c)),
    }))
  }

  return (
    <PostRenderer
      template="longform"
      post={toLongformData(post, module)}
      renderPlateAction={(slot) => (
        <PlateImageUpload
          imageUrl={slot.imageUrl}
          name="Khung ảnh trong bài dài"
          onUrl={(url) => setFigSrc(slot.key, url)}
          onClear={() => setFigSrc(slot.key, null)}
        />
      )}
      wrapBlock={(drawn, i, kind) => {
        /*
         * Mọi khối chữ liền nhau nhập vào **một** ô duy nhất.
         *
         * Chủ site: *"tôi không dùng chuột bôi đen được vậy? nó vẫn cứ bị bôi
         * đen theo paragraph ấy"* — vì mỗi khối một ô nhập, và trình duyệt
         * không cho một vùng chọn trải qua hai ô. Cả dải vẽ một lần, ở khối
         * đầu dải; những khối sau trong cùng dải không vẽ gì.
         */
        const run = runAtIndex(runs, i)
        if (run?.kind === 'text') {
          if (i !== run.at[0]) return null
          return (
            <LiveRun
              key={i}
              text={run.text}
              at={run.at[0]}
              menuOpen={menuAt === i}
              onToggleMenu={() => setMenuAt(menuAt === i ? null : i)}
              onCommit={(md) => write(writeLongformRun(blocks, run.at, md))}
              onInsertAt={(lines, t, md) => {
                const thing = blankReportBlock(t) as never as LongformBlock
                const next = insertLongformThing(blocks, run.at, md, lines, thing)
                write(next)
                setMenuAt(null)
                return next.indexOf(thing)
              }}
              drop={{
                active: drag.from !== null,
                onDrop: (lines) => {
                  if (drag.from !== null)
                    write(moveIntoRun(blocks, drag.from, run.at, run.text, lines, insertLongformThing))
                  drag.end()
                },
              }}
              onBackspaceAtStart={() => {
                const before = run.at[0] - 1
                if (before < 0) return false
                write(removeAt(blocks, before, true))
                return true
              }}
              onDeleteAtEnd={() => {
                const after = run.at[1] + 1
                if (after >= blocks.length) return false
                write(removeAt(blocks, after, true))
                return true
              }}
            />
          )
        }
        return (
          <RowShell
            noun={LABEL[kind] ?? 'khối'}
            index={i}
            drag={drag}
            onMove={(dir) => write(move(blocks, i, i + dir))}
            onRemove={() => write(removeAt(blocks, i, true))}
            onDuplicate={() => write(duplicateAt(blocks, i))}
            onAddLine={() => write(insertAt(blocks, i + 1, { k: 'p', runs: [] } as LongformBlock))}
            plus={
              <InsertPlus
                open={menuAt === i}
                onToggle={() => setMenuAt(menuAt === i ? null : i)}
                onInsert={(t) => {
                  write(insertAt(blocks, i + 1, blankReportBlock(t) as never))
                  setMenuAt(null)
                }}
              />
            }
          >
            {(blocks[i] as { k?: string }).k === undefined ? (
              <StoredBlockFields
                block={blocks[i] as unknown as ReportBlock}
                palette={paletteFrom(post.theme_color ?? module?.accent ?? REPORT_BLUE)}
                onChange={(next) => write(blocks.map((b, k) => (k === i ? (next as never) : b)))}
              />
            ) : (
              drawn
            )}
          </RowShell>
        )
      }}
      /*
       * Trước đây chỗ này là một hàng sáu cái nút "+ đoạn văn", "+ tiêu đề"…
       * nằm dưới đáy bài — chỉ longform còn kiểu ấy, và nó chỉ thêm được vào
       * cuối. Nay là đúng cái máng `+` của mọi khuôn khác, và chèn được vào
       * giữa bài.
       */
      /*
       * Mấy dòng bên trong một `aside` cũng gộp thành một ô, cùng lý do với
       * tầng ngoài: chủ site bôi đen trong hộp ghi chú thì nó vẫn dừng ở từng
       * dòng. Ảnh trong hộp vẫn do trang tự vẽ.
       */
      wrapAsideItem={(drawn, i, sub) => {
        const items = blocks[i]?.items ?? []
        const inner = toLongformRuns(items)
        const run = runAtIndex(inner, sub)
        if (run?.kind !== 'text') return drawn
        if (sub !== run.at[0]) return null
        return (
          <LiveText
            text={run.text}
            onCommit={(md) => at(i, (b) => ({ ...b, items: writeLongformRun(items, run.at, md) }))}
          />
        )
      }}
      /* Bài rỗng thì đây là mặt soạn **duy nhất** — xem `renderAfterElements`. */
      renderAfterBlocks={() =>
        blocks.length === 0 ? (
          <LiveRun
            text=""
            at={0}
            menuOpen={menuAt === -1}
            onToggleMenu={() => setMenuAt(menuAt === -1 ? null : -1)}
            onCommit={(md) => write(writeLongformRun(blocks, [0, -1], md))}
            onInsertAt={(lines, t, md) => {
              const thing = blankReportBlock(t) as never as LongformBlock
              const next = insertLongformThing(blocks, [0, -1], md, lines, thing)
              write(next)
              setMenuAt(null)
              return next.indexOf(thing)
            }}
          />
        ) : (
          <div className="awc-rep-block">
            <div className="awc-gutter" style={{ opacity: 1 }}>
              <InsertPlus
                open={menuAt === -1}
                onToggle={() => setMenuAt(menuAt === -1 ? null : -1)}
                onInsert={(t) => {
                  write(insertAt(blocks, blocks.length, blankReportBlock(t) as never))
                  setMenuAt(null)
                }}
              />
            </div>
          </div>
        )
      }
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
          style={{ font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}
        />
      )}
    />
  )
}

/**
 * Ô sửa chảy theo đúng dòng chữ nó thay thế.
 *
 * `EditableField` dựng `input`/`textarea` — một khối đặc, không quấn quanh ảnh
 * thả trôi được. Ở bitesize thì đó là hỏng: chữ phải chảy quanh ảnh, mà một
 * `textarea` rộng hết khổ bị đẩy xuống dưới ô ảnh phụ, để lại đúng "khúc trắng
 * tinh trống nguyên" chủ site chỉ ra — trong khi bản xem trước cùng dữ liệu ấy
 * lại chảy đẹp. Hai màn nói hai chuyện về cùng một bài.
 *
 * `contentEditable` thì chảy y như chữ thật, nên màn sửa và trang thật là một.
 * Chữ đặt bằng effect chứ không phải qua children: React mà đụng vào con của
 * một `contentEditable` đang gõ thì con trỏ nhảy về đầu.
 */
function InlineField({
  value,
  onCommit,
  placeholder,
}: {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && el.textContent !== value) el.textContent = value
  }, [value])

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      data-placeholder={placeholder}
      onBlur={(e) => {
        // `innerText` giữ chỗ xuống dòng; `textContent` thì nuốt. jsdom không
        // có `innerText`, nên lùi về `textContent` khi chạy trong bài kiểm.
        const next = e.currentTarget.innerText ?? e.currentTarget.textContent ?? ''
        if (next !== value) onCommit(next)
      }}
      onPaste={(e) => {
        /*
         * Ô này là `contentEditable`, nên dán mặc định nhét nguyên HTML của
         * trang nguồn vào — cả thẻ lẫn style. Chữ trông đúng trong lúc soạn
         * rồi mang phông và màu của Notion ra trang. Chỉ nhận chữ thuần.
         */
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        if (text) document.execCommand('insertText', false, text)
      }}
      style={{ outline: 'none', cursor: 'text' }}
    />
  )
}

/**
 * Bitesize note — sửa ngay trên bản vẽ, như mọi template khác.
 *
 * Hai ô chọn ở đầu không phải nội dung mà là dàn trang: độ dài quyết định cỡ
 * tiêu đề trong lưới Ghi 01, khung dọc quyết định ảnh đứng cạnh chữ hay nằm
 * trên. Chúng nằm trong `body` jsonb chứ không thành cột mới — đúng cách bốn
 * template kia mang phần riêng của chúng.
 */
/**
 * Ô nhập cho một khối lấy từ kho, ở những khuôn bài giữ từ vựng riêng.
 *
 * Long-form và article lưu thân bài bằng từ vựng của chính chúng
 * (`LongformBlock`, `SectionData`) nhưng nay chèn được khối của kho vào giữa.
 * Lúc mới nối, `RowShell` bọc **bản vẽ** của khối — nên thêm một cái bảng thì
 * thấy bảng mà không gõ vào ô nào được. Chỗ này bọc đúng ô nhập.
 *
 * Bốn móc bàn phím để trơ, có chủ ý và nói rõ ra đây thay vì im lặng: chúng
 * nói về vị trí của một khối **trong dải chữ**, mà một khối của kho ở hai
 * khuôn này lại nằm *giữa* các dải chứ không ở trong dải nào. Việc xoá nó bằng
 * bàn phím đã có `onBackspaceAtStart` / `onDeleteAtEnd` của dải bên cạnh lo.
 */
function StoredBlockFields({
  block,
  palette,
  onChange,
}: {
  block: ReportBlock
  palette: Palette
  onChange: (next: ReportBlock) => void
}) {
  return (
    <ReportBlockFields
      block={block}
      palette={palette}
      onChange={onChange}
      onPasteBlocks={() => false}
      onTextKey={() => {}}
      onSlash={() => {}}
    />
  )
}

/**
 * Một dải chữ: cái máng `+` bám con trỏ soạn, và cả dải nhận thả khối.
 *
 * **Máng `+`.** Trước đây một khối là một dòng, nên cái máng ghim ở đỉnh khối
 * cũng chính là đỉnh dòng. Từ khi mấy khối chữ liền nhau gộp vào **một** ô,
 * một dải dài mấy chục dòng vẫn chỉ có một cái máng nằm chết ở dòng đầu. Bản
 * vá đầu cho nó chạy theo `onMouseMove`, và chủ site bắt đúng chỗ sai: *"nút
 * [+] đang đi theo trỏ chuột thay vì vị trí của trỏ editor là cái [|]"*. Nay
 * nó đo con trỏ soạn — chuột đưa đi đâu thì đưa, chỗ chèn vẫn là chỗ đang gõ.
 *
 * **Chỗ thả.** Ảnh và bảng có tay nắm từ lâu, nhưng chỉ khối khác mới nhận
 * thả, nên trong một bài "chữ – ảnh – chữ" nhấc cái ảnh lên là không có điểm
 * rơi nào và nó về chỗ cũ. Dải chữ nay nhận thả, với một vạch rơi chạy theo
 * chuột tới đúng dòng đang hover.
 *
 * Chữ **không** vì thế mà thành khối: nó vẫn là một dòng chảy, không có tay
 * nắm, không cắt theo đoạn. Chủ site: *"chữ không có khối, không tách
 * paragraph, tất cả là long form edit như lark/markdown/ghost"*. Cái đi lại
 * được là ảnh, bảng, trích dẫn — dải chữ chỉ cho chúng một chỗ để hạ cánh.
 */
function LiveRun({
  text,
  at,
  menuOpen,
  onToggleMenu,
  onCommit,
  onInsertAt,
  drop,
  onBackspaceAtStart,
  onDeleteAtEnd,
}: {
  text: string
  /** Chỉ số trong kho của khối đầu dải — để bàn phím tìm được dải này. */
  at: number
  menuOpen: boolean
  onToggleMenu: () => void
  onCommit: (markdown: string) => void
  /**
   * Chèn một khối vào giữa dải.
   *
   * `lines` là số dòng có chữ đứng trên chỗ chèn (xem `linesThrough`), đo trên
   * `markdown` — chữ **đang** nằm trên mặt soạn, kể cả phần chưa ghi: chèn
   * bằng `/` thì người viết chưa rời ô lần nào.
   */
  onInsertAt: (lines: number, type: string, markdown: string) => number | void
  /** Nhận khối đang được kéo. Vắng thì dải này không phải chỗ hạ cánh. */
  drop?: { active: boolean; onDrop: (lines: number) => void }
} & LiveEdges) {
  const host = useRef<HTMLDivElement>(null)
  /** Dòng con trỏ soạn đang ở, và nó nằm cách đỉnh dải bao nhiêu. */
  const [line, setLine] = useState<{ block: number; line: number; top: number }>({ block: 0, line: 0, top: 0 })
  /** Chỗ khối đang kéo sẽ rơi xuống; `null` là không có ai đang kéo. */
  const [over, setOver] = useState<{ lines: number; top: number } | null>(null)
  /** Menu `/`: khối đang gõ lệnh, chữ sau dấu `/`, và mục đang sáng. */
  const [slash, setSlash] = useState<{ block: number; query: string; active: number } | null>(null)
  /** Lệnh `/` vừa bị Esc — đừng mở lại chừng nào chữ ấy còn nguyên. */
  const dismissed = useRef<string | null>(null)

  const inputEl = () => host.current?.querySelector<HTMLElement>('.awc-live-input') ?? null

  /**
   * Chỗ khối đang kéo sẽ rơi, đo theo **dòng chữ** dưới chuột.
   *
   * Trước đây đo theo khối của mặt soạn: năm đoạn long-form gộp làm một khối
   * thì chỉ có một chỗ thả, sau cả năm. Nay hỏi trình duyệt ký tự nào nằm dưới
   * chuột (`caretRangeFromPoint`), đổi ra dòng, rồi nửa trên của dòng là thả
   * lên trên nó, nửa dưới là thả xuống dưới.
   *
   * Chuột ở ngoài cột chữ — máng trái, khoảng đệm — thì kẹp về cột chữ: mọi
   * điểm trong dải đều là một điểm hạ cánh.
   */
  const gapAt = (clientX: number, clientY: number) => {
    const box = host.current
    const input = inputEl()
    if (!box || !input || input.children.length === 0) return null
    const ir = input.getBoundingClientRect()
    const x = Math.min(Math.max(clientX, ir.left + 2), ir.right - 2)
    const y = Math.min(Math.max(Number.isFinite(clientY) ? clientY : ir.top, ir.top + 1), ir.bottom - 1)
    const pos = caretAtPoint(x, y)
    let hit = pos && input.contains(pos.node) ? lineOfPoint(input, pos.node, pos.offset) : null
    let rect: DOMRect | null = null
    if (hit && pos) {
      const r = document.createRange()
      r.setStart(pos.node, pos.offset)
      r.collapse(true)
      const measured = typeof r.getBoundingClientRect === 'function' ? r.getBoundingClientRect() : null
      rect = measured && measured.height > 0 ? measured : hit.el.getBoundingClientRect()
    } else {
      // Không đọc được ký tự dưới chuột: lấy khối gần nhất theo chiều dọc.
      const kids = Array.from(input.children) as HTMLElement[]
      let best = 0
      let gap = Infinity
      kids.forEach((k, i) => {
        const r = k.getBoundingClientRect()
        const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
        if (d < gap) {
          best = i
          gap = d
        }
      })
      rect = kids[best].getBoundingClientRect()
      hit = { block: best, line: y > (rect.top + rect.bottom) / 2 ? Number.MAX_SAFE_INTEGER - 1 : 0, el: kids[best] }
    }
    const lower = y > (rect.top + rect.bottom) / 2
    const through = linesThrough(text, hit.block, hit.line)
    const top = box.getBoundingClientRect().top
    return {
      lines: lower || hit.line === Number.MAX_SAFE_INTEGER - 1 ? through : Math.max(0, through - 1),
      top: Math.round((lower ? rect.bottom : rect.top) - top),
    }
  }

  /*
   * Con trỏ soạn đang ở dòng nào, và có đang gõ lệnh `/` không.
   *
   * Đi từ nút neo của vùng chọn lên tới đứa con trực tiếp của ô nhập — mỗi
   * đứa con ấy là một khối — rồi đếm dòng bên trong nó (`lineOfPoint`).
   */
  const followCaret = useCallback(() => {
    const box = host.current
    const input = box?.querySelector<HTMLElement>('.awc-live-input')
    if (!box || !input) return
    const sel = window.getSelection()
    const anchor = sel?.anchorNode
    if (!sel || !anchor || !input.contains(anchor)) return
    const hit = lineOfPoint(input, anchor, sel.anchorOffset)
    if (!hit) return
    const boxTop = box.getBoundingClientRect().top
    let top = hit.el.getBoundingClientRect().top
    if (sel.rangeCount > 0) {
      const r = sel.getRangeAt(0)
      const rect = typeof r.getBoundingClientRect === 'function' ? r.getBoundingClientRect() : null
      if (rect && rect.height > 0) top = rect.top
    }
    setLine({ block: hit.block, line: hit.line, top: Math.round(top - boxTop) })

    /*
     * `/` ở đầu một dòng trống mở menu chèn, ngay tại chỗ — không phải với
     * tay ra nút `+`. Chỉ nhận ở một đoạn văn chỉ có mỗi lệnh ấy: `/` giữa
     * câu là một dấu gạch chéo, không phải một lời gọi.
     */
    const block = input.children[hit.block] as HTMLElement | undefined
    const said = block?.tagName === 'P' ? (block.textContent ?? '') : ''
    const m = /^\/([^\s/]{0,24})$/.exec(said)
    const key = `${hit.block}:${said}`
    if (m && dismissed.current !== key && sel.isCollapsed) {
      setSlash((was) => ({
        block: hit.block,
        query: m[1],
        active: was && was.query === m[1] ? was.active : 0,
      }))
    } else {
      if (!m) dismissed.current = null
      setSlash(null)
    }
  }, [])

  useEffect(() => {
    // `selectionchange` là sự kiện của cả tài liệu, không của một ô — đó là
    // đường duy nhất nghe được con trỏ đi lại bằng phím mũi tên lẫn bằng chuột.
    document.addEventListener('selectionchange', followCaret)
    return () => document.removeEventListener('selectionchange', followCaret)
  }, [followCaret])

  // Chữ đổi thì các dòng xê dịch, mà con trỏ không đi đâu cả nên
  // `selectionchange` không bắn. Đo lại sau mỗi lần vẽ có chữ mới.
  useLayoutEffect(followCaret, [text, followCaret])

  /** Chèn xong thì con trỏ vào ngay ô đầu của khối mới — không phải đi tìm nó. */
  const insert = (lines: number, type: string, markdown: string) => {
    const placed = onInsertAt(lines, type, markdown)
    if (typeof placed === 'number' && placed >= 0) focusThingLater(host.current, placed)
  }

  const chooseSlash = (type: string) => {
    if (!slash) return
    const markdown = takeBlock(inputEl(), slash.block)
    setSlash(null)
    if (markdown === null) return
    insert(slash.block <= 0 ? 0 : linesThrough(markdown, slash.block - 1, Number.MAX_SAFE_INTEGER - 1), type, markdown)
  }

  const slashNames = slash ? menuNames(slash.query, 'things') : []

  return (
    <div
      className="awc-rep-block"
      ref={host}
      data-flow="run"
      data-flow-at={at}
      onKeyDownCapture={
        slash && slashNames.length > 0
          ? (e) => {
              const n = slashNames.length
              if (e.key === 'ArrowDown') setSlash({ ...slash, active: (slash.active + 1) % n })
              else if (e.key === 'ArrowUp') setSlash({ ...slash, active: (slash.active - 1 + n) % n })
              else if (e.key === 'Enter' || e.key === 'Tab') chooseSlash(slashNames[Math.min(slash.active, n - 1)])
              else if (e.key === 'Escape') {
                dismissed.current = `${slash.block}:/${slash.query}`
                setSlash(null)
              } else return
              e.preventDefault()
              e.stopPropagation()
            }
          : undefined
      }
      onDragOver={
        drop?.active
          ? (e) => {
              e.preventDefault()
              const at = gapAt(e.clientX, e.clientY)
              if (at) setOver(at)
            }
          : undefined
      }
      onDragLeave={drop?.active ? () => setOver(null) : undefined}
      onDrop={
        drop?.active
          ? (e) => {
              e.preventDefault()
              const at = gapAt(e.clientX, e.clientY) ?? over
              setOver(null)
              if (at) drop.onDrop(at.lines)
            }
          : undefined
      }
    >
      {over && drop?.active && (
        <div
          className="awc-dropline"
          style={{ position: 'absolute', left: 122, right: 0, top: over.top - 1, margin: 0 }}
        />
      )}
      <div className="awc-gutter" style={{ top: line.top }}>
        <InsertPlus
          open={menuOpen}
          onToggle={onToggleMenu}
          onInsert={(t) =>
            insert(linesThrough(text, line.block, line.line), t, liveMarkdown(inputEl()) ?? text)
          }
        />
      </div>
      {slash && slashNames.length > 0 && (
        <BlockMenu
          mode="things"
          filter={slash.query}
          active={Math.min(slash.active, slashNames.length - 1)}
          anchor={() => {
            const el = inputEl()?.children[slash.block] as HTMLElement | undefined
            return el?.getBoundingClientRect() ?? null
          }}
          onInsert={chooseSlash}
          onClose={() => {
            dismissed.current = `${slash.block}:/${slash.query}`
            setSlash(null)
          }}
        />
      )}
      <LiveText
        text={text}
        onCommit={onCommit}
        onBackspaceAtStart={onBackspaceAtStart}
        onDeleteAtEnd={onDeleteAtEnd}
      />
    </div>
  )
}

/** Ký tự nằm dưới một điểm trên màn hình — hai trình duyệt, hai tên hàm. */
function caretAtPoint(x: number, y: number): { node: Node; offset: number } | null {
  type WithCaret = Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const doc = document as WithCaret
  const spot = doc.caretPositionFromPoint?.(x, y)
  if (spot) return { node: spot.offsetNode, offset: spot.offset }
  const range = doc.caretRangeFromPoint?.(x, y)
  return range ? { node: range.startContainer, offset: range.startOffset } : null
}

/**
 * Thân bài bằng element, dùng chung cho mọi template có thân bài.
 *
 * Trước đây memo và bitesize mỗi bên giữ một bản y hệt của cùng chín mươi dòng
 * này. Sửa một chỗ trong mặt soạn thì phải nhớ sửa đủ hai nơi, và cái nào quên
 * thì template ấy âm thầm tụt lại — đúng câu hỏi chủ site đặt ra: *"nhiều cái
 * đã sửa rồi mà các template khác không ăn"*.
 *
 * Nên nó là một chỗ. Template nào có thân bài thì gọi hàm này và cắm hai thứ
 * nó trả về vào `PostRenderer`; không template nào giữ bản riêng nữa.
 *
 * `report` chưa dùng: thân bài của nó nằm trong lưới hai cột, có cột ghi chú
 * neo theo khối và có kéo–thả với vạch rơi. Đó là khác biệt thật, không phải
 * trùng lặp, nên gộp vào đây sẽ phải mang theo cả hai đường — để riêng thì
 * trung thực hơn.
 */
function useElementBody({
  elements,
  write,
  palette,
}: {
  elements: ReportBlock[]
  write: (next: ReportBlock[]) => void
  palette: Palette
}) {
  const [menuAt, setMenuAt] = useState<number | null>(null)
  /** Khối vừa được mở ra bằng bàn phím, và chỗ con trỏ cần rơi vào. */
  const [spot, setSpot] = useState<BlockFocus | null>(null)
  /** Khối đang mở menu `/`, và mấy chữ gõ sau dấu ấy. */
  const [slash, setSlash] = useState<{ at: number; query: string } | null>(null)
  const { runAt } = useFlow(elements)
  const drag = useRowDrag((from, to) => write(move(elements, from, to)))

  const insertPlus = (at: number, insertAtIndex: number) => (
    <InsertPlus
      open={menuAt === at}
      onToggle={() => setMenuAt(menuAt === at ? null : at)}
      onInsert={(t) => {
        write(insertAt(elements, insertAtIndex, blankReportBlock(t)))
        setMenuAt(null)
      }}
    />
  )

  const wrapElement = (_drawn: ReactNode, i: number): ReactNode => {
    const run = runAt(i)
    /*
     * Cả dải chữ vẽ một lần, ở element đầu dải. Những element sau
     * trong cùng dải không vẽ gì — chữ của chúng đã nằm trong ô ấy.
     */
    if (run?.kind === 'text') {
      if (i !== run.at[0]) return null
      return (
        <LiveRun
          key={i}
          text={run.text}
          menuOpen={menuAt === i}
          at={run.at[0]}
          onToggleMenu={() => setMenuAt(menuAt === i ? null : i)}
          onCommit={(md) => write(writeRun(elements, run.at, md))}
          /*
           * Chèn vào **dòng con trỏ đang ở**, không phải cuối dải.
           *
           * Đừng cộng `run.at[0] + line`: dòng trên mặt soạn không phải khối
           * trong kho — xem `mdBlocks.ts`. `insertThing` cắt thẳng markdown.
           */
          onInsertAt={(lines, t, md) => {
            const thing = blankReportBlock(t)
            const next = insertThing(elements, run.at, md, lines, thing)
            write(next)
            setMenuAt(null)
            return next.indexOf(thing)
          }}
          /*
           * Bảng, ảnh, biểu đồ không phải chữ nên chúng đứng ngoài ô soạn.
           * Không có hai móc này thì xoá ngược tới chúng là cụt đường, và
           * cách duy nhất còn lại là với tay ra chuột.
           */
          drop={{
            active: drag.from !== null,
            onDrop: (lines) => {
              if (drag.from !== null) write(moveIntoRun(elements, drag.from, run.at, run.text, lines, insertThing))
              drag.end()
            },
          }}
          onBackspaceAtStart={() => {
            const before = run.at[0] - 1
            if (before < 0) return false
            write(removeAt(elements, before))
            return true
          }}
          onDeleteAtEnd={() => {
            const after = run.at[1] + 1
            if (after >= elements.length) return false
            write(removeAt(elements, after))
            return true
          }}
        />
      )
    }
    return (
      <div key={i}>
        <RowShell
          noun="khối"
          index={i}
          drag={drag}
          onMove={(dir) => write(move(elements, i, i + dir))}
          onRemove={() => write(removeAt(elements, i))}
          onDuplicate={() => write(duplicateAt(elements, i))}
          plus={insertPlus(i, i + 1)}
          onAddLine={() => write(insertAt(elements, i + 1, blankReportBlock('paragraph')))}
        >
          <ReportBlockFields
            block={elements[i]}
            palette={palette}
            focus={spot?.at === i}
            focusCaret={spot?.caret}
            onFocused={() => setSpot(null)}
            onChange={(next) => write(elements.map((x, k) => (k === i ? next : x)))}
            // Mũi tên ở mép ô do vỏ khối lo (`thingKeyDown`), đi xuyên cả dải chữ.
            onSlash={(query) => setSlash(query === null ? null : { at: i, query })}
            onTextKey={(e, current) => {
              // Chỉ dấu cách đổi loại khối; Enter, Backspace, mũi tên do `FlowThing` lo.
              const field = e.target as HTMLTextAreaElement
              const caret = field.selectionStart ?? 0
              if (e.key !== ' ' || field.selectionEnd !== caret) return
              const out = spaceBlock(elements, i, current, caret)
              if (!out) return
              e.preventDefault()
              write(out.blocks)
              setSpot(out.focus ?? null)
            }}
            onPasteBlocks={(text) => {
              const next = withPastedBlocks(elements, i, text)
              if (!next) return false
              write(next)
              return true
            }}
          />
        </RowShell>
        {slash?.at === i && (
          <BlockMenu
            filter={slash.query}
            onClose={() => setSlash(null)}
            onInsert={(type) => {
              write(
                elements.map((b, k) =>
                  k === i ? ({ ...blankReportBlock(type), id: b.id } as ReportBlock) : b,
                ),
              )
              setSlash(null)
              setSpot({ at: i, caret: 0 })
            }}
          />
        )}
      </div>
    )
  }

  /**
   * Bài rỗng vẫn phải có một **chỗ gõ**, không chỉ một chỗ bấm.
   *
   * Trước 2026-09-21 chỗ này chỉ vẽ cái máng `+`, nên một bài longform hay
   * bitesize chưa có gì trong thân thì không có mặt soạn nào trên màn: bấm
   * vào giữa trang không ra con trỏ, và thứ duy nhất gõ được là dòng tiêu đề.
   * Chủ site: *"longform với bitesize không gõ được mà cứ ở headlines mãi,
   * click vào không ra con trỏ"*.
   *
   * `toRuns([])` vốn đã hứa một dải rỗng để gõ vào; thiếu sót nằm ở đây, chỗ
   * vẽ — `wrapElement` chạy theo từng element, nên mảng rỗng thì nó không
   * chạy lần nào. Nay dải ấy được vẽ ra, và `LiveRun` mang sẵn cái máng `+`.
   */
  const renderAfterElements = (): ReactNode =>
    elements.length === 0 ? (
      <LiveRun
        text=""
        at={0}
        menuOpen={menuAt === -1}
        onToggleMenu={() => setMenuAt(menuAt === -1 ? null : -1)}
        onCommit={(md) => write(writeRun(elements, [0, -1], md))}
        onInsertAt={(lines, t, md) => {
          const thing = blankReportBlock(t)
          const next = insertThing(elements, [0, -1], md, lines, thing)
          write(next)
          setMenuAt(null)
          return next.indexOf(thing)
        }}
      />
    ) : null

  return { wrapElement, renderAfterElements }
}

/**
 * Thân element của **một** thẻ cards.
 *
 * Là một component chứ không phải một lời gọi `useElementBody` trong vòng lặp:
 * mỗi thẻ cần ô nhớ riêng — menu nào đang mở, con trỏ sắp rơi vào khối nào —
 * và React đối chiếu hook theo thứ tự gọi, nên gọi chúng trong một vòng lặp có
 * số lượng đổi là lệch ô ngay khi thêm hoặc bớt một thẻ.
 */
function CardBody({
  elements,
  write,
  palette,
}: {
  elements: ReportBlock[]
  write: (next: ReportBlock[]) => void
  palette: Palette
}) {
  const { wrapElement, renderAfterElements } = useElementBody({ elements, write, palette })
  return (
    // Mỗi thẻ đếm chỉ số khối của riêng nó, nên bàn phím đi lại trong một thẻ.
    <div data-flow-root>
      <ElementList elements={elements} palette={palette} wrap={wrapElement} />
      {renderAfterElements()}
    </div>
  )
}

function BitesizeEditor({
  post,
  module,
  onChange,
  onHeroDrop,
  hero,
}: {
  post: PostDetail
  module?: Module
  onChange: (patch: EditPatch) => void
  onHeroDrop?: (file: File, ratio?: number | null) => void
  hero?: HeroActions
}) {
  const body = (post.body ?? {}) as BitesizeBody
  const write = (patch: Partial<BitesizeBody>) =>
    onChange({ body: { ...(post.body as object), ...patch } })

  /*
   * Khối nội dung, cùng kho element với các template khác.
   *
   * Chủ site: "trong template này thì người dùng cũng được thêm thắt tất cả
   * các element kiểu heading.. giống các template khác đấy nhé". Nên phần
   * kéo–thả–chèn–xoá ở đây là ĐÚNG bộ máy memo dùng, không phải một bản riêng:
   * `RowShell` cho tay nắm, `InsertPlus` cho menu chèn, `blankReportBlock` cho
   * khối trắng. Một cái heading ở đây và một cái heading ở memo là cùng một
   * thứ.
   */
  const elements = (body.elements ?? []) as ReportBlock[]
  const palette = paletteFrom(post.theme_color ?? module?.accent ?? REPORT_BLUE)
  const writeElements = (next: ReportBlock[]) => write({ elements: next })
  const { wrapElement, renderAfterElements } = useElementBody({
    elements,
    write: writeElements,
    palette,
  })
  const control: CSSProperties = {
    fontFamily: sans,
    fontSize: 12.5,
    padding: '6px 9px',
    border: `1px solid ${paper.rule}`,
    background: paper.white,
    color: ink.base,
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${paper.rule}` }}>
        <select
          aria-label="Độ dài"
          value={body.len ?? 'ngắn'}
          onChange={(e) => write({ len: e.target.value as BitesizeLength })}
          style={control}
        >
          {(['ngắn', 'vừa', 'dài'] as BitesizeLength[]).map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Khung ảnh"
          value={body.portrait ? 'dọc' : 'ngang'}
          onChange={(e) => write({ portrait: e.target.value === 'dọc' })}
          style={control}
        >
          <option value="ngang">ngang</option>
          <option value="dọc">dọc</option>
        </select>
      </div>
      <PostRenderer
        template="bitesize"
        /*
         * Ô phương tiện vẽ ảnh bìa thật, không vẽ bản đã bỏ ảnh. Nó có nút tải
         * lên ngay ở góc (chủ site: *"có khung ảnh nhưng không có nút tải lên
         * và gắn link"*), và một ô vừa tải ảnh vào mà vẫn trơn màu thì trông
         * như tải hỏng.
         */
        post={toBitesizeData(post, { mod: module })}
        renderTitle={(title) => (
          <InlineField value={title} placeholder="Tiêu đề" onCommit={(v) => onChange({ en: v })} />
        )}
        renderText={(text) => (
          <InlineField value={text} placeholder="Thân bài" onCommit={(v) => write({ text: v })} />
        )}
        renderMediaHint={(hint) => (
          <InlineField value={hint} placeholder="Chữ trong ô ảnh" onCommit={(v) => write({ mediaHint: v })} />
        )}
        renderSub={(sub) => (
          <InlineField value={sub} placeholder="Chữ trong ô ảnh phụ" onCommit={(v) => write({ sub: v })} />
        )}
        /*
         * Chỉ ô ảnh phụ có nút. Ô phương tiện là ảnh bìa, mà ảnh bìa nay đặt ở
         * băng "trang bìa" trên đầu khung sửa — một chỗ đặt cho cả sáu khuôn.
         */
        renderPlateAction={(slot) => {
          if (slot.key === 'sub')
            return (
              <PlateImageUpload
                imageUrl={slot.imageUrl}
                name="Ảnh body 1 · ô dọc cạnh dòng chữ"
                onUrl={(url) => write({ subImage: url })}
                onClear={() => write({ subImage: null })}
              />
            )
          if (slot.key !== 'hero' || !onHeroDrop) return null
          /*
           * Ô phương tiện là ảnh bìa, nên nút của nó đi đúng đường của băng
           * trang bìa (`setHero`): đo khung hình để đổi dàn trang, lấy poster
           * nếu là clip. Hai chỗ đặt, một đường ghi.
           */
          const clip = Boolean(post.hero_image_url && looksLikeVideo(post.hero_image_url))
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <PlateUpload
                imageUrl={post.hero_image_url}
                accept="image/*,video/*"
                onPick={(file, ratio) => onHeroDrop(file, ratio)}
                onLink={hero?.link}
                onReframe={hero?.reframe}
                onClear={hero?.clear}
              />
              {/*
                Ảnh thumbnail của clip: khung hình đắp lên lúc clip chưa chạy,
                và là tấm đại diện trong danh sách. Tự lấy ở giây thứ nhất khi
                đính clip, nhưng từ khi thanh đặt ảnh cũ bỏ đi thì không còn chỗ
                nào đổi tay được nữa.
              */}
              {clip && (
                <PlateImageUpload
                  imageUrl={body.poster ?? null}
                  name="Ảnh thumbnail của clip"
                  label="tải ảnh thumbnail"
                  onUrl={(url) => write({ poster: url })}
                  onClear={() => write({ poster: null })}
                />
              )}
            </div>
          )
        }}
        wrapElement={wrapElement}
        renderAfterElements={renderAfterElements}
      />
    </div>
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
  const palette = paletteFrom(post.theme_color ?? module?.accent ?? REPORT_BLUE, post.theme_color ? undefined : module?.on_color)
  // Ô features có nút tải lên nên phải thấy được ảnh vừa tải — cùng lý do
  // Article và Bitesize đã thôi giấu ảnh bìa trong khung sửa.
  const data = toMemoData(post, module)
  const elements = flatElements(post.body as { sections?: never[]; elements?: unknown[] }) as ReportBlock[]

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
  const { wrapElement, renderAfterElements } = useElementBody({ elements, write, palette })

  return (
    <PostRenderer
      template="memo"
      post={data}
      /*
       * Ô ảnh features của memo là ảnh bìa, nhưng trước đây nó không có nút
       * nào: chỉ đổi được qua băng trang bìa ở trên đầu, và chưa có bìa thì ô
       * chỉ là một mảng xám. Nay cùng bốn nút ở góc như mọi ô ảnh khác.
       */
      renderPlateAction={() => (
        <PlateImageUpload
          imageUrl={post.hero_image_url}
          name="Ảnh features"
          onUrl={(url) => onChange({ hero_image_url: url })}
          onClear={() => onChange({ hero_image_url: '' })}
        />
      )}
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
      wrapElement={wrapElement}
      renderAfterElements={renderAfterElements}
    />
  )
}

/**
 * The stored cards, in the shape the editing fields assume.
 *
 * The public page tolerates a card with no title or with its groups written as
 * one string, so a deck written outside this screen can be live and still
 * crash the editor on its first render — a blank screen with the post plainly
 * published. Filling the gaps here costs nothing until something is edited,
 * and then the card is written back whole.
 */
function editableCards(body: unknown): CardData[] {
  const text = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
  return (Array.isArray(body) ? body : [])
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
    .map((c) => {
      const groups = Array.isArray(c.groups) ? c.groups.filter((g) => typeof g === 'string') : text(c.groups) ? [text(c.groups)] : []
      return {
        ...(c as CardData),
        groups,
        title: text(c.title),
        sub: text(c.sub),
        tag: text(c.tag),
        parts: Array.isArray(c.parts) ? (c.parts as CardPart[]) : [],
      }
    })
}

function CardsEditor({ post, module, onChange }: { post: PostDetail; module?: Module; onChange: (patch: EditPatch) => void }) {
  const cards = editableCards(post.body)
  const data = toCardsData({ ...post, body: cards as never }, module)
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
        template="cards"
        post={data}
        renderCardTitle={(title, i) => <EditableField value={title} onCommit={(v) => updateCard(i, { title: v })} />}
        renderCardSub={(sub, i) => <EditableField value={sub} onCommit={(v) => updateCard(i, { sub: v })} />}
        renderCardTag={(tag, i) => <EditableField value={tag} onCommit={(v) => updateCard(i, { tag: v })} />}
        /*
         * Thân thẻ nay có cả khối từ kho element, sau ba khối riêng của cards.
         * Chủ site, 17/09: *"sao không design nó thành OOP system plugin hay gì
         * để sau các template cứ đăng ký các module thôi"* — đây là cards nối
         * vào đúng cái kho ấy, và nó dùng chung `useElementBody` với memo và
         * bitesize, nên sửa mặt soạn một lần là cả ba cùng ăn.
         */
        renderCardBody={(card, i) => (
          <CardBody
            elements={(card.elements ?? []) as ReportBlock[]}
            write={(next) => updateCard(i, { elements: next })}
            palette={paletteFrom(card.hue)}
          />
        )}
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
  const [spot, setSpot] = useState<BlockFocus | null>(null)
  /** Khối đang mở menu `/`, và mấy chữ gõ sau dấu ấy. */
  const [slash, setSlash] = useState<{ at: number; query: string } | null>(null)
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
  /*
   * Thân bài bày ra thành các dải, không thành từng khối.
   *
   * Mọi khối chữ liền nhau dùng chung một ô nhập, nên bôi đen chạy suốt qua
   * chúng. Bảng, số liệu, biểu đồ, ảnh vẫn là widget riêng, cắm vào giữa dải
   * đúng chỗ nó đứng.
   */
  const runs = toRuns(blocks)
  const firstAnnotated = runs.findIndex((run) =>
    (run.kind === 'text' ? blocks.slice(run.at[0], run.at[1] + 1) : [blocks[run.at]]).some(
      (b) => notesOn(notes, b?.id).length > 0,
    ),
  )

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

  /** Một trang dán vào canvas thành một chuỗi khối — luật đặt chỗ ở `withPastedBlocks`. */
  function pasteBlocks(i: number, text: string): boolean {
    const next = withPastedBlocks(blocks, i, text)
    if (!next) return false
    setBlocks(next)
    return true
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
    setSpot(thenFocus === null ? null : { at: thenFocus, caret: Number.MAX_SAFE_INTEGER })
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
        {blocks.length === 0 && (
          <div className="awc-rep-block">
            <div className="awc-gutter" style={{ opacity: 1 }}>
              <InsertPlus
                open={menuAt === -1}
                onToggle={() => setMenuAt(menuAt === -1 ? null : -1)}
                onInsert={(t) => insertBlock(-1, t)}
              />
            </div>
          </div>
        )}

        <div className="awc-rep-grid" style={{ gridTemplateColumns: `minmax(0,1fr) 11px ${asideWidth}px` }}>
          <ColumnSplit width={asideWidth} onWidth={setAsideWidth} rows={runs.length} />

          {runs.map((run, ri) => {
            /*
             * Ghi chú của cả dải, không của từng khối.
             *
             * Một dải chữ nay là một đơn vị soạn, nên ghi chú của mọi khối
             * trong nó xếp cạnh nó. Neo vẫn là `id` khối như cũ — chỉ chỗ bày
             * ra là đổi.
             */
            const inRun = run.kind === 'text' ? blocks.slice(run.at[0], run.at[1] + 1) : [blocks[run.at]]
            const annotated = inRun.filter((b) => notesOn(notes, b?.id).length > 0)
            return (
              <Fragment key={run.kind === 'text' ? `t${run.at[0]}` : `b${run.at}`}>
                <div style={{ gridColumn: 1, gridRow: ri + 1, minWidth: 0 }}>
                  {run.kind === 'text' ? (
                    /*
                     * Report là khuôn cuối còn dựng dải chữ bằng tay, và nó
                     * thiếu đúng ba thứ năm khuôn kia đã có: máng `+` bám con
                     * trỏ, chỗ thả khối, và hai móc xoá xuyên qua khối. Chủ
                     * site báo cái thứ ba: *"delete keyboard cứ tới các khối
                     * là dừng"* — đúng, ở report thì dừng thật.
                     */
                    <LiveRun
                      text={run.text}
                      at={Math.max(0, run.at[0])}
                      menuOpen={menuAt === run.at[0]}
                      onToggleMenu={() => setMenuAt(menuAt === run.at[0] ? null : run.at[0])}
                      onCommit={(md) => setBlocks(writeRun(blocks, run.at, md))}
                      onInsertAt={(lines, t, md) => {
                        const thing = { ...blankReportBlock(t), id: nextId('b', blocks.map((b) => b.id ?? '')) } as ReportBlock
                        const next = insertThing(blocks, run.at, md, lines, thing)
                        setBlocks(next)
                        setMenuAt(null)
                        return next.indexOf(thing)
                      }}
                      drop={{
                        active: dragFrom !== null,
                        onDrop: (lines) => {
                          if (dragFrom !== null)
                            setBlocks(moveIntoRun(blocks, dragFrom, run.at, run.text, lines, insertThing))
                          setDragFrom(null)
                          setDragOver(null)
                        },
                      }}
                      /*
                       * Xoá qua `requestRemove`, không xoá thẳng: khối bị nuốt
                       * có thể đang mang ghi chú cạnh bài, và nó phải hỏi chỗ
                       * để chữ ấy đi — y như bấm Delete trên tay nắm.
                       */
                      onBackspaceAtStart={() => {
                        const before = run.at[0] - 1
                        if (before < 0) return false
                        requestRemove(before)
                        return true
                      }}
                      onDeleteAtEnd={() => {
                        const after = run.at[1] + 1
                        if (after >= blocks.length) return false
                        requestRemove(after)
                        return true
                      }}
                    />
                  ) : (
                    <FlowThing
                      at={run.at}
                      onAddLine={() => setBlocks(insertAt(blocks, run.at + 1, blankReportBlock('paragraph')))}
                      onRemove={() => requestRemove(run.at)}
                      onDragOver={(e) => {
                        if (dragFrom === null) return
                        e.preventDefault()
                        setDragOver(run.at)
                      }}
                      onDrop={() => drop(run.at)}
                    >
                      {dragOver === run.at && dragFrom !== null && dragFrom !== run.at && (
                        <div className="awc-dropline" style={{ background: accent }} />
                      )}
                      <div className="awc-rep-block">
                        <div className="awc-gutter">
                          <InsertPlus
                            open={menuAt === run.at}
                            onToggle={() => setMenuAt(menuAt === run.at ? null : run.at)}
                            onInsert={(t) => insertBlock(run.at, t)}
                          />
                          <Grip
                            onLift={() => setDragFrom(run.at)}
                            onDone={() => {
                              setDragFrom(null)
                              setDragOver(null)
                            }}
                            onMove={(dir) => setBlocks(moveBlock(blocks, run.at, run.at + dir))}
                            at={run.at}
                            onRemove={() => requestRemove(run.at)}
                          />
                          <div className="awc-block-controls">
                            <button type="button" onClick={() => addFieldNote(run.block.id)} aria-label="thêm ghi chú cho khối này">
                              ✎
                            </button>
                            <button type="button" onClick={() => write(cloneBlock(content, run.at))} aria-label="nhân bản khối">
                              ⧉
                            </button>
                            <button type="button" onClick={() => requestRemove(run.at)} aria-label="xoá khối">
                              ×
                            </button>
                          </div>
                        </div>
                        <ReportBlockFields
                          block={run.block}
                          palette={palette}
                          focus={spot?.at === run.at}
                          focusCaret={spot?.caret}
                          onFocused={() => setSpot(null)}
                          onChange={(next) => updateBlock(run.at, next)}
                          onEmptied={() => requestRemove(run.at, mergeTarget(blocks, run.at))}
                          // Mũi tên, Enter, Backspace ở mép ô do vỏ khối lo — xem `FlowThing`.
                          onSlash={(query) => setSlash(query === null ? null : { at: run.at, query })}
                          onTextKey={(e, current) => {
                            const field = e.target as HTMLTextAreaElement
                            const caret = field.selectionStart ?? 0
                            if (e.key !== ' ' || field.selectionEnd !== caret) return
                            const out = spaceBlock(blocks, run.at, current, caret)
                            if (!out) return
                            e.preventDefault()
                            setBlocks(out.blocks)
                            setSpot(out.focus ?? null)
                          }}
                          onPasteBlocks={(text) => pasteBlocks(run.at, text)}
                        />
                        {slash?.at === run.at && (
                          <BlockMenu
                            filter={slash.query}
                            onClose={() => setSlash(null)}
                            onInsert={(type) => {
                              setBlocks(
                                blocks.map((b, k) =>
                                  k === run.at ? ({ ...blankReportBlock(type), id: b.id } as ReportBlock) : b,
                                ),
                              )
                              setSlash(null)
                              setSpot({ at: run.at, caret: 0 })
                            }}
                          />
                        )}
                        {asking === run.at && (
                          <KeepNotesDialog
                            count={notesOn(notes, run.block.id).length}
                            canUp={run.at > 0}
                            canDown={run.at < blocks.length - 1}
                            accent={accent}
                            onDo={(choice) => commitRemove(run.at, choice)}
                            onCancel={() => setAsking(null)}
                          />
                        )}
                      </div>
                    </FlowThing>
                  )}
                </div>

                <div style={{ gridColumn: 3, gridRow: ri + 1, minWidth: 0 }}>
                  {ri === 0 && (
                    <ExplorationsEditor
                      notes={notes}
                      accent={accent}
                      onChange={(explorations) => write({ blocks, notes: { ...notes, explorations } })}
                    />
                  )}
                  {annotated.map((b, k) => (
                    <FieldNotesEditor
                      key={b.id}
                      notes={notes}
                      blockId={b.id}
                      label={ri === firstAnnotated && k === 0 ? fieldNotesLabel('report') : null}
                      accent={accent}
                      onChange={(fieldNotes) => write({ blocks, notes: { ...notes, fieldNotes } })}
                    />
                  ))}
                </div>
              </Fragment>
            )
          })}
        </div>

        {blocks.length === 0 && (
          <div style={{ color: ink.muted, fontSize: 13, padding: '8px 0 20px' }}>Chưa có khối nào — bấm "+ thêm khối" để bắt đầu.</div>
        )}
      </div>
    </div>
  )
}

/**
 * Thân bài của memo và bitesize, bày ra thành dải như report.
 *
 * Hai template này vẽ element trên đúng bản vẽ của chúng qua `wrapElement`,
 * nên chỗ này không thay cả bản vẽ — nó chỉ **gom** những element chữ liền
 * nhau lại: cái đầu dải vẽ ra một ô nhập chung, những cái sau trong cùng dải
 * không vẽ gì nữa. Widget thì vẫn vẽ như template vốn vẽ.
 *
 * Nhờ vậy bôi đen chạy suốt qua chúng, mà bảng với ảnh vẫn nằm đúng chỗ
 * template đặt.
 */
function useFlow(elements: ReportBlock[]) {
  const runs = toRuns(elements)
  const runAt = (i: number) =>
    runs.find((r) => (r.kind === 'text' ? i >= r.at[0] && i <= r.at[1] : r.at === i))
  return { runs, runAt }
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

/**
 * Dấu `+` trong máng bên trái, và menu nổi lên khi bấm.
 *
 * Trước đây đây là một dải "+ THÊM KHỐI" nằm **trong dòng chảy**, một cái sau
 * mỗi khối — bài mười khối gánh ba trăm pixel toàn nút. Và menu mở ra cũng
 * vẽ trong dòng chảy, nên bấm vào là cả bài tụt xuống.
 *
 * Nay nút nằm ngoài cột chữ và chỉ hiện khi rê chuột lên khối; menu nổi lên
 * trên chữ chứ không đẩy chữ đi.
 */
function InsertPlus({
  open,
  onToggle,
  onInsert,
}: {
  open: boolean
  onToggle: () => void
  onInsert: (type: string) => void
}) {
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={button} type="button" onClick={onToggle} aria-expanded={open} aria-label="thêm khối">
        +
      </button>
      {open && (
        <BlockMenu
          mode="things"
          anchor={() => button.current?.getBoundingClientRect() ?? null}
          takeFocus
          onInsert={onInsert}
          onClose={(how) => {
            onToggle()
            // Đóng bằng Esc thì con trỏ về lại nút đã mở menu, không rơi ra ngoài trang.
            if (how === 'key') button.current?.focus()
          }}
        />
      )}
    </>
  )
}

/**
 * Menu chèn, nổi lên trên chữ và **đóng khi bấm ra ngoài**.
 *
 * Không có đường đóng ấy thì menu mở rồi nằm lì che mất chữ, và phải bấm lại
 * đúng cái nút vừa mở nó mới dứt — chủ site báo đúng chỗ này.
 *
 * **Vẽ ra ngoài khung sửa.** Khung sửa mang `overflow: hidden`, nên menu nằm
 * trong nó bị cắt ở mép dưới khi khối đứng gần cuối bài: chủ site chỉ thấy ba
 * mục đầu. Nay menu vẽ qua portal, định vị theo `anchor`, và lật lên trên khi
 * phía dưới không đủ chỗ.
 *
 * **Bàn phím.** `takeFocus` (mở bằng nút `+`): mục đầu nhận focus, mũi tên đi
 * lại, Enter chọn, Esc đóng. Mở bằng `/` trong dải chữ thì con trỏ phải ở lại
 * chỗ đang gõ — dải chữ tự lái mục đang chọn qua `active`.
 */
function BlockMenu({
  filter,
  mode,
  onInsert,
  onClose,
  anchor,
  active,
  takeFocus = false,
}: {
  filter?: string
  mode?: 'all' | 'things'
  onInsert: (type: string) => void
  /** `key` là đóng bằng bàn phím — chỗ gọi trả focus về nơi đã mở menu. */
  onClose: (how?: 'key') => void
  /** Hình chữ nhật để bám vào; vắng thì bám vào chỗ menu được đặt trong cây. */
  anchor?: () => DOMRect | null
  /** Mục đang sáng khi bàn phím nằm ở chỗ khác (dải chữ). */
  active?: number
  takeFocus?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const spot = useRef<HTMLSpanElement>(null)
  const [place, setPlace] = useState<CSSProperties>({ opacity: 0, left: 0, top: 0 })
  const shut = useRef(onClose)
  shut.current = onClose

  useEffect(() => {
    const away = (e: MouseEvent) => {
      const el = box.current
      // Bấm vào chính cái nút đã mở nó thì để nút tự đóng, đừng đóng hai lần.
      if (el && !el.contains(e.target as Node) && !(e.target as Element)?.closest?.('.awc-gutter')) shut.current()
    }
    // Esc đóng menu kể cả khi focus còn ở ô đang gõ (menu mở bằng `/`).
    const esc = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && shut.current('key')
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [])

  useLayoutEffect(() => {
    const measure = () => {
      const r = anchor?.() ?? spot.current?.getBoundingClientRect() ?? null
      const el = box.current
      if (!r || !el) return
      const gap = 6
      const want = Math.min(el.scrollHeight, 340)
      const below = window.innerHeight - r.bottom - gap * 2
      const above = r.top - gap * 2
      const left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8))
      // Dưới đủ chỗ thì mở xuống; không thì mở về phía rộng hơn.
      if (below >= want || below >= above) {
        setPlace({ left, top: r.bottom + gap, maxHeight: Math.max(120, below) })
      } else {
        setPlace({ left, bottom: window.innerHeight - r.top + gap, maxHeight: Math.max(120, above) })
      }
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
    // `anchor` là hàm mới mỗi lượt vẽ; đo lại khi bộ lọc đổi là đủ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    if (takeFocus) box.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [takeFocus])

  useEffect(() => {
    if (active === undefined) return
    box.current?.querySelectorAll('button')[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(box.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const go = (k: number) => items[(k + items.length) % items.length]?.focus()
    if (e.key === 'ArrowDown') go(at + 1)
    else if (e.key === 'ArrowUp') go(at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else if (e.key === 'Escape' || e.key === 'Tab') shut.current('key')
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <>
      <span ref={spot} aria-hidden style={{ display: 'block', height: 0 }} />
      {createPortal(
        <div className="awc-menu-pop" ref={box} style={place} onKeyDown={keys}>
          <InsertMenu filter={filter} mode={mode} onInsert={onInsert} active={active} />
        </div>,
        document.body,
      )}
    </>
  )
}

/**
 * Danh sách loại khối, đọc thẳng từ kho.
 *
 * Trước đây nó là một danh sách viết tay ngay tại đây — và đó là cách `list`
 * có mặt trong kho mà thiếu ngoài menu, và cách một khối giữ cái tên code gọi
 * nó ("Meta") thay vì tên đặt cho người đọc.
 *
 * `filter` là mấy chữ gõ sau dấu `/`. Rỗng thì bày hết, xếp theo nhóm kho đã
 * xếp; có chữ thì lọc phẳng, vì lúc đang gõ để tìm thì cái nhóm không giúp gì.
 */
/**
 * Mục "Danh sách đánh số", ghép vào ngay sau "Danh sách".
 *
 * Nó không phải một element thứ hai trong kho — chỉ là cùng element ấy với
 * `ordered: true`. Nhưng trong menu thì nó **phải** là một mục riêng: người
 * viết chọn loại danh sách lúc tạo, không đi tìm một ô tick sau đó.
 */

/**
 * Loại nào **gõ ra được** thì không nằm trong menu của dấu `+`.
 *
 * Chèn một tiêu đề rỗng vào giữa bài thì vẽ ra không có gì — chủ site bấm `+`
 * rồi bảo "chả ra cái gì", và đúng là chả ra gì thật. Tiêu đề, danh sách,
 * trích dẫn là chữ: gõ `# `, `- `, `> ` là có. Dấu `+` để dành cho những thứ
 * không gõ ra được.
 */
const TYPED = new Set(['paragraph', 'heading', 'list', 'quote'])

const ORDERED_ENTRY = {
  name: ORDERED_LIST,
  title: 'Danh sách đánh số',
  description: 'Một chuỗi mục, đánh số 01, 02…',
  keywords: ['đánh số', 'số thứ tự', 'numbered', 'ordered', 'các bước'],
}

function entriesFor(filter: string, mode: 'all' | 'things') {
  // Bỏ dấu và dấu cách cả hai phía: `/khoinhan` hay `/khối nhấn` đều ra Khối
  // nhấn — lúc gõ lệnh thì không ai bật bộ gõ tiếng Việt chỉ để tìm một cái tên.
  const fold = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '')
  const q = fold(filter.trim())
  const hit = (e: { title: string; name: string; keywords: string[] }) =>
    (mode === 'all' || !(TYPED.has(e.name) || e.name === ORDERED_LIST)) &&
    // Đoạn văn không bao giờ có mặt: nó là thứ mặc định của chữ, chọn nó ra
    // một khối rỗng chẳng nói lên điều gì.
    e.name !== 'paragraph' &&
    (q === '' ||
    fold(e.title).includes(q) ||
    e.name.includes(q) ||
    e.keywords.some((k) => fold(k).includes(q)))

  return (['text', 'data', 'media'] as const).map((category) => ({
    category,
    items: allElements()
      .filter((e) => e.category === category)
      .flatMap((e) => (e.name === 'list' ? [e, ORDERED_ENTRY as unknown as typeof e] : [e]))
      .filter(hit),
  }))
}

/** Các mục của menu, phẳng, đúng thứ tự vẽ — để bàn phím đếm được mục thứ mấy. */
export function menuNames(filter: string, mode: 'all' | 'things'): string[] {
  return entriesFor(filter, mode).flatMap((g) => g.items.map((e) => e.name))
}

function InsertMenu({
  filter = '',
  mode = 'all',
  onInsert,
  active,
}: {
  filter?: string
  /** `things` bỏ hết loại gõ ra được — đó là menu của dấu `+`. */
  mode?: 'all' | 'things'
  onInsert: (type: string) => void
  active?: number
}) {
  const groups = entriesFor(filter, mode)
  let n = -1
  const empty = groups.every((g) => g.items.length === 0)
  return (
    <div className="awc-insert-menu">
      {empty ? (
        <div className="awc-insert-cat">Không có khối nào tên như vậy</div>
      ) : (
        groups.map(({ category, items }) =>
          items.length === 0 ? null : (
            <div key={category} className="awc-insert-group">
              <div className="awc-insert-cat">{CATEGORY_LABEL[category]}</div>
              {items.map((e) => {
                n += 1
                return (
                <button
                  key={e.name}
                  type="button"
                  className={n === active ? 'on' : undefined}
                  title={e.description}
                  // Chuột không lấy focus khỏi chỗ đang gõ khi menu mở bằng `/`.
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => onInsert(e.name)}
                >
                  <span className="awc-insert-glyph" aria-hidden>
                    <BlockIcon name={e.name} />
                  </span>
                  {e.title}
                </button>
                )
              })}
            </div>
          ),
        )
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
  onPasteBlocks,
  focusCaret,
  onTextKey,
  onSlash,
}: {
  block: ReportBlock
  palette: Palette
  focus?: boolean
  onFocused?: () => void
  onChange: (next: ReportBlock) => void
  onEmptied?: () => void
  /**
   * Cái dán vào có nhiều hơn một khối thì canvas nhận, không phải ô chữ này.
   * Trả `true` nghĩa là đã nhận.
   *
   * **Bắt buộc, có chủ ý.** Ba màn dùng chung component này và lượt đầu chỉ
   * report được nối, nên dán vào bitesize ra nguyên một trang markdown thô.
   * Để prop này tuỳ chọn là để nguyên cái bẫy ấy cho màn thứ tư.
   */
  onPasteBlocks: (text: string) => boolean
  /** Chỗ đặt con trỏ trong ô chữ của khối; vắng nghĩa là cuối chữ. */
  focusCaret?: number
  /**
   * Một phím trong ô chữ của khối — dấu cách sau `#`, `-`, `>` đổi loại khối.
   *
   * Bắt buộc, cùng lý do với `onPasteBlocks`: ba màn dùng chung component
   * này, và một prop tuỳ chọn là cái bẫy để dành cho màn thứ tư.
   */
  onTextKey: (e: KeyboardEvent<HTMLElement>, current: string) => void
  /**
   * Người viết gõ `/` ở đầu một khối rỗng — mở menu chèn ngay tại chỗ.
   *
   * `null` là đóng lại. Chuỗi là mấy chữ gõ sau dấu `/`, để lọc.
   */
  onSlash: (query: string | null) => void
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

  /*
   * Hai khối long-form đã vào kho, nên menu `+` của mọi khuôn chèn được chúng,
   * nhưng `ReportBlock` không kể tên chúng và `switch` dưới kia rơi qua không
   * trả gì. Chèn một khung ghi chú là có một khung trống trên trang mà màn sửa
   * không có chỗ nào gõ vào — bài AI Twin mang ba cái như thế ở cuối.
   */
  const stored = block as unknown as { type: string; text?: string; items?: unknown[] }
  if (stored.type === 'formula') {
    return (
      <div style={{ background: '#FFFFFF', borderLeft: `2px solid ${palette.ink}`, padding: '12px 16px' }}>
        <EditableField
          value={stored.text ?? ''}
          placeholder="công thức"
          onCommit={(v) => onChange({ ...stored, text: v } as unknown as ReportBlock)}
          style={{ fontSize: 14, letterSpacing: '.02em', color: palette.ink }}
        />
      </div>
    )
  }
  if (stored.type === 'aside') {
    return (
      <AsideFields
        items={stored.items ?? []}
        onChange={(items) => onChange({ ...stored, items } as unknown as ReportBlock)}
        palette={palette}
      />
    )
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
          onPasteText={onPasteBlocks}
          onKeyDown={onTextKey}
          onType={(text) => onSlash(text.startsWith('/') ? text.slice(1) : null)}
          focusCaret={focusCaret}
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
            onPasteText={onPasteBlocks}
            onKeyDown={onTextKey}
            onType={(text) => onSlash(text.startsWith('/') ? text.slice(1) : null)}
            focusCaret={focusCaret}
            markdown
            accentInk={palette.ink}
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
              onPasteText={onPasteBlocks}
              onKeyDown={onTextKey}
              onType={(text) => onSlash(text.startsWith('/') ? text.slice(1) : null)}
              focusCaret={focusCaret}
              markdown
              accentInk={palette.ink}
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
      /*
       * Danh sách nay luôn nằm trong một dải chữ — `flows()` xếp nó vào đó —
       * nên nhánh này không còn đường tới. Giữ một ô soạn riêng cho nó là
       * giữ đúng cái tường ngăn khiến bôi đen không chạy qua được hai mục.
       */
      return null
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
            onPasteText={onPasteBlocks}
            onKeyDown={onTextKey}
            onType={(text) => onSlash(text.startsWith('/') ? text.slice(1) : null)}
            focusCaret={focusCaret}
            markdown
            accentInk={palette.ink}
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
          onPasteText={onPasteBlocks}
          onKeyDown={onTextKey}
          onType={(text) => onSlash(text.startsWith('/') ? text.slice(1) : null)}
          focusCaret={focusCaret}
          markdown
          accentInk={palette.ink}
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
          href={block.href}
          palette={palette}
          onChange={(patch) => onChange({ ...block, ...patch })}
          onRemoveImage={() => onChange({ type: 'paragraph', text: '' } as ReportBlock)}
        />
      )
  }
}

/**
 * Chữ trong một khung ghi chú, gõ liền một ô như mọi dải chữ khác.
 *
 * Mỗi đoạn (cách nhau một dòng trống) là một khối `paragraph` bên trong
 * khung. Khối con không phải chữ — hiếm, chỉ có ở bài dán từ nơi khác — giữ
 * nguyên sau phần chữ, không bị ô nhập này ghi đè.
 */
function AsideFields({
  items,
  palette,
  onChange,
}: {
  items: unknown[]
  palette: Palette
  onChange: (items: unknown[]) => void
}) {
  const isText = (x: unknown) => (x as { type?: unknown } | null)?.type === 'paragraph'
  const text = items
    .filter(isText)
    .map((x) => String((x as { text?: unknown }).text ?? ''))
    .filter((t) => t !== '')
    .join('\n')
  const rest = items.filter((x) => !isText(x))
  return (
    <div style={{ background: '#F3EEE1', padding: '18px 22px 14px' }}>
      <EditableField
        value={text}
        multiline
        rows={2}
        placeholder="ghi chú trong khung"
        markdown
        accentInk={palette.ink}
        onCommit={(v) => {
          /*
           * Mỗi dòng là một đoạn trong khung. Trước đây phải hai lần Enter mới
           * ra đoạn mới, mà hai lần Enter ở cuối nay là lệnh thoát khung
           * (`thingKeyDown`) — một Enter là một dòng, như ngoài dải chữ.
           */
          const paragraphs = v
            .split(/\n+/)
            .map((t) => t.trim())
            .filter((t) => t !== '')
            .map((t) => ({ type: 'paragraph', text: t }))
          // Khung không bao giờ rỗng hẳn: vẫn phải có một đoạn để gõ vào.
          onChange([...(paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph', text: '' }]), ...rest])
        }}
        style={{ fontSize: 14.5, lineHeight: 1.66, color: ink.strong }}
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
  href,
  palette,
  onChange,
  onRemoveImage,
}: {
  caption: string
  imageUrl?: string | null
  href?: string | null
  palette: Palette
  onChange: (patch: { caption?: string; imageUrl?: string | null; href?: string | null }) => void
  /**
   * Gỡ ảnh thì khối không còn là ảnh nữa. Chủ site: *"sau xoá layout thành cho
   * phép viết text trên nền trắng thông thường"* — một ô màu trống nằm lại giữa
   * bài là chỗ phải xoá thêm lần nữa, còn một đoạn chữ thì viết tiếp được ngay.
   */
  onRemoveImage?: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const crop = useCropping()

  /*
   * Khối ảnh trong thân bài không có hình dạng nào do khuôn quyết, nên nó mở
   * hộp cắt tay chứ không mở khung căn: trước đây ô thả ảnh cao cứng 160px và
   * khung căn khoá theo đúng dải ngang ấy — chủ site: *"logic đang cố định
   * khung ngang >> mở thành tuỳ biến, cho phép user tự crop"*.
   *
   * Lưu trước rồi mới cắt: bấm Huỷ thì ảnh vẫn ở lại, huỷ là huỷ việc cắt.
   */
  async function place(url: string) {
    onChange({ imageUrl: url })
    onChange({ imageUrl: await crop({ url, name: 'Khối ảnh trong thân bài' }) })
  }

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const { url } = await uploadImage(file)
      await place(url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div
        className="awc-image-drop"
        data-testid="image-block-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          // Không để thả lan lên khung sửa, nơi thả tệp nghĩa là đặt ảnh bìa.
          e.stopPropagation()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => {
          if (!imageUrl) inputRef.current?.click()
        }}
        style={{
          position: 'relative',
          // Cùng một phép vẽ với trang thật (`elements/media.tsx`): ảnh đã cắt
          // mang đúng hình đã cắt, ảnh cũ giữ dải 250px nó đã đăng.
          ...(cropStyle(imageUrl) ?? { height: imageUrl ? 250 : 160, ...fillStyle(imageUrl, palette.tint) }),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: imageUrl ? 'default' : 'pointer',
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
        {/*
          Cùng bốn nút ở góc như mọi ô ảnh của khuôn bài, để khối ảnh trong
          thân bài không phải một ngoại lệ phải học riêng. `stopPropagation`:
          bấm nút không được rơi xuống ô thả mà mở hộp chọn tệp lần hai.
        */}
        <div
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, lineHeight: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <PlateUpload
            imageUrl={imageUrl ?? null}
            onPick={(file) => handleFile(file)}
            onLink={(url) => place(url)}
            onReframe={() => (imageUrl ? place(imageUrl) : undefined)}
            onClear={onRemoveImage ?? (() => onChange({ imageUrl: null }))}
          />
        </div>
      </div>
      <EditableField value={caption} placeholder="chú thích ảnh" onCommit={(v) => onChange({ caption: v })} style={{ fontSize: 10, color: palette.ink, marginTop: 8 }} />
      {/*
        Link đích tách hẳn khỏi nút "đặt link" ở góc: nút ấy là địa chỉ của
        chính tấm ảnh, còn ô này là chỗ người đọc tới khi bấm vào ảnh. Chủ site
        chọn "ảnh bấm được" cho yêu cầu "lưu hyperlink".
      */}
      {imageUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: ink.faint }}>
          <IconLink size={12} />
          <EditableField
            value={href ?? ''}
            placeholder="link khi bấm vào ảnh (tuỳ chọn)"
            onCommit={(v) => onChange({ href: v.trim() === '' ? null : v.trim() })}
            style={{ fontSize: 10, color: href && !safeHref(href) ? '#B03A2E' : palette.ink, flex: 1 }}
          />
        </div>
      )}
    </div>
  )
}
