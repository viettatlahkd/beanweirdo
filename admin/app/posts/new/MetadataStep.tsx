'use client'
import { useState } from 'react'

export type Metadata = { moduleId: string; kind: string; en: string; vi: string }
const MODULES = ['sensory', 'biochem', 'roasting']
const KINDS = ['note', 'essay', 'ref', 'log']

export function MetadataStep({ onContinue }: { onContinue: (m: Metadata) => void }) {
  const [moduleId, setModuleId] = useState(MODULES[0])
  const [kind, setKind] = useState(KINDS[0])
  const [en, setEn] = useState('')
  const [vi, setVi] = useState('')

  return (
    <div>
      <label htmlFor="module">Module</label>
      <select id="module" aria-label="Module" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
        {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      <label htmlFor="kind">Loại bài</label>
      <select id="kind" aria-label="Loại bài" value={kind} onChange={(e) => setKind(e.target.value)}>
        {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>

      <label htmlFor="en">Tiêu đề (EN)</label>
      <input id="en" aria-label="Tiêu đề (EN)" value={en} onChange={(e) => setEn(e.target.value)} />

      <label htmlFor="vi">Mô tả (VI)</label>
      <input id="vi" aria-label="Mô tả (VI)" value={vi} onChange={(e) => setVi(e.target.value)} />

      <button onClick={() => onContinue({ moduleId, kind, en, vi })}>Tiếp tục →</button>
    </div>
  )
}
