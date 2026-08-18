import { useEffect, useState } from 'react'
import { listTemplates, type TemplateSummary } from '../lib/apiClient'
import { Stepper } from '../components/Stepper'

/**
 * Step two of writing a post: which template to start from.
 *
 * These are stored templates, fetched — not a hardcoded list of renderers.
 * Adding a sixth is a row in a table, and it shows up here without anyone
 * touching this file.
 */
const hint = {
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '.05em',
  color: '#8C8674',
  margin: '0 0 6px',
  display: 'block',
}

export function TemplateStep({ onContinue }: { onContinue: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [picked, setPicked] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((e) => setError((e as Error).message))
  }, [])

  return (
    <div className="admin-card" style={{ maxWidth: 720, margin: '32px auto' }}>
      <Stepper current="template" />
      <h2 style={{ marginTop: 0 }}>Bắt đầu từ template nào</h2>
      <p style={hint}>
        Nội dung của template sẽ được chép sang bài mới. Sửa thoải mái sau đó — bài là bản độc lập.
      </p>

      {error && <p role="alert">{error}</p>}
      {templates.length === 0 && !error && <p>Đang tải template…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setPicked(t.id)}
            aria-pressed={picked === t.id}
            style={{
              textAlign: 'left',
              padding: '14px 16px',
              border: `1px solid ${picked === t.id ? '#3E7A4E' : '#EBE5D3'}`,
              background: picked === t.id ? '#F6F9F4' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 14 }}>{t.name}</div>
            <div style={{ fontSize: 12.5, color: '#5C5745', marginTop: 4 }}>{t.description}</div>
          </button>
        ))}
      </div>

      <button
        className="admin-btn"
        disabled={!picked}
        onClick={() => onContinue(picked)}
        style={{ marginTop: 22 }}
      >
        Tiếp tục
      </button>
    </div>
  )
}
