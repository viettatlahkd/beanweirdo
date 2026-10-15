import { useEffect, useRef, useState } from 'react'
import { uploadImage } from '../lib/apiClient'
import { Button, IconButton } from '../../design/Button'
import { IconClose, IconPlus, IconUpload } from '../../design/icons'
import { radius } from '../../design/controls'
import { ink, paper, sans, serif } from '../../design/tokens'
import { Menu, type DetailAction } from './Detail'
import { Avatar } from './AuthorsPanel'
import { useFraming } from './framing'
import { aboutSign, type PortContent, type Signature } from '../../portfolio/content'

type About = PortContent['about']

/**
 * Quản lý chữ kí in Thông tin chung (owner, 2026-10-15): one card per
 * signature, laid out as Tác giả is — a click opens it, rare actions sit
 * behind ⋮, and edits are written only on Lưu. The about page picks one.
 */
export function SignaturesPanel({ about, onSave, startNew }: { about: About; onSave: (about: About) => void; startNew?: boolean }) {
  const [editing, setEditing] = useState<Signature | 'new' | null>(startNew ? 'new' : null)
  const inUse = aboutSign(about)?.id
  const save = (sg: Signature) => {
    const known = about.signatures.some((x) => x.id === sg.id)
    onSave({ ...about, signatures: known ? about.signatures.map((x) => (x.id === sg.id ? sg : x)) : [...about.signatures, sg] })
    setEditing(null)
  }
  return (
    <div style={{ paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {about.signatures.map((sg) => {
        const actions: DetailAction[] = [
          { label: 'Sửa', onPick: () => setEditing(sg) },
          ...(sg.id === inUse ? [] : [{ label: 'Dùng ở about', onPick: () => onSave({ ...about, signId: sg.id }) }]),
          // The one in use stays: the about page always signs with something.
          ...(sg.id === inUse ? [] : [{ label: 'Xoá', danger: true as const, onPick: () => onSave({ ...about, signatures: about.signatures.filter((x) => x.id !== sg.id) }) }]),
        ]
        return <SignCard key={sg.id} sign={sg} used={sg.id === inUse} actions={actions} onOpen={() => setEditing(sg)} />
      })}
      <span>
        <Button level="add" icon={<IconPlus size={14} />} onClick={() => setEditing('new')}>
          Thêm chữ kí
        </Button>
      </span>
      {editing && <SignDialog sign={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function SignCard({ sign, used, actions, onOpen }: { sign: Signature; used: boolean; actions: DetailAction[]; onOpen: () => void }) {
  const [hover, setHover] = useState(false)
  const reach = sign.reach.filter((l) => l.label || l.url)
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
        border: `1px solid ${hover ? ink.soft : paper.rule}`,
        background: hover ? paper.hover : paper.white,
      }}
    >
      <Avatar author={{ name: sign.name || '?', avatar_url: sign.image || null }} size={40} />
      <div style={{ minWidth: 0 }}>
        <button type="button" className="ab-rowtitle" onClick={onOpen}>
          {sign.name || 'chưa đặt tên'}
        </button>
        <div style={{ fontFamily: sans, fontSize: 13, color: ink.soft, marginTop: 3 }}>
          {reach.length ? reach.map((l) => l.label || l.url).join(' · ') : 'chưa có liên hệ'}
          {used && ' · đang dùng ở about'}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Menu actions={actions} label={`Thao tác ${sign.name}`} />
      </div>
    </div>
  )
}

const fresh = (): Signature => ({ id: `sign-${Date.now().toString(36)}`, name: '', image: '', reach: [{ label: '', url: '' }] })

function SignDialog({ sign, onClose, onSave }: { sign: Signature | 'new'; onClose: () => void; onSave: (sign: Signature) => void }) {
  const creating = sign === 'new'
  const [form, setForm] = useState<Signature>(() => (sign === 'new' ? fresh() : sign))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const frame = useFraming()

  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', escape)
    panel.current?.querySelector<HTMLInputElement>('#sign-name')?.focus()
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])

  const upload = async (f: File) => {
    setUploading(true)
    try {
      const { url } = await uploadImage(f)
      // Drawn in a circle like an author's face, so it is framed square.
      setForm((x) => ({ ...x, image: url }))
      const framed = await frame({ url, name: 'Ảnh chữ kí', ratio: 1 })
      setForm((x) => ({ ...x, image: framed }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }
  const setLink = (i: number, patch: Partial<Signature['reach'][number]>) => setForm((x) => ({ ...x, reach: x.reach.map((l, j) => (j === i ? { ...l, ...patch } : l)) }))
  const label = { display: 'block', fontFamily: sans, fontSize: 13, color: ink.soft, marginBottom: 6 }

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(35, 33, 26, 0.38)' }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={creating ? 'Thêm chữ kí' : `Sửa ${sign.name}`}
        style={{ width: '100%', maxWidth: 520, maxHeight: '100%', overflowY: 'auto', background: paper.white, border: `1px solid ${ink.border}`, borderRadius: radius, boxShadow: '0 18px 48px rgba(35, 33, 26, 0.22)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${paper.rule}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, margin: 0, color: ink.base }}>{creating ? 'Thêm chữ kí' : 'Sửa chữ kí'}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (form.name.trim()) onSave({ ...form, reach: form.reach.filter((l) => l.label.trim() || l.url.trim()) })
          }}
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar author={{ name: form.name || '?', avatar_url: form.image || null }} size={56} />
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
            {form.image && (
              <Button size="sm" onClick={() => setForm((x) => ({ ...x, image: '' }))}>
                Bỏ ảnh
              </Button>
            )}
          </div>
          <div>
            <label htmlFor="sign-name" style={label}>
              Tên chữ kí
            </label>
            <input id="sign-name" className="admin-field" value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} />
          </div>
          <div>
            <span style={label}>Liên hệ</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.reach.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr) 28px', gap: 8, alignItems: 'center' }}>
                  <input className="admin-field" aria-label="Nhãn" placeholder="Nhãn" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
                  <input className="admin-field" aria-label="Link" placeholder="Link" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                  <IconButton size="sm" label="Xoá liên hệ" onClick={() => setForm((x) => ({ ...x, reach: x.reach.filter((_, j) => j !== i) }))}>
                    <IconClose size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <Button level="add" size="sm" icon={<IconPlus size={14} />} onClick={() => setForm((x) => ({ ...x, reach: [...x.reach, { label: '', url: '' }] }))}>
                Thêm liên hệ
              </Button>
            </div>
          </div>
          {error && (
            <div role="alert" style={{ fontFamily: sans, fontSize: 13, color: ink.danger }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button level="quiet" onClick={onClose}>
              Huỷ
            </Button>
            <Button type="submit" level="primary" disabled={uploading || !form.name.trim()}>
              Lưu
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
