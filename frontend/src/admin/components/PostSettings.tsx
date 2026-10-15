import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AuthorRef, PostSite } from 'api-contract'
import { ancestorsOf, buildTree, flattenTree } from '../../lib/contentTree'
import { tagColor } from '../../lib/tagColor'
import { titleSlug } from '../../lib/postSlug'
import { proseOf } from '../../lib/postText'
import { createKeyword, listKeywords, type Keyword, type Module, type PostDetail, type PostTemplate, type PostVisibility, type Node } from '../lib/apiClient'
import { TEMPLATE_LABEL } from '../../content/templates'
import { ink, sans } from '../../design/tokens'
import { Button, IconButton } from '../../design/Button'
import { IconClose } from '../../design/icons'
import { AuthorPicker } from './AuthorPicker'
import { ThemePicker } from './ThemePicker'
import { Choice, DETAIL_CSS, desk, Switch } from './Detail'

/**
 * Everything about a post that is not its text, in one panel that slides in
 * from the right of the editor.
 *
 * These fields used to sit as a loose strip of eight controls over three lines
 * above the page, with the colour picker floating at the far right. The owner
 * found it scattered and picked, from three mocks, a Notion-style property
 * panel (2026-10-14): one button opens it, the page stays visible beside it,
 * so a change of colour or topic shows on the page at once.
 *
 * Name first, then address, then byline: the owner (2026-10-15) wants what a
 * post is called and where it lives settled before anything else, and found
 * no way at all to rename a post whose template draws no title field.
 *
 * Everything but the address and the authors goes through the editor's own
 * patch, so it saves and undoes like any other field. The address does not:
 * the server can refuse it (taken, or still forwarding to another post), and
 * that answer has to come back to this row. Authors write on their own, like
 * module and pin, without waiting for "Đăng thay đổi".
 */
export type SettingsPatch = Partial<{
  en: string
  topic_id: string | null
  visibility: PostVisibility
  shown_on: PostSite[]
  module_id: string
  keywords: string[]
  template: string
  theme_color: string | null
}>

/** Wide enough for a topic path and the colour row without wrapping either. */
export const SETTINGS_WIDTH = 380

/** The homes a post can be shown on, in the order the switches stand (0038). */
const SITES: { id: PostSite; label: string }[] = [
  { id: 'biz', label: 'biz' },
  { id: 'bean', label: 'bean' },
  { id: 'blog', label: 'personal blog' },
]

/**
 * Subjects in order, each followed by every topic under it at any depth — the
 * tree as one list. `path` names a topic by its whole branch below the subject
 * (`roasting › maillard`), since two topics in different branches may share a name.
 */
export function topicOptions(topics: readonly Node[]): { subject: Node; children: { topic: Node; path: string }[] }[] {
  const byOrder = [...topics].sort((a, b) => a.sort_order - b.sort_order)
  return buildTree(byOrder).map(({ row: subject, children }) => ({
    subject,
    children: flattenTree(children).map(({ row: topic }) => ({
      topic,
      path: [...ancestorsOf(byOrder, topic.id), topic].map((t) => t.title).join(' › '),
    })),
  }))
}

/** A topic named by its whole branch, the way the panel and the summary line both show it. */
export function topicPath(topics: readonly Node[], id: string | null | undefined): string | null {
  const t = id ? topics.find((n) => n.id === id) : undefined
  return t ? [...ancestorsOf(topics, t.id), t].map((n) => n.title).join(' › ') : null
}

/** One flat group under a rule: the owner wants one ground for the whole panel, no boxed cards on it (2026-10-14). */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} style={{ borderTop: `1px solid ${desk.line}`, paddingTop: 4 }}>
      <h3 style={{ margin: 0, padding: '10px 0 6px', fontSize: 12, fontWeight: 600, color: ink.soft }}>{title}</h3>
      {children}
    </section>
  )
}

/** A label above its control: the panel is too narrow for the two side by side once a field holds chips. */
function Prop({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="cfg-field" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: ink.strong }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
      {hint && <span style={{ fontSize: 12, color: ink.soft, lineHeight: 1.45 }}>{hint}</span>}
    </div>
  )
}

const chip = { display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 2px 1px 8px', borderRadius: 999, fontSize: 13, color: '#2A2016' } as const

export function PostSettings({
  open,
  onClose,
  post,
  byline,
  modules,
  topics,
  template,
  canChangeTemplate,
  derivedSlug,
  onPatch,
  onSlug,
  onSave,
  publishLabel,
  onPublish,
}: {
  open: boolean
  onClose: () => void
  post: PostDetail
  /** Who stood on the byline when the post was loaded; `AuthorPicker` keeps it from there. */
  byline: AuthorRef[]
  modules: Module[]
  topics: Node[]
  template: PostTemplate
  /** Only while nothing is written: the templates hold differently shaped bodies. */
  canChangeTemplate: boolean
  /** The address the post is reached at while nothing is stored. */
  derivedSlug: string
  onPatch: (patch: SettingsPatch) => void
  /** Null goes back to the title's address. Resolves to an error message, or null when it was taken. */
  onSlug: (slug: string | null) => Promise<string | null>
  /** Settles once every write the parent has started has landed; rejects when one failed. */
  onSave: () => Promise<void>
  /** The publish button's word, or null when nothing is waiting to go on the page. */
  publishLabel: string | null
  onPublish: () => Promise<void>
}) {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  // A post read before 0038 has no list: it is shown where every post was, on personal blog.
  const shownOn = post.shown_on ?? ['blog']
  const [slugError, setSlugError] = useState<string | null>(null)
  /*
   * Fields write as they are left, but the owner (2026-10-15) could not tell
   * whether a change had landed without reloading. The footer says so, and
   * "Lưu" is the moment to find out: it leaves the field being typed in (its
   * write starts), waits for every write, then reports.
   */
  const [note, setNote] = useState<'idle' | 'dirty' | 'saving' | 'publishing' | { saved: Date } | { error: string }>('idle')
  const slugWrites = useRef(new Set<Promise<unknown>>())
  const track = <T,>(p: Promise<T>) => {
    slugWrites.current.add(p)
    void p.finally(() => slugWrites.current.delete(p)).catch(() => {})
    return p
  }
  const panel = useRef<HTMLElement>(null)
  // Closed, the panel is only slid off screen: keep Tab and screen readers out of it.
  useEffect(() => {
    panel.current?.toggleAttribute('inert', !open)
  }, [open])

  useEffect(() => {
    void listKeywords().then(setKeywords)
  }, [])

  const wearing = post.keywords ?? []
  const kw = (id: string) => keywords.find((k) => k.id === id)
  const activeModule = modules.find((m) => m.id === post.module_id)

  async function addKeyword(text: string) {
    const v = text.trim().replace(/^#/, '')
    if (!v) return
    const known = keywords.find((k) => k.label.toLowerCase() === v.toLowerCase() || k.id === v)
    const made = known ?? (await createKeyword(v))
    if (!known) setKeywords((ks) => [...ks, made])
    if (!wearing.includes(made.id)) onPatch({ keywords: [...wearing, made.id] })
  }

  /*
   * With nothing typed, the address is the title's (`slugsFor`) and moves when
   * the title does. The book behind `derivedSlug` was read when the screen
   * opened, so a rename made here shows through the title itself.
   */
  const fromTitle = titleSlug(post.en)
  const address = post.slug ?? (fromTitle || derivedSlug)
  const firstHeading = proseOf(post.body).find((p) => p.h)?.text

  async function commitSlug(value: string) {
    // Typed the way a title is written, stored the way an address must be.
    const v = titleSlug(value)
    if (!v || v === address) return setSlugError(null)
    setSlugError(await track(onSlug(v)))
  }

  /** Leave the field in hand, so its write starts, then wait for every write. */
  async function settle() {
    if (panel.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
    await new Promise((r) => setTimeout(r))
    await Promise.all([...slugWrites.current])
    await onSave()
  }

  async function save() {
    setNote('saving')
    try {
      await settle()
      setNote({ saved: new Date() })
    } catch (e) {
      setNote({ error: (e as Error).message })
    }
  }

  async function publish() {
    setNote('publishing')
    try {
      await settle()
      await onPublish()
      setNote({ saved: new Date() })
    } catch (e) {
      setNote({ error: (e as Error).message })
    }
  }

  const live = post.status === 'published'
  const noteText =
    note === 'dirty'
      ? 'Có thay đổi, bấm Lưu.'
      : note === 'saving'
        ? 'Đang lưu…'
        : note === 'publishing'
          ? 'Đang đăng…'
          : note === 'idle'
            ? live
              ? 'Bài đã đăng: sửa gì cũng vào nháp tới khi bấm Đăng.'
              : 'Bài nháp.'
            : 'error' in note
              ? `Chưa lưu được: ${note.error}`
              : `Đã lưu lúc ${note.saved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${live && publishLabel ? ', chưa lên trang.' : '.'}`

  function commitTitle(value: string) {
    const t = value.trim()
    if (t && t !== post.en) onPatch({ en: t })
  }

  return (
    <aside
      aria-label="Thông tin bài"
      ref={panel}
      aria-hidden={!open}
      className="cfg-detail"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onInput={() => setNote('dirty')}
      onChange={() => setNote('dirty')}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: `min(${SETTINGS_WIDTH}px, 100vw)`,
        boxSizing: 'border-box',
        background: desk.panel,
        borderLeft: `1px solid ${desk.line}`,
        boxShadow: open ? '-8px 0 24px rgba(0,0,0,.06)' : 'none',
        transform: open ? 'none' : 'translateX(100%)',
        transition: 'transform .2s ease, box-shadow .2s ease',
        overflowY: 'auto',
        padding: '14px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: sans,
        color: ink.base,
        zIndex: 20,
      }}
    >
      {/* The editor is its own screen, outside the Cms desk that mounts these frames. */}
      <style>{DETAIL_CSS + '@media (prefers-reduced-motion: reduce) { aside[aria-label="Thông tin bài"] { transition: none !important; } }'}</style>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h2 style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 600 }}>Thông tin bài</h2>
        <IconButton label="Đóng thông tin bài" onClick={onClose}>
          <IconClose />
        </IconButton>
      </div>

      <Group title="Tên & người viết">
        <Prop
          label="Tên bài"
          hint={
            firstHeading && firstHeading !== post.en ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>Heading đầu bài: «{firstHeading}»</span>
                <Button size="sm" onClick={() => commitTitle(firstHeading)}>
                  Dùng làm tên
                </Button>
              </span>
            ) : post.status === 'published' ? (
              'Bài đã đăng: tên mới lên trang khi bấm Đăng thay đổi.'
            ) : undefined
          }
        >
          <input
            aria-label="Tên bài"
            key={post.en}
            defaultValue={post.en}
            onBlur={(e) => {
              commitTitle(e.target.value)
              // An empty name is refused; show the one that stands.
              if (!e.target.value.trim()) e.target.value = post.en
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                e.stopPropagation()
                e.currentTarget.value = post.en
              }
            }}
            style={{ width: '100%', fontSize: 15 }}
          />
        </Prop>
        <Prop
          label="Slug"
          hint={
            slugError ? (
              <span role="alert" style={{ color: ink.danger }}>
                {slugError}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{post.slug ? 'Đặt tay, không đổi theo tên. Enter để lưu, Esc để bỏ.' : 'Theo tên bài, không dấu, nối bằng "-"; đổi tên thì đổi theo. Gõ để đặt khác.'}</span>
                {post.slug && (
                  <Button size="sm" onClick={() => void track(onSlug(null)).then(setSlugError)}>
                    Theo tên bài
                  </Button>
                )}
              </span>
            )
          }
        >
          <input
            aria-label="Slug"
            key={address}
            defaultValue={post.slug ?? ''}
            placeholder={address}
            onBlur={(e) => void commitSlug(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                // The field's own undo, not the panel's close.
                e.stopPropagation()
                e.currentTarget.value = post.slug ?? ''
                setSlugError(null)
              }
            }}
            style={{ width: '100%' }}
          />
        </Prop>
        <Prop label="Tác giả" hint="Thứ tự ở đây là thứ tự trên dòng tác giả.">
          <AuthorPicker key={post.id} postId={post.id} initial={byline} />
        </Prop>
      </Group>

      <Group title="Vị trí">
        {/*
          * Named for what it still does. Where a post shows on the blog is the
          * topic's job now; the module only lends its colour, and the list of
          * an old page with no rule.
          */}
        <Prop label="Màu mượn từ" hint="Màu mặc định lấy từ module này. Bài hiện ở đâu là do Chủ đề.">
          <select aria-label="Module" value={post.module_id} onChange={(e) => onPatch({ module_id: e.target.value })} style={{ width: '100%' }}>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </Prop>
        <Prop label="Chủ đề" hint="Bài hiện ở mục này trong Mục lục.">
          <select aria-label="Chủ đề" value={post.topic_id ?? ''} onChange={(e) => onPatch({ topic_id: e.target.value || null })} style={{ width: '100%' }}>
            {!post.topic_id && <option value="">—</option>}
            {topicOptions(topics).map(({ subject, children }) => (
              <optgroup key={subject.id} label={subject.title}>
                <option value={subject.id}>{subject.title}</option>
                {children.map(({ topic: t, path }) => (
                  <option key={t.id} value={t.id}>
                    {path}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Prop>
        <Prop label="Tag" hint="Tag dùng chung cho mọi site. Gõ tên rồi Enter.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {wearing.map((id) => {
              const color = tagColor(id, kw(id)?.color)
              const label = kw(id)?.label ?? id
              return (
                <span key={id} style={{ ...chip, border: `1px solid ${color}`, background: `${color}2E` }}>
                  #{label}
                  <IconButton size="sm" label={`bỏ tag ${label}`} onClick={() => onPatch({ keywords: wearing.filter((k) => k !== id) })} style={{ width: 20, height: 20 }}>
                    <IconClose size={12} />
                  </IconButton>
                </span>
              )
            })}
            <input
              aria-label="Thêm tag"
              list="post-keywords"
              placeholder="#tên tag"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const el = e.currentTarget
                void addKeyword(el.value)
                el.value = ''
              }}
              style={{ width: 150 }}
            />
            <datalist id="post-keywords">
              {keywords
                .filter((k) => !wearing.includes(k.id))
                .map((k) => (
                  <option key={k.id} value={k.label} />
                ))}
            </datalist>
          </div>
        </Prop>
      </Group>

      <Group title="Hiển thị">
        {/* One store of posts for every site (owner, 2026-10-15): a switch only says which home shows it. */}
        <Prop label="Hiện ở trang chủ" hint={shownOn.length ? undefined : 'Bài không hiện ở trang chủ nào.'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SITES.map((s) => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                {s.label}
                <Switch
                  label={`Hiện ở ${s.label}`}
                  value={shownOn.includes(s.id)}
                  onChange={(on) => onPatch({ shown_on: SITES.map((x) => x.id).filter((id) => (id === s.id ? on : shownOn.includes(id))) })}
                />
              </label>
            ))}
          </div>
        </Prop>
        <Prop label="Template" hint={canChangeTemplate ? undefined : 'Bài đã có chữ nên không đổi được nữa.'}>
          {canChangeTemplate ? (
            <select aria-label="Template" value={template} onChange={(e) => onPatch({ template: e.target.value })} style={{ width: '100%' }}>
              {Object.entries(TEMPLATE_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 14 }}>{TEMPLATE_LABEL[template]}</span>
          )}
        </Prop>
        <Prop label="Màu bài">
          <ThemePicker
            value={post.theme_color}
            moduleColor={activeModule?.accent}
            moduleLabel={activeModule?.title}
            themes={modules.map((m) => ({ id: m.id, label: m.title, color: m.accent }))}
            onChange={(theme_color) => onPatch({ theme_color })}
          />
        </Prop>
        <Prop label="Quyền xem">
          <Choice
            label="Quyền xem"
            value={post.visibility}
            options={[
              { value: 'public', label: 'Công khai' },
              { value: 'private', label: 'Riêng tư' },
            ]}
            onChange={(visibility) => onPatch({ visibility })}
          />
        </Prop>
      </Group>
      <footer
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 'auto',
          marginInline: -16,
          padding: '10px 16px 14px',
          background: desk.panel,
          borderTop: `1px solid ${desk.line}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span role="status" style={{ fontSize: 12, color: typeof note === 'object' && 'error' in note ? ink.danger : ink.soft }}>
          {noteText}
        </span>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => void save()} disabled={note === 'saving' || note === 'publishing'}>
            Lưu
          </Button>
          {publishLabel && (
            <Button level="primary" onClick={() => void publish()} disabled={note === 'saving' || note === 'publishing'}>
              {publishLabel}
            </Button>
          )}
        </div>
      </footer>
    </aside>
  )
}
