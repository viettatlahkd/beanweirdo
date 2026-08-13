'use client'
import { useState } from 'react'
import { ink, paper } from '../../../lib/theme'

export type Metadata = { moduleId: string; kind: string; en: string; vi: string }
const MODULES = ['sensory', 'biochem', 'roasting']
const KINDS = ['note', 'essay', 'ref', 'log']

const fieldLabelStyle = { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.05em', color: ink.muted, margin: '16px 0 6px', display: 'block' }

export function MetadataStep({ onContinue }: { onContinue: (m: Metadata) => void }) {
  const [moduleId, setModuleId] = useState(MODULES[0])
  const [kind, setKind] = useState(KINDS[0])
  const [en, setEn] = useState('')
  const [vi, setVi] = useState('')

  return (
    <div style={{ maxWidth: 560, background: paper.white, border: `1px solid ${paper.rule}`, borderRadius: 10, padding: 24 }}>
      <label htmlFor="module" style={{ ...fieldLabelStyle, marginTop: 0 }}>
        Module
      </label>
      <select id="module" aria-label="Module" value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="admin-field">
        {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      <label htmlFor="kind" style={fieldLabelStyle}>
        Loại bài (kind)
      </label>
      <select id="kind" aria-label="Loại bài" value={kind} onChange={(e) => setKind(e.target.value)} className="admin-field">
        {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
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
        <button onClick={() => onContinue({ moduleId, kind, en, vi })} className="admin-btn">
          Tiếp tục →
        </button>
      </div>
    </div>
  )
}
