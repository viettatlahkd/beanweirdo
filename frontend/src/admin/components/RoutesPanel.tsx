import { useMemo, useState } from 'react'
import { ink, paper, sans, serif, space } from '../../design/tokens'
import { buildSlug } from '../../lib/postSlug'
import { toPath } from '../../lib/routes'
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
import type { Module } from '../lib/apiClient'

/** Ô nào đứng cạnh ô nào, và cái gì chúng làm ra. */
type Block = {
  title: string
  keys: (keyof typeof WORD_LABELS)[]
  /** Địa chỉ mẫu, dựng bằng đúng bộ từ đang gõ. */
  sample: (w: RouteWords) => string
}

const BLOCKS: Block[] = [
  {
    title: 'Trang công khai',
    keys: ['index', 'notes', 'module', 'post', 'practice'],
    sample: (w) => toPath({ area: 'public', screen: 'module', moduleId: 'biochem' }, w),
  },
  {
    title: 'Khu quản trị',
    keys: ['admin'],
    sample: (w) => toPath({ area: 'admin', screen: 'cms' }, w),
  },
  {
    title: 'Trang con của khu quản trị',
    keys: ['adPost', 'adSitemap', 'adPageContent', 'adDesignSystem', 'adConvention', 'adTemplate', 'adArchive'],
    sample: (w) => toPath({ area: 'admin', screen: 'archive' }, w),
  },
  {
    title: 'Soạn bài',
    keys: ['create', 'edit', 'view'],
    sample: (w) => toPath({ area: 'admin', screen: 'postEdit', slug: buildSlug({ moduleId: 'ghi01', createdAt: '2026-08-24T09:00:00Z', status: 'published' }, w) }, w),
  },
  {
    title: 'Địa chỉ của một bài',
    keys: ['postMark', 'draftMark'],
    sample: (w) => `/${w.post}/${buildSlug({ moduleId: 'ghi01', createdAt: '2026-08-24T09:00:00Z', status: 'draft' }, w)}`,
  },
]

const label: React.CSSProperties = {
  fontFamily: sans,
  fontWeight: 300,
  fontSize: 12,
  color: ink.soft,
  minWidth: 168,
}

const field = (bad: boolean): React.CSSProperties => ({
  fontFamily: sans,
  fontSize: 13,
  color: ink.base,
  background: paper.white,
  border: `1px solid ${bad ? '#8E1E42' : paper.rule}`,
  borderRadius: 2,
  padding: '6px 9px',
  width: 170,
  outline: 'none',
})

/**
 * Các từ dùng để viết địa chỉ.
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
  modules,
  onSave,
}: {
  stored: StoredRoutes | undefined
  modules: Module[]
  onSave: (routes: StoredRoutes) => void | Promise<void>
}) {
  const live = useMemo(() => resolveWords(stored), [stored])
  const [draft, setDraft] = useState<RouteWords>(live)
  const [saved, setSaved] = useState(false)

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

  return (
    <div style={{ marginTop: space.section, borderTop: `2px solid ${ink.base}`, paddingTop: space.inner }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.inner }}>
        <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 30, letterSpacing: '-.02em', margin: 0 }}>
          Đường dẫn
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.gap }}>
          {saved && !changed && (
            <span style={{ fontFamily: sans, fontSize: 11.5, color: ink.muted }}>đã lưu</span>
          )}
          <button
            className="admin-btn-ghost"
            disabled={!changed || bad}
            onClick={save}
            style={{ opacity: !changed || bad ? 0.4 : 1 }}
          >
            Lưu đường dẫn
          </button>
        </div>
      </div>

      {BLOCKS.map((b) => (
        <div key={b.title} style={{ marginTop: space.inner + 6 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: space.inner,
              borderBottom: `1px solid ${paper.rule}`,
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: ink.soft,
              }}
            >
              {b.title}
            </div>
            <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: ink.green }}>
              {b.sample(draft)}
            </code>
          </div>

          {b.keys.map((k) => (
            <div key={k} style={{ padding: '9px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.gap }}>
                <div style={label}>{WORD_LABELS[k]}</div>
                <input
                  value={draft[k]}
                  aria-label={WORD_LABELS[k]}
                  onChange={(e) => set(k, e.target.value)}
                  spellCheck={false}
                  style={field(Boolean(errors[k]))}
                />
                {draft[k] !== DEFAULT_WORDS[k] && (
                  <button
                    className="admin-btn-ghost"
                    onClick={() => set(k, DEFAULT_WORDS[k])}
                    style={{ fontSize: 11 }}
                  >
                    {DEFAULT_WORDS[k]}
                  </button>
                )}
              </div>
              {errors[k] && (
                <div style={{ fontFamily: sans, fontSize: 11.5, color: '#8E1E42', marginTop: 4, marginLeft: 168 + space.gap }}>
                  {errors[k]}
                </div>
              )}
            </div>
          ))}

          {b.title === 'Địa chỉ của một bài' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: space.gap, padding: '9px 0 0' }}>
              <div style={label}>Thứ tự ngày</div>
              <select
                value={draft.dateOrder}
                aria-label="Thứ tự ngày"
                onChange={(e) => set('dateOrder', e.target.value as DateOrder)}
                style={{ ...field(false), width: 'auto' }}
              >
                {DATE_ORDERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: space.inner + 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: space.inner,
            borderBottom: `1px solid ${paper.rule}`,
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: ink.soft,
            }}
          >
            Tên module trong địa chỉ
          </div>
          {errors.modules && (
            <span style={{ fontFamily: sans, fontSize: 11.5, color: '#8E1E42' }}>{errors.modules}</span>
          )}
        </div>
        {modules.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: space.gap, padding: '9px 0 0' }}>
            <div style={label}>{m.title}</div>
            <input
              value={draft.modules[m.id] ?? m.id}
              aria-label={m.title}
              onChange={(e) => {
                setSaved(false)
                setDraft((d) => ({ ...d, modules: { ...d.modules, [m.id]: e.target.value } }))
              }}
              spellCheck={false}
              style={field(false)}
            />
            <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: ink.green }}>
              {toPath({ area: 'public', screen: 'module', moduleId: m.id }, draft)}
            </code>
          </div>
        ))}
      </div>
    </div>
  )
}
