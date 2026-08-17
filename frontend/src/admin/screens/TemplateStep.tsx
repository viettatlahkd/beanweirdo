import { useState } from 'react'
import { TEMPLATES, type PostTemplate } from '../lib/apiClient'
import { garden, ink, paper } from '../../design/tokens'

/**
 * The 3 real post templates are a fixed, non-extensible choice now — the old
 * admin-managed `templates` table (band/specimen/sequence + admin-created
 * color variants) is gone. No fetch, no dynamic list.
 */
const TEMPLATE_INFO: Record<PostTemplate, { name: string; desc: string }> = {
  article: {
    name: 'Article',
    desc: 'Essay 2 cột + rail sticky (trích dẫn, liên quan, đọc thêm). Hợp bài dạng luận/phân tích dài.',
  },
  cards: {
    name: 'Cards',
    desc: 'Danh sách thẻ xổ ra, lọc theo tag, TOC dính bên phải. Hợp bài dạng từ điển/tham chiếu.',
  },
  report: {
    name: 'Report',
    desc: 'Tài liệu sửa tại chỗ — số liệu, biểu đồ, bảng, ảnh. Hợp bài dạng log/báo cáo rang.',
  },
}

/**
 * Faithful miniature illustration of each template's real visual structure —
 * mirrors the approved mockup's `.mini-article` / `.mini-cards` /
 * `.mini-report` treatment (see "02 · Chọn template" in the approved admin
 * redesign reference) rather than rendering the actual post-renderer
 * components at thumbnail size.
 */
function TemplateMini({ template }: { template: PostTemplate }) {
  if (template === 'article') {
    return (
      <div style={{ height: 150, padding: 14, display: 'flex', flexDirection: 'column', background: garden.leaf }}>
        <div style={{ width: '70%', height: 10, background: 'rgba(31,51,35,.45)', marginBottom: 6 }} />
        <div style={{ width: '50%', height: 6, background: 'rgba(31,51,35,.28)' }} />
        <div style={{ flex: 1, display: 'flex', gap: 6, paddingTop: 8 }}>
          <div style={{ flex: 2.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ height: 5, background: 'rgba(31,51,35,.2)' }} />
            <div style={{ height: 5, background: 'rgba(31,51,35,.2)' }} />
            <div style={{ height: 5, width: '70%', background: 'rgba(31,51,35,.2)' }} />
          </div>
          <div style={{ flex: 1, background: garden.moss }} />
        </div>
      </div>
    )
  }
  if (template === 'cards') {
    return (
      <div style={{ height: 150, padding: 14, display: 'flex', flexDirection: 'column', background: garden.leafTint }}>
        <div style={{ width: '60%', height: 9, background: 'rgba(31,51,35,.4)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 10 }}>
          <div style={{ height: 14, background: 'rgba(255,255,255,.7)', borderLeft: `3px solid ${ink.green}` }} />
          <div style={{ height: 14, background: 'rgba(255,255,255,.7)', borderLeft: `3px solid ${ink.green}` }} />
          <div style={{ height: 14, background: 'rgba(255,255,255,.7)', borderLeft: `3px solid ${ink.green}` }} />
        </div>
      </div>
    )
  }
  // report — mockup introduces a dedicated mint hue used only here.
  const mint = '#6FA8C0'
  return (
    <div style={{ height: 150, padding: 14, display: 'flex', flexDirection: 'column', background: mint }}>
      <div style={{ width: '55%', height: 9, background: 'rgba(14,44,56,.45)' }} />
      <div style={{ flex: 1, display: 'flex', gap: 6, paddingTop: 10 }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 2, height: 16 }}>
            <div style={{ flex: 1, background: 'rgba(14,44,56,.15)' }} />
            <div style={{ flex: 1, background: 'rgba(14,44,56,.15)' }} />
            <div style={{ flex: 1, background: 'rgba(14,44,56,.15)' }} />
          </div>
          <div style={{ height: 5, background: 'rgba(14,44,56,.2)' }} />
          <div style={{ height: 5, width: '70%', background: 'rgba(14,44,56,.2)' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 16, borderLeft: '2px solid rgba(14,44,56,.4)', background: 'rgba(255,255,255,.3)' }} />
          <div style={{ height: 16, borderLeft: '2px solid rgba(14,44,56,.4)', background: 'rgba(255,255,255,.3)' }} />
        </div>
      </div>
    </div>
  )
}

export function TemplateStep({ onContinue }: { onContinue: (template: PostTemplate) => void }) {
  const [selected, setSelected] = useState<PostTemplate | null>(null)

  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: ink.muted, marginBottom: 10, fontWeight: 500 }}>
        Chọn template — 3 kiểu trang cố định
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 660 }}>
        {TEMPLATES.map((t) => (
          <div key={t} onClick={() => setSelected(t)} className={`admin-tpl-card${selected === t ? ' sel' : ''}`}>
            <TemplateMini template={t} />
            <div style={{ padding: '9px 10px', fontSize: 12, color: ink.strong, borderTop: `1px solid ${paper.rule}` }}>
              {TEMPLATE_INFO[t].name}
              <small style={{ display: 'block', color: ink.muted, fontSize: 10.5, marginTop: 1 }}>{TEMPLATE_INFO[t].desc}</small>
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
