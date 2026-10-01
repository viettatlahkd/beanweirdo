import { useEffect, useState, type CSSProperties } from 'react'
import {
  createKeyword,
  listKeywords,
  listTags,
  listTopics,
  type Keyword,
  type Module,
  type PostDetail,
  type PostVisibility,
  type Tag,
  type Topic,
} from '../lib/apiClient'
import { ink, paper, sans } from '../../design/tokens'

/**
 * Where a post sits in the content layer (migration 0027), editable after the
 * post exists: its topic, theme tags, dạng bài, the module it is still listed
 * under, who may read it, and its address.
 *
 * Everything but the address goes through the editor's own patch, so it saves
 * and undoes like any other field. The address does not: the server can refuse
 * it (taken, or still forwarding to another post), and that answer has to come
 * back to this row.
 */
export type PlacementPatch = Partial<{
  topic_id: string | null
  visibility: PostVisibility
  module_id: string
  kind: string
  keywords: string[]
}>

const select: CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 12,
  color: ink.strong,
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  padding: '3px 8px',
}

const label: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }

/** Subjects in order, each followed by its topics — the tree as one list. */
export function topicOptions(topics: readonly Topic[]): { subject: Topic; children: Topic[] }[] {
  const byOrder = [...topics].sort((a, b) => a.sort_order - b.sort_order)
  return byOrder
    .filter((t) => t.parent_id === null)
    .map((subject) => ({ subject, children: byOrder.filter((t) => t.parent_id === subject.id) }))
}

export function PostPlacement({
  post,
  modules,
  derivedSlug,
  onPatch,
  onSlug,
}: {
  post: PostDetail
  modules: Module[]
  /** The address the post is reached at while nothing is stored. */
  derivedSlug: string
  onPatch: (patch: PlacementPatch) => void
  /** Resolves to an error message, or null when the address was taken. */
  onSlug: (slug: string) => Promise<string | null>
}) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [slugError, setSlugError] = useState<string | null>(null)

  useEffect(() => {
    void listTopics().then(setTopics)
    void listKeywords().then(setKeywords)
    void listTags().then(setTags)
  }, [])

  const wearing = post.keywords ?? []
  const labelOf = (id: string) => keywords.find((k) => k.id === id)?.label ?? id

  async function addKeyword(text: string) {
    const v = text.trim()
    if (!v) return
    const known = keywords.find((k) => k.label.toLowerCase() === v.toLowerCase() || k.id === v)
    const kw = known ?? (await createKeyword(v))
    if (!known) setKeywords((ks) => [...ks, kw])
    if (!wearing.includes(kw.id)) onPatch({ keywords: [...wearing, kw.id] })
  }

  async function commitSlug(value: string) {
    const v = value.trim()
    if (!v || v === (post.slug ?? derivedSlug)) return setSlugError(null)
    setSlugError(await onSlug(v))
  }

  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', fontFamily: sans, fontSize: 12, color: ink.muted, marginBottom: 12 }}
    >
      <label style={label}>
        Chủ đề
        <select
          aria-label="Chủ đề"
          value={post.topic_id ?? ''}
          onChange={(e) => onPatch({ topic_id: e.target.value || null })}
          style={select}
        >
          {!post.topic_id && <option value="">—</option>}
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
      </label>

      <span style={label}>
        Tag
        {wearing.map((id) => (
          <span key={id} style={{ background: paper.hover, color: ink.strong, padding: '2px 4px 2px 8px', display: 'inline-flex', gap: 4 }}>
            {labelOf(id)}
            <button
              type="button"
              aria-label={`bỏ tag ${labelOf(id)}`}
              onClick={() => onPatch({ keywords: wearing.filter((k) => k !== id) })}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: ink.muted, padding: '0 2px' }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          aria-label="Thêm tag"
          list="post-keywords"
          placeholder="+ tag"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            const el = e.currentTarget
            void addKeyword(el.value)
            el.value = ''
          }}
          style={{ ...select, width: 110 }}
        />
        <datalist id="post-keywords">
          {keywords.filter((k) => !wearing.includes(k.id)).map((k) => (
            <option key={k.id} value={k.label} />
          ))}
        </datalist>
      </span>

      <label style={label}>
        Dạng bài
        <select aria-label="Dạng bài" value={post.kind} onChange={(e) => onPatch({ kind: e.target.value })} style={select}>
          {!tags.some((t) => t.id === post.kind) && <option value={post.kind}>{post.kind}</option>}
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label style={label}>
        Module
        <select aria-label="Module" value={post.module_id} onChange={(e) => onPatch({ module_id: e.target.value })} style={select}>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </label>

      <label style={label}>
        Quyền xem
        <select
          aria-label="Quyền xem"
          value={post.visibility}
          onChange={(e) => onPatch({ visibility: e.target.value as PostVisibility })}
          style={select}
        >
          <option value="public">công khai</option>
          <option value="private">riêng tư</option>
        </select>
      </label>

      <label style={label}>
        Địa chỉ
        <input
          aria-label="Địa chỉ"
          key={post.slug ?? derivedSlug}
          defaultValue={post.slug ?? ''}
          placeholder={derivedSlug}
          onBlur={(e) => void commitSlug(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.currentTarget.value = post.slug ?? ''
              setSlugError(null)
            }
          }}
          style={{ ...select, width: 230 }}
        />
        {slugError && (
          <span role="alert" style={{ color: '#8E1E42' }}>
            {slugError}
          </span>
        )}
      </label>
    </div>
  )
}
