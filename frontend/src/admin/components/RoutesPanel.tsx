import { useMemo, useState } from 'react'
import { ink, paper, sans } from '../../design/tokens'
import { buildSlug } from '../../lib/postSlug'
import { TAG_PAGE, toPath } from '../../lib/routes'
import {
  adoptWords,
  checkWords,
  DATE_ORDERS,
  DEFAULT_WORDS,
  resolveWords,
  withHistory,
  WORD_LABELS,
  type DateOrder,
  type RouteWords,
  type StoredRoutes,
} from '../../lib/routeWords'
import { Button } from '../../design/Button'
import { Row, Section } from './Detail'
import { indexModules, useModules } from '../../data/useModules'

/** Ô nào đứng cạnh ô nào, và cái gì chúng làm ra. */
type Block = {
  title: string
  keys: (keyof typeof WORD_LABELS)[]
  /** Địa chỉ mẫu, dựng bằng đúng bộ từ đang gõ. */
  sample: (w: RouteWords) => string
}

/*
 * Chỉ những từ còn làm ra địa chỉ (2026-10-16). Các từ chỉ còn để đọc link cũ —
 * `post` (/journal/post/…, bài giờ ở /p/…), `details` (/bean/details), và sáu
 * trang con cũ của khu quản trị — không còn ô: sửa chúng không đổi địa chỉ
 * nào, mà bộ từ đã lưu vẫn giữ chúng để link cũ mở được.
 */
const BLOCKS: Block[] = [
  {
    title: 'Trang công khai',
    keys: ['bean', 'index', 'notes', 'module', 'tag', 'practice'],
    sample: (w) => toPath({ area: 'public', screen: 'module', moduleId: 'bean-weirdo' }, w),
  },
  {
    title: 'Khu quản trị',
    keys: ['admin', 'adPost', 'adAuthors', 'adTaxonomy', 'adTags', 'adTemplates', 'adTree', 'adDisplay', 'adArchive'],
    sample: (w) => toPath({ area: 'admin', screen: 'cms', tab: 'pages' }, w),
  },
  {
    title: 'Soạn bài',
    keys: ['create', 'edit', 'view'],
    sample: (w) => toPath({ area: 'admin', screen: 'postEdit', slug: buildSlug({ moduleId: 'ghi01', createdAt: '2026-08-24T09:00:00Z', status: 'published' }, w) }, w),
  },
  {
    title: 'Địa chỉ của một bài',
    keys: ['postMark', 'draftMark'],
    sample: (w) => toPath({ area: 'public', screen: 'article', slug: buildSlug({ moduleId: 'ghi01', createdAt: '2026-08-24T09:00:00Z', status: 'draft' }, w) }, w),
  },
]

const field = (bad: boolean): React.CSSProperties => ({
  boxSizing: 'border-box',
  fontFamily: sans,
  fontSize: 13.5,
  color: ink.base,
  background: paper.white,
  border: `1px solid ${bad ? '#8E1E42' : paper.rule}`,
  borderRadius: 6,
  padding: '7px 10px',
  width: 220,
  maxWidth: '100%',
  outline: 'none',
})
const sampleCode: React.CSSProperties = { fontFamily: 'ui-monospace, monospace', fontSize: 12, color: ink.green }

/**
 * Các từ dùng để viết địa chỉ — Cài đặt hiển thị › Đường dẫn, vẽ bằng khung
 * Section/Row như mọi màn khác của khu quản trị (2026-10-16).
 *
 * Chỉ có ô chữ ở đây. Hình dạng của một địa chỉ — có những mảnh nào, xếp thứ
 * tự ra sao, dấu gì ngăn chúng — nằm trong mã, nên nó không phải thứ bị từ chối
 * trên màn này mà là thứ không gõ vào đâu được.
 *
 * Đổi tên không giết link cũ: bộ từ đang dùng được cất lại lúc lưu, và một địa
 * chỉ viết bằng bộ cũ vẫn mở ra đúng chỗ rồi tự viết lại bằng bộ mới.
 */
export function RoutesPanel({
  stored,
  onSave,
}: {
  stored: StoredRoutes | undefined
  onSave: (routes: StoredRoutes) => void | Promise<void>
}) {
  const live = useMemo(() => resolveWords(stored), [stored])
  const [draft, setDraft] = useState<RouteWords>(live)
  const [saved, setSaved] = useState(false)
  // The journal's pages as its sidebar lists them: their ids are what a page address carries (topic ids since 0036).
  const { data: pages } = useModules()
  const journalPages = indexModules(pages).filter((p) => !p.id.startsWith(TAG_PAGE) && p.screen !== 'notes')

  const errors = checkWords(draft)
  const bad = Object.keys(errors).length > 0
  const changed = JSON.stringify(draft) !== JSON.stringify(live)

  const set = (key: keyof RouteWords, value: string) => {
    setSaved(false)
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const save = () => {
    const next = withHistory(draft, live)
    adoptWords(next)
    // Địa chỉ đang mở vừa đổi nghĩa. `useRoute` đọc lại khi nghe `popstate` và
    // viết lại thanh địa chỉ bằng bộ từ mới, nên màn này không tự đi đâu cả.
    window.dispatchEvent(new PopStateEvent('popstate'))
    setSaved(true)
    void onSave(next)
  }

  const word = (k: keyof typeof WORD_LABELS) => (
    <Row key={k} label={WORD_LABELS[k]}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input value={draft[k]} aria-label={WORD_LABELS[k]} onChange={(e) => set(k, e.target.value)} spellCheck={false} style={field(Boolean(errors[k]))} />
        {draft[k] !== DEFAULT_WORDS[k] && (
          <Button size="sm" level="quiet" onClick={() => set(k, DEFAULT_WORDS[k])}>
            về {DEFAULT_WORDS[k]}
          </Button>
        )}
      </div>
      {errors[k] && <div style={{ fontFamily: sans, fontSize: 13, color: '#8E1E42', marginTop: 4 }}>{errors[k]}</div>}
    </Row>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {saved && !changed && <span style={{ fontFamily: sans, fontSize: 13, color: ink.soft }}>đã lưu</span>}
        <Button level="primary" disabled={!changed || bad} onClick={save}>
          Lưu đường dẫn
        </Button>
      </div>

      {BLOCKS.map((b) => (
        <Section key={b.title} title={b.title} note={<code style={sampleCode}>{b.sample(draft)}</code>}>
          {b.keys.map(word)}
          {b.title === 'Địa chỉ của một bài' && (
            <Row label="Thứ tự ngày">
              <select value={draft.dateOrder} aria-label="Thứ tự ngày" onChange={(e) => set('dateOrder', e.target.value as DateOrder)} style={{ ...field(false), width: 'auto' }}>
                {DATE_ORDERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Row>
          )}
        </Section>
      ))}

      <Section title="Tên trang chủ đề trong địa chỉ" note={errors.modules ? <span style={{ color: '#8E1E42' }}>{errors.modules}</span> : undefined}>
        {journalPages.map((p) => (
          <Row key={p.id} label={p.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={draft.modules[p.id] ?? p.id}
                aria-label={p.title}
                onChange={(e) => {
                  setSaved(false)
                  setDraft((d) => ({ ...d, modules: { ...d.modules, [p.id]: e.target.value } }))
                }}
                spellCheck={false}
                style={field(false)}
              />
              <code style={sampleCode}>{toPath({ area: 'public', screen: 'module', moduleId: p.id }, draft)}</code>
            </div>
          </Row>
        ))}
      </Section>
    </div>
  )
}
