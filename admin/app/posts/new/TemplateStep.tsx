'use client'
import { useEffect, useState } from 'react'
import { listTemplates, type Template } from '../../../lib/apiClient'
import { ink, paper } from '../../../lib/theme'

const LAYOUT_LABEL: Record<Template['layout'], string> = {
  band: 'khối màu đầu trang · 1 ảnh ngang lớn · danh mục 2 cột',
  specimen: 'nửa trái khối màu · nửa phải lưới ảnh vuông',
  sequence: 'tiêu đề cực lớn trên khối màu · dải 4 ảnh chuyển màu',
}

// Miniature layout preview, proportioned per layout type — mirrors the
// approved mockup's `.tpl-mini` treatment so pickers show real shape, not a
// flat color swatch.
function TemplateMini({ template }: { template: Template }) {
  const block = { position: 'absolute' as const, borderRadius: 1 }
  if (template.layout === 'band') {
    return (
      <div style={{ position: 'relative', aspectRatio: '200 / 130', background: paper.cream, overflow: 'hidden' }}>
        <div style={{ ...block, left: 0, top: 0, width: '100%', height: '28%', background: template.accent }} />
        <div style={{ ...block, left: '7%', top: '10%', width: '36%', height: '8%', background: 'rgba(0,0,0,.28)' }} />
        <div style={{ ...block, left: '7%', top: '36%', width: '86%', height: '36%', background: 'rgba(0,0,0,.09)', borderRadius: 2 }} />
        <div style={{ ...block, left: '7%', top: '80%', width: '8%', height: '8%', background: 'rgba(0,0,0,.16)' }} />
        <div style={{ ...block, left: '17%', top: '81%', width: '30%', height: '5%', background: 'rgba(0,0,0,.14)' }} />
        <div style={{ ...block, left: '52%', top: '80%', width: '8%', height: '8%', background: 'rgba(0,0,0,.16)' }} />
        <div style={{ ...block, left: '62%', top: '81%', width: '30%', height: '5%', background: 'rgba(0,0,0,.14)' }} />
      </div>
    )
  }
  if (template.layout === 'specimen') {
    return (
      <div style={{ position: 'relative', aspectRatio: '200 / 130', background: paper.cream, overflow: 'hidden' }}>
        <div style={{ ...block, left: 0, top: 0, width: '45%', height: '100%', background: template.accent }} />
        <div style={{ ...block, left: '52%', top: '6%', width: '20%', height: '30%', background: 'rgba(0,0,0,.14)' }} />
        <div style={{ ...block, left: '76%', top: '6%', width: '20%', height: '30%', background: 'rgba(0,0,0,.14)' }} />
        <div style={{ ...block, left: '52%', top: '40%', width: '20%', height: '30%', background: 'rgba(0,0,0,.14)' }} />
        <div style={{ ...block, left: '76%', top: '40%', width: '20%', height: '30%', background: 'rgba(0,0,0,.14)' }} />
        <div style={{ ...block, left: '52%', top: '74%', width: '44%', height: '22%', background: 'rgba(0,0,0,.14)' }} />
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', aspectRatio: '200 / 130', background: paper.cream, overflow: 'hidden' }}>
      <div style={{ ...block, left: 0, top: 0, width: '100%', height: '70%', background: template.accent }} />
      <div style={{ ...block, left: '7%', top: '16%', width: '66%', height: '12%', background: 'rgba(0,0,0,.30)' }} />
      <div style={{ ...block, left: '7%', top: '34%', width: '42%', height: '12%', background: 'rgba(0,0,0,.20)' }} />
      <div style={{ ...block, left: '7%', top: '78%', width: '19%', height: '18%', background: template.accent }} />
      <div style={{ ...block, left: '28%', top: '78%', width: '19%', height: '18%', background: template.tint2 }} />
      <div style={{ ...block, left: '49%', top: '78%', width: '19%', height: '18%', background: template.tint }} />
      <div style={{ ...block, left: '74%', top: '78%', width: '19%', height: '18%', background: template.accent, opacity: 0.55 }} />
    </div>
  )
}

export function TemplateStep({ onContinue }: { onContinue: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    listTemplates().then(setTemplates)
  }, [])

  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: ink.muted, marginBottom: 10, fontWeight: 500 }}>
        Chọn template (layout + màu — không phụ thuộc module)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 660 }}>
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`admin-tpl-card${selected === t.id ? ' sel' : ''}`}
          >
            <TemplateMini template={t} />
            <div style={{ padding: '9px 10px', fontSize: 12, color: ink.strong, borderTop: `1px solid ${paper.rule}` }}>
              {t.name}
              <small style={{ display: 'block', color: ink.muted, fontSize: 10.5, marginTop: 1 }}>{LAYOUT_LABEL[t.layout]}</small>
            </div>
          </div>
        ))}
      </div>
      <button disabled={!selected} onClick={() => selected && onContinue(selected)} className="admin-btn" style={{ marginTop: 20 }}>
        Tiếp tục →
      </button>
    </div>
  )
}
