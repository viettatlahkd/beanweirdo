import { useEffect, useState } from 'react'
import type { AuthorRef } from 'api-contract'
import { ink, sans } from '../../design/tokens'
import { IconGrip } from '../../design/icons'
import { PostHead } from '../../components/PostHead'
import { POST_FIELDS, postFields, type PostField, type StoredPostField } from '../../content/postHead'
import { listAuthorsCached } from '../lib/lists'
import { useRowDrag } from '../lib/useRowDrag'
import { Section, Switch, desk } from './Detail'

/**
 * Hiển thị › Nhãn bài viết (owner, 2026-10-17): the properties under every
 * post's title — which show, in what order, under what label. Each change is
 * written at once, as Thanh menu's are; the head below draws the draft.
 */
export function PostLabelsPanel({ stored, onSave }: { stored: StoredPostField[] | undefined; onSave: (fields: StoredPostField[]) => void }) {
  const [fields, setFields] = useState<PostField[]>(() => postFields(stored))
  const [author, setAuthor] = useState<AuthorRef | null>(null)
  useEffect(() => {
    void listAuthorsCached().then((a) => setAuthor(a[0] ?? null), () => setAuthor(null))
  }, [])

  const save = (next: PostField[]) => {
    setFields(next)
    onSave(next.map(({ key, label, shown }) => ({ key, label, shown })))
  }
  const drag = useRowDrag((from, to) => {
    const next = [...fields]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    save(next)
  })
  const defaultLabel = (key: string) => POST_FIELDS.find((f) => f.key === key)?.label ?? key

  return (
    <div style={{ padding: '6px 28px 130px', maxWidth: 1180 }}>
      <Section title="Các nhãn" tip="Kéo biểu tượng ⠿ để đổi thứ tự hiển thị. Nhãn để trống thì dùng tên mặc định.">
        <ol aria-label="Các nhãn" style={{ listStyle: 'none', margin: '-12px 0 0', padding: 0 }}>
          {fields.map((f, i) => (
            <li
              key={f.key}
              draggable
              onDragStart={() => drag.setFrom(i)}
              onDragOver={(e) => {
                e.preventDefault()
                drag.setOver(i)
              }}
              onDrop={() => drag.drop(i)}
              onDragEnd={drag.end}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px 24px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderTop: i ? `1px solid ${desk.line}` : 'none',
                boxShadow: drag.over === i && drag.from !== i ? `inset 0 ${drag.from !== null && drag.from < i ? -3 : 3}px 0 ${ink.green}` : 'none',
                opacity: drag.from === i ? 0.45 : 1,
              }}
            >
              <span className="ab-grip" aria-label={`Kéo ${f.label}`} style={{ cursor: 'grab' }}>
                <IconGrip size={14} />
              </span>
              <span aria-hidden style={{ fontFamily: sans, fontSize: 12.5, color: ink.soft, fontVariantNumeric: 'tabular-nums' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <input
                aria-label={`Nhãn ${defaultLabel(f.key)}`}
                key={f.label}
                defaultValue={f.label}
                placeholder={defaultLabel(f.key)}
                onBlur={(e) => {
                  const label = e.target.value.trim() || defaultLabel(f.key)
                  if (label !== f.label) save(fields.map((x) => (x.key === f.key ? { ...x, label } : x)))
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                style={{ maxWidth: 320 }}
              />
              <Switch label={`${f.label}: hiện`} value={f.shown} onChange={(shown) => save(fields.map((x) => (x.key === f.key ? { ...x, shown } : x)))} />
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Xem trước">
        <div style={{ padding: '8px 0 4px' }}>
          <PostHead
            title="Course Menu: Kinh tế châu Á"
            lead="Một bài mẫu, để xem các nhãn trên đầu bài."
            authors={author ? [author] : []}
            topic="tư duy tư duy"
            tags={[{ id: 'mau', label: 'kinh tế', color: '#9D9167' }]}
            shownOn={['blog']}
            publishedAt={new Date().toISOString()}
            minutes={9}
            template="longform"
            fields={fields}
          />
        </div>
      </Section>
    </div>
  )
}
