import { useEffect, useState } from 'react'
import {
  listModules,
  listTemplates,
  listTopics,
  type Module,
  type TemplateSummary,
  type Topic,
} from '../lib/apiClient'
import { topicOptions } from '../components/PostPlacement'
import { ink, paper } from '../../design/tokens'
import { ThemePicker } from '../components/ThemePicker'

/**
 * Everything a post needs before it exists.
 *
 * There used to be a second step for the template, which meant deciding the
 * shape of a piece on a page that had already forgotten what it was about.
 * It is one form now, and the only step.
 */
export type Metadata = {
  module_id: string
  /** Chỗ trên cây chủ đề (migration 0027). */
  topic_id: string
  /** Dạng bài, stored in `posts.kind` (the `tags` vocabulary). */
  kind: string
  en: string
  vi: string
  templateId: string
  /** Màu riêng; rỗng nghĩa là bài đi theo màu module. */
  theme_color: string | null
}

const fieldLabelStyle = {
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '.05em',
  color: ink.muted,
  margin: '16px 0 6px',
  display: 'block',
}

export function MetadataStep({ onContinue }: { onContinue: (m: Metadata) => void }) {
  const [modules, setModules] = useState<Module[]>([])
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [module_id, setModuleId] = useState('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [topic_id, setTopicId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [en, setEn] = useState('')
  const [vi, setVi] = useState('')
  const [theme, setTheme] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listModules().then((mods) => {
      setModules(mods)
      if (mods.length > 0) setModuleId(mods[0].id)
    })
    listTopics().then(setTopics)
    listTemplates().then((ts) => {
      setTemplates(ts)
      if (ts.length > 0) setTemplateId(ts[0].id)
    })
  }, [])

  const canContinue = module_id !== '' && topic_id !== '' && templateId !== '' && en.trim() !== '' && !busy

  async function submit() {
    setBusy(true)
    try {
      onContinue({
        module_id,
        topic_id,
        // Dạng bài is retired — the template says what a post is.
        kind: '',
        en: en.trim(),
        vi: vi.trim(),
        templateId,
        theme_color: theme,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, background: paper.white, border: `1px solid ${paper.rule}`, borderRadius: 10, padding: 24 }}>
      <label htmlFor="module" style={{ ...fieldLabelStyle, marginTop: 0 }}>
        Module
      </label>
      <select id="module" aria-label="Module" value={module_id} onChange={(e) => setModuleId(e.target.value)} className="admin-field">
        {modules.length === 0 && <option value="">Đang tải module…</option>}
        {/* Reading modules and the journals are both places a post can be filed
            under, but they are not the same kind of place. */}
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

      <label htmlFor="topic" style={fieldLabelStyle}>
        Chủ đề
      </label>
      <select id="topic" aria-label="Chủ đề" value={topic_id} onChange={(e) => setTopicId(e.target.value)} className="admin-field">
        <option value="">—</option>
        {topicOptions(topics).map(({ subject, children }) => (
          <optgroup key={subject.id} label={subject.title}>
            <option value={subject.id}>{subject.title}</option>
            {children.map((t) => (
              <option key={t.id} value={t.id}>
                {subject.title} › {t.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <label style={fieldLabelStyle}>Màu bài</label>
      <ThemePicker
        value={theme}
        moduleColor={modules.find((m) => m.id === module_id)?.accent}
        moduleLabel={modules.find((m) => m.id === module_id)?.title}
        themes={modules.map((m) => ({ id: m.id, label: m.title, color: m.accent }))}
        onChange={setTheme}
      />

      <label htmlFor="template" style={fieldLabelStyle}>
        Template
      </label>
      <select id="template" aria-label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="admin-field">
        {templates.length === 0 && <option value="">Đang tải template…</option>}
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <label htmlFor="en" style={fieldLabelStyle}>
        Tiêu đề
      </label>
      <input id="en" aria-label="Tiêu đề" value={en} onChange={(e) => setEn(e.target.value)} className="admin-field" />

      <label htmlFor="vi" style={fieldLabelStyle}>
        Mô tả
      </label>
      <input id="vi" aria-label="Mô tả" value={vi} onChange={(e) => setVi(e.target.value)} className="admin-field" />

      <div style={{ marginTop: 20 }}>
        <button disabled={!canContinue} onClick={() => void submit()} className="admin-btn">
          Soạn bài →
        </button>
      </div>
    </div>
  )
}
