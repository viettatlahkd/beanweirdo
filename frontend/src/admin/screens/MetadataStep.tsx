import { useEffect, useState } from 'react'
import { listModules, type Module, type PostKind } from '../lib/apiClient'
import { ink, paper } from '../../design/tokens'

export type Metadata = { moduleId: string; kind: PostKind; en: string; vi: string }
const KINDS: PostKind[] = ['note', 'essay', 'ref', 'log']

const fieldLabelStyle = { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.05em', color: ink.muted, margin: '16px 0 6px', display: 'block' }

export function MetadataStep({ onContinue }: { onContinue: (m: Metadata) => void }) {
  const [modules, setModules] = useState<Module[]>([])
  const [moduleId, setModuleId] = useState('')
  const [kind, setKind] = useState<PostKind>(KINDS[0])
  const [en, setEn] = useState('')
  const [vi, setVi] = useState('')

  useEffect(() => {
    listModules().then((mods) => {
      setModules(mods)
      if (mods.length > 0) setModuleId(mods[0].id)
    })
  }, [])

  const canContinue = moduleId !== '' && en.trim() !== '' && vi.trim() !== ''

  return (
    <div style={{ maxWidth: 560, background: paper.white, border: `1px solid ${paper.rule}`, borderRadius: 10, padding: 24 }}>
      <label htmlFor="module" style={{ ...fieldLabelStyle, marginTop: 0 }}>
        Module
      </label>
      <select id="module" aria-label="Module" value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="admin-field">
        {modules.length === 0 && <option value="">Đang tải module…</option>}
        {/* Reading modules first, then the journals — a post can be filed
            under either, but they are not the same kind of place. */}
        <optgroup label="Module">
          {modules
            .filter((m) => m.kind !== 'special')
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
        </optgroup>
        <optgroup label="Ghi chép">
          {modules
            .filter((m) => m.kind === 'special')
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
        </optgroup>
      </select>

      <label htmlFor="kind" style={fieldLabelStyle}>
        Loại bài (kind)
      </label>
      <select id="kind" aria-label="Loại bài" value={kind} onChange={(e) => setKind(e.target.value as PostKind)} className="admin-field">
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>

      <label htmlFor="en" style={fieldLabelStyle}>
        Tiêu đề (EN)
      </label>
      <input id="en" aria-label="Tiêu đề (EN)" value={en} onChange={(e) => setEn(e.target.value)} className="admin-field" placeholder="Senses of Flavors" />

      <label htmlFor="vi" style={fieldLabelStyle}>
        Mô tả (VI)
      </label>
      <input
        id="vi"
        aria-label="Mô tả (VI)"
        value={vi}
        onChange={(e) => setVi(e.target.value)}
        className="admin-field"
        placeholder="Năm giác quan cùng tham gia..."
      />

      <div style={{ marginTop: 20 }}>
        <button disabled={!canContinue} onClick={() => onContinue({ moduleId, kind, en, vi })} className="admin-btn">
          Tiếp tục →
        </button>
      </div>
    </div>
  )
}
