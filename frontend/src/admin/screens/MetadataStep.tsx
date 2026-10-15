import { useEffect, useState } from 'react'
import {
  listModules,
  listTemplates,
  listNodes,
  type Module,
  type TemplateSummary,
  type Node,
} from '../lib/apiClient'
import { topicOptions } from '../components/PostSettings'
import { ink, sans } from '../../design/tokens'
import { ThemePicker } from '../components/ThemePicker'
import { Button } from '../../design/Button'

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

// Same label as the "Thông tin bài" panel, so a post is described in one voice
// whether it is being started or edited.
const fieldLabelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: ink.strong,
  margin: '16px 0 6px',
  display: 'block',
}

export function MetadataStep({ onContinue }: { onContinue: (m: Metadata) => void }) {
  const [modules, setModules] = useState<Module[]>([])
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [module_id, setModuleId] = useState('')
  const [topics, setTopics] = useState<Node[]>([])
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
    listNodes('blog').then(setTopics)
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
    // No frame of its own: the dialog that hosts it is the box (owner,
    // 2026-10-15: "sao lại 2 box lồng nhau thế").
    <div style={{ fontFamily: sans }}>
      <label htmlFor="en" style={{ ...fieldLabelStyle, marginTop: 0 }}>
        Tiêu đề
      </label>
      <input id="en" aria-label="Tiêu đề" value={en} onChange={(e) => setEn(e.target.value)} className="admin-field" />

      <label htmlFor="vi" style={fieldLabelStyle}>
        Mô tả
      </label>
      <input id="vi" aria-label="Mô tả" value={vi} onChange={(e) => setVi(e.target.value)} className="admin-field" />

      <label htmlFor="topic" style={fieldLabelStyle}>
        Chủ đề
      </label>
      <select id="topic" aria-label="Chủ đề" value={topic_id} onChange={(e) => setTopicId(e.target.value)} className="admin-field">
        <option value="">—</option>
        {topicOptions(topics).map(({ subject, children }) => (
          <optgroup key={subject.id} label={subject.title}>
            <option value={subject.id}>{subject.title}</option>
            {children.map(({ topic: t, path }) => (
              <option key={t.id} value={t.id}>
                {path}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

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

      {/* Named as in the "Thông tin bài" panel: the topic places the post,
          the module only lends its colour and address. */}
      <label htmlFor="module" style={fieldLabelStyle}>
        Màu mượn từ
      </label>
      <select id="module" aria-label="Màu mượn từ" value={module_id} onChange={(e) => setModuleId(e.target.value)} className="admin-field">
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

      <label style={fieldLabelStyle}>Màu bài</label>
      <ThemePicker
        value={theme}
        moduleColor={modules.find((m) => m.id === module_id)?.accent}
        moduleLabel={modules.find((m) => m.id === module_id)?.title}
        themes={modules.map((m) => ({ id: m.id, label: m.title, color: m.accent }))}
        onChange={setTheme}
      />

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
        <Button level="primary" disabled={!canContinue} onClick={() => void submit()}>
          Soạn bài →
        </Button>
      </div>
    </div>
  )
}
