import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Author, AuthorCreateRequest } from 'api-contract'
import { ApiError, createAuthor, deleteAuthor, updateAuthor, uploadImage } from '../lib/apiClient'
import { forgetAuthors, listAuthorsCached } from '../lib/lists'
import { Button, IconButton } from '../../design/Button'
import { IconClose, IconPlus, IconUpload } from '../../design/icons'
import { radius } from '../../design/controls'
import { ink, paper, sans, serif } from '../../design/tokens'
import { useToast } from '../../design/Toaster'
import { RowMenu } from './RowMenu'

/**
 * Tab Tác giả: ai được đứng tên bài trên trang.
 *
 * Chủ site (2026-09-30): "nhiều author khác nhau có thể lên đây viết bài và 1
 * bài có thể có nhiều co authored với nhau, nên sẽ cần 1 màn quản lý".
 *
 * Cùng khuôn với danh sách bài: mỗi người một thẻ, bấm cả thẻ là mở ra sửa,
 * việc hiếm nằm sau nút ba chấm. Tạo và sửa đều trong hộp thoại có nút Lưu —
 * đổi tên hay slug ở đây là đổi dòng tác giả trên mọi bài họ đã viết.
 */
export function AuthorsPanel() {
  const toast = useToast()
  const [authors, setAuthors] = useState<Author[] | null>(null)
  /** `'new'` là hộp thoại tạo; một `Author` là hộp thoại sửa người đó. */
  const [editing, setEditing] = useState<Author | 'new' | null>(null)

  const [loadError, setLoadError] = useState<string | null>(null)
  const load = () =>
    void listAuthorsCached()
      .then((list) => {
        setAuthors(list)
        setLoadError(null)
      })
      .catch((e) => {
        setAuthors([])
        setLoadError((e as Error).message)
      })
  useEffect(load, [])

  const reload = () => {
    forgetAuthors()
    load()
  }

  const setActive = async (a: Author, active: boolean) => {
    const card = toast.busy(active ? `Đang bật ${a.name}…` : `Đang tắt ${a.name}…`)
    try {
      await updateAuthor(a.id, { active })
      card.ok(active ? `Đã bật ${a.name}` : `Đã tắt ${a.name} — bài cũ vẫn giữ tên`)
      reload()
    } catch (e) {
      card.fail(e)
    }
  }

  const remove = async (a: Author) => {
    const card = toast.busy(`Đang xoá ${a.name}…`)
    try {
      await deleteAuthor(a.id)
      card.ok(`Đã xoá ${a.name}`)
      reload()
    } catch (e) {
      // 409: còn bài đứng tên. Nói rõ cách làm thay vì chỉ báo lỗi.
      const n = e instanceof ApiError ? (e.payload as { details?: { post_count?: number } })?.details?.post_count : undefined
      card.fail(n ? new Error(`${a.name} còn đứng tên ${n} bài — hãy tắt thay vì xoá`) : e)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontFamily: sans, fontSize: 12.5, color: ink.soft, margin: 0 }}>
          Người tắt không chọn được cho bài mới, nhưng bài cũ vẫn giữ tên họ.
        </p>
        <Button level="primary" size="sm" icon={<IconPlus size={14} />} onClick={() => setEditing('new')}>
          Thêm tác giả
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {authors === null && <Quiet>Đang tải…</Quiet>}
        {loadError && <Quiet>Không tải được danh sách tác giả: {loadError}</Quiet>}
        {authors?.length === 0 && !loadError && <Quiet>Chưa có tác giả nào.</Quiet>}
        {authors?.map((a) => (
          <AuthorCard
            key={a.id}
            author={a}
            onOpen={() => setEditing(a)}
            onToggle={() => void setActive(a, !a.active)}
            onDelete={() => void remove(a)}
          />
        ))}
      </div>

      <AuthorDialog
        author={editing}
        onClose={() => setEditing(null)}
        onSaved={(a, created) => {
          toast.ok(created ? `Đã thêm ${a.name}` : `Đã lưu ${a.name}`)
          setEditing(null)
          reload()
        }}
      />
    </div>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: sans, fontSize: 12.5, color: ink.faint, padding: '10px 2px' }}>{children}</div>
}

export function Avatar({ author, size }: { author: Pick<Author, 'name' | 'avatar_url'>; size: number }) {
  const box = { width: size, height: size, borderRadius: 999, flex: 'none' as const }
  if (author.avatar_url) return <img src={author.avatar_url} alt="" style={{ ...box, objectFit: 'cover' }} />
  return (
    <span
      aria-hidden
      style={{
        ...box,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: paper.hover,
        border: `1px solid ${paper.rule}`,
        fontFamily: serif,
        fontSize: size * 0.42,
        color: ink.mid,
      }}
    >
      {author.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

type Item = { label: string; danger?: true; kind: 'edit' | 'toggle' | 'delete' }

function AuthorCard({
  author: a,
  onOpen,
  onToggle,
  onDelete,
}: {
  author: Author
  onOpen: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const [hover, setHover] = useState(false)
  const items: Item[] = [
    { kind: 'edit', label: 'Sửa' },
    { kind: 'toggle', label: a.active ? 'Tắt' : 'Bật lại' },
    // Xoá chỉ dành cho hồ sơ tạo nhầm; người đã viết thì tắt.
    ...(a.post_count === 0 ? [{ kind: 'delete' as const, label: 'Xoá', danger: true as const }] : []),
  ]
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      style={{
        display: 'grid',
        gridTemplateColumns: '44px minmax(0,1fr) auto',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        cursor: 'pointer',
        borderRadius: radius,
        border: `1px solid ${hover ? ink.faint : paper.rule}`,
        background: hover ? paper.hover : paper.white,
        opacity: a.active ? 1 : 0.62,
      }}
    >
      <Avatar author={a} size={40} />
      <div style={{ minWidth: 0 }}>
        <button type="button" className="ab-rowtitle" onClick={onOpen}>
          {a.name}
        </button>
        <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, marginTop: 3 }}>
          {a.slug} · {a.post_count ? `${a.post_count} bài` : 'chưa có bài'}
          {!a.active && ' · đã tắt'}
        </div>
        {a.bio && (
          <div
            style={{
              fontFamily: sans,
              fontSize: 12.5,
              color: ink.soft,
              marginTop: 4,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {a.bio}
          </div>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <RowMenu
          items={items}
          onPick={(it) => {
            if (it.kind === 'edit') onOpen()
            else if (it.kind === 'toggle') onToggle()
            else onDelete()
          }}
        />
      </div>
    </div>
  )
}

/** The fields this form draws an error under; any other error shows at the bottom. */
const FORM_FIELDS = ['avatar_url', 'name', 'slug', 'bio']

const EMPTY: Required<Omit<AuthorCreateRequest, 'active'>> = { name: '', slug: '', avatar_url: null, bio: '' }

/**
 * Tạo hoặc sửa một tác giả. Không tự lưu: bấm Lưu mới ghi, và ghi hỏng thì
 * hộp thoại vẫn mở với chữ vừa gõ, lỗi nằm cạnh đúng ô máy chủ chỉ ra.
 */
function AuthorDialog({
  author,
  onClose,
  onSaved,
}: {
  author: Author | 'new' | null
  onClose: () => void
  onSaved: (author: Author, created: boolean) => void
}) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const open = author !== null
  const creating = author === 'new'

  useEffect(() => {
    if (!author) return
    setForm(author === 'new' ? EMPTY : { name: author.name, slug: author.slug, avatar_url: author.avatar_url, bio: author.bio })
    setError(null)
    setBusy(false)
  }, [author])

  useEffect(() => {
    if (!open) return
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escape)
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('input')?.focus()
    return () => {
      document.removeEventListener('keydown', escape)
      document.body.style.overflow = scroll
    }
  }, [open, onClose])

  if (!author) return null

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    if (busy || !form.name.trim()) return
    setBusy(true)
    try {
      // Bỏ trống slug lúc tạo là nhờ máy chủ đặt theo tên; lúc sửa thì gửi
      // đúng cái đang có, vì một slug rỗng không phải một slug.
      const slug = form.slug.trim()
      const body: AuthorCreateRequest = { name: form.name, avatar_url: form.avatar_url, bio: form.bio }
      if (slug) body.slug = slug
      const saved = creating ? await createAuthor(body) : await updateAuthor(author.id, body)
      onSaved(saved, creating)
    } catch (e) {
      const field = e instanceof ApiError ? (e.payload as { field?: string })?.field : undefined
      setError({ field, message: (e as Error).message })
      setBusy(false)
    }
  }

  const upload = async (f: File) => {
    setUploading(true)
    try {
      set('avatar_url', (await uploadImage(f)).url)
    } catch (e) {
      setError({ field: 'avatar_url', message: (e as Error).message })
    } finally {
      setUploading(false)
    }
  }

  const note = (field: string) =>
    error?.field === field ? (
      <div role="alert" style={{ fontFamily: sans, fontSize: 11.5, color: ink.danger, marginTop: 5 }}>
        {error.message}
      </div>
    ) : null

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(35, 33, 26, 0.38)',
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={creating ? 'Thêm tác giả' : `Sửa ${author.name}`}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '100%',
          overflowY: 'auto',
          background: paper.white,
          border: `1px solid ${ink.border}`,
          borderRadius: radius,
          boxShadow: '0 18px 48px rgba(35, 33, 26, 0.22)',
          outline: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 20px',
            borderBottom: `1px solid ${paper.rule}`,
          }}
        >
          <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, margin: 0, color: ink.base }}>
            {creating ? 'Thêm tác giả' : 'Sửa tác giả'}
          </h2>
          <IconButton level="ghost" label="Đóng" onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar author={{ name: form.name || '?', avatar_url: form.avatar_url }} size={56} />
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
                e.target.value = ''
              }}
            />
            <Button size="sm" icon={<IconUpload size={14} />} disabled={uploading} onClick={() => file.current?.click()}>
              {uploading ? 'Đang tải…' : 'Tải ảnh'}
            </Button>
            {form.avatar_url && (
              <Button size="sm" onClick={() => set('avatar_url', null)}>
                Bỏ ảnh
              </Button>
            )}
          </div>
          {note('avatar_url')}

          <Labeled label="Tên" htmlFor="author-name">
            <input
              id="author-name"
              className="admin-field"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
            {note('name')}
          </Labeled>

          <Labeled label="Slug" htmlFor="author-slug">
            <input
              id="author-slug"
              className="admin-field"
              value={form.slug}
              placeholder={creating ? 'bỏ trống để đặt theo tên' : undefined}
              onChange={(e) => set('slug', e.target.value)}
            />
            {note('slug')}
          </Labeled>

          <Labeled label="Tiểu sử ngắn" htmlFor="author-bio">
            <textarea
              id="author-bio"
              className="admin-field"
              rows={3}
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              style={{ resize: 'vertical' }}
            />
            {note('bio')}
          </Labeled>

          {error && !FORM_FIELDS.includes(error.field ?? '') && (
            <div role="alert" style={{ fontFamily: sans, fontSize: 11.5, color: ink.danger }}>
              {error.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onClose}>Huỷ</Button>
            <Button type="submit" level="primary" disabled={busy || uploading || !form.name.trim()}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Labeled({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          fontFamily: sans,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color: ink.faint,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
