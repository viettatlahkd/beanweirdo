import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { resolveSite, SITE_DEFAULTS, type SiteCopy, type SiteOverrides } from '../content/site'
import {
  listModules,
  listPosts,
  updateModule,
  updateSite,
  uploadImage,
  type Module,
  type PostSummary,
} from '../admin/lib/apiClient'
import { getSite } from '../admin/lib/apiClient'
import { RoutesPanel } from '../admin/components/RoutesPanel'
import { PagesManager, type SystemPage } from '../admin/components/PagesManager'
import { ModuleImages } from '../admin/components/ModuleImages'
import { captionColumn, formShapeOf, imageColumn } from '../admin/moduleForm'
import { FocusPicker } from '../admin/components/FocusPicker'
import { coverStyle } from '../lib/imageFocus'
import { useSlotSwap, type SlotSwap } from '../admin/lib/useSlotSwap'
import { FeatureCellsEditor } from '../admin/components/FeatureCellsEditor'
import type { FeatureOverride } from '../content/notes'
import { ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { ContentWorkspace } from '../admin/components/ContentWorkspace'
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


/** The three tabs, named once so the site map and the tab bar cannot drift. */
const TABS = [
  { k: 'posts', t: 'Nội dung' },
  { k: 'pages', t: 'Quản lý trang' },
  { k: 'display', t: 'Cài đặt hiển thị' },
] as const

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
 * Four tabs, one per layer (step 3c): Quản lý bài — every post; Phân loại —
 * the topic tree, theme tags and dạng bài; Quản lý trang — where posts are
 * shown: the navigation, pages, their listing rules and their fixed copy;
 * Cài đặt hiển thị — addresses and the back office's own words.
 *
 * Everything saves on blur — there is no page-level save button (System
 * conventions, rule 08).
 */

export function Cms() {
  const nav = useNav()
  // Tab nằm trong địa chỉ, không nằm trong state: ba tab là ba chỗ khác nhau
  // để đứng, nên một đường link tới sơ đồ trang không được mở ra danh sách bài.
  const tab = nav.cmsTab
  const [site, setSite] = useState<SiteOverrides>({})
  const [modules, setModules] = useState<Module[]>([])
  // The site map names what Templates holds, so it has to know.
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, m, p] = await Promise.all([getSite(), listModules(), listPosts('all')])
      setSite(s)
      setModules(m)
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



  /**
   * The fixed copy of each page the site draws with a screen of its own. It
   * lives in the page it belongs to, in Quản lý trang (step 3c), rather than
   * in one long list of every page's words.
   */
  const pageCopy: Record<SystemPage, ReactNode> = {
    landing: <>
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
          {/*
            * Tag dùng chung cho cả ghi chép lẫn bài đăng — sửa ở đây, ăn cả hai
            * chỗ. Trước đây bốn dạng ghi viết cứng trong code, muốn đổi một chữ
            * là phải sửa code.
            */}
        </>,
    notes: <>
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
        </>,
    archive: <>
          <div style={{ ...sectionHead, margin: '34px 0 18px' }}>Trang Lưu trữ</div>
          <div style={grid(two)}>
            <Field label="Tiêu đề trang">
              <input {...field('archiveTitle')} style={serifInput} />
            </Field>
            <Field label="Dòng phụ — cạnh số bài">
              <input {...field('archiveNote')} style={boxed} />
            </Field>
          </div>
        </>,
    index: <>
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
        </>,
  }

  /** A module's own fields, for a page that still takes its looks from that module. */
  function moduleFields(m: Module) {
    // Which fields this module actually uses — see admin/moduleForm.ts.
    const shape = formShapeOf(m)
    return (
      <div>
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
      </div>
    )
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
              onClick={() => nav.goCms(x.k)}
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

      {tab === 'posts' && <ContentWorkspace onChanged={() => void load()} />}

      {tab === 'pages' && (
        <PagesManager
          renderCopy={(key) => pageCopy[key]}
          renderModule={(id) => {
            const m = modules.find((x) => x.id === id)
            return m ? moduleFields(m) : null
          }}
        />
      )}

      {tab === 'display' && (
        <div style={{ padding: '34px 56px 130px', maxWidth: 1080 }}>
          <div style={sectionHead}>Đường dẫn</div>
          <RoutesPanel
            stored={site.routes}
            modules={modules}
            onSave={(routes) => saveSite({ routes } as SiteOverrides)}
          />
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
