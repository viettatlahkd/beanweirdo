import { useEffect, useState } from 'react'
import { type Module, type Tag, type TemplateSummary } from '../lib/apiClient'
import { listModulesCached, listTagsCached, listTemplatesCached } from '../lib/lists'
import { ink } from '../../design/tokens'
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
  /**
   * Tag đúng như chủ site vừa gõ. Máy chủ tự tính `id` và tự ghi tag xuống
   * cùng lúc với bài — xem `kindLabel` trong backend/api/posts/index.ts.
   */
  kindLabel: string
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
  const [tags, setTags] = useState<Tag[]>([])
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [module_id, setModuleId] = useState('')
  const [tag, setTag] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [en, setEn] = useState('')
  const [vi, setVi] = useState('')
  const [theme, setTheme] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listModulesCached().then((mods) => {
      setModules(mods)
      if (mods.length > 0) setModuleId(mods[0].id)
    })
    listTagsCached().then((ts) => {
      setTags(ts)
      if (ts.length > 0) setTag(ts[0].label)
    })
    listTemplatesCached().then((ts) => {
      setTemplates(ts)
      if (ts.length > 0) setTemplateId(ts[0].id)
    })
  }, [])

  const canContinue = module_id !== '' && templateId !== '' && en.trim() !== '' && !busy

  /*
   * Một tag gõ lần đầu vẫn được ghi xuống để lần sau có sẵn — nhưng không phải
   * ở đây nữa.
   *
   * Chỗ này từng gọi `createTag` và **chờ** nó xong mới sang bước tạo bài: hai
   * lượt mạng nối tiếp, mỗi lượt kèm một preflight, cho một cái nút mà việc của
   * nó chỉ là mở màn soạn ra. Nay nhãn đi kèm bài và máy chủ lo phần còn lại.
   */
  function submit() {
    setBusy(true)
    try {
      onContinue({
        module_id,
        kindLabel: tag.trim(),
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
    /*
     * Chỉ có các ô, không có khung.
     *
     * Trước đây khối này tự vẽ nền trắng, viền và bo góc, vì nó là thứ duy
     * nhất trên một trang trống. Nay nó nằm trong hộp thoại, và một cái khung
     * trong một cái khung là hai đường viền cách nhau hai chục pixel.
     */
    <div>
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

      <label htmlFor="tag" style={fieldLabelStyle}>
        Tag
      </label>
      <input
        id="tag"
        aria-label="Tag"
        list="tag-list"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        className="admin-field"
        placeholder="chọn hoặc gõ tag mới"
      />
      <datalist id="tag-list">
        {tags.map((t) => (
          <option key={t.id} value={t.label} />
        ))}
      </datalist>

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
