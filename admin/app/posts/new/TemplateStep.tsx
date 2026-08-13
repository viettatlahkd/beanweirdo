'use client'
import { useEffect, useState } from 'react'
import { listTemplates, type Template } from '../../../lib/apiClient'

const LAYOUT_LABEL: Record<Template['layout'], string> = {
  band: 'khối màu đầu trang · 1 ảnh ngang lớn · danh mục 2 cột',
  specimen: 'nửa trái khối màu · nửa phải lưới ảnh vuông',
  sequence: 'tiêu đề cực lớn trên khối màu · dải 4 ảnh chuyển màu',
}

export function TemplateStep({ onContinue }: { onContinue: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    listTemplates().then(setTemplates)
  }, [])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelected(t.id)}
            style={{ border: selected === t.id ? '2px solid #23211A' : '1px solid #EBE5D3', borderRadius: 10, cursor: 'pointer', padding: 8 }}
          >
            <div style={{ height: 64, background: t.accent, borderRadius: 6 }} />
            <div style={{ fontSize: 12, marginTop: 8 }}>{t.name}</div>
            <div style={{ fontSize: 10.5, opacity: 0.6 }}>{LAYOUT_LABEL[t.layout]}</div>
          </div>
        ))}
      </div>
      <button disabled={!selected} onClick={() => selected && onContinue(selected)} style={{ marginTop: 20 }}>
        Tiếp tục →
      </button>
    </div>
  )
}
