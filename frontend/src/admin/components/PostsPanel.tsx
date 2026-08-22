import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { PostCard } from './PostCard'
import {
  listPosts,
  updatePost,
  transitionStatus,
  type PostStatus,
  type PostSummary,
  type StatusAction,
} from '../lib/apiClient'
import { noteKinds, noteLengths, type Note } from '../../content/notes'
import { useNotes } from '../../data/useNotes'
import { ink, paper, sans, serif } from '../../design/tokens'
import { Hover } from '../../lib/Hover'
import { useNav } from '../../lib/nav'

const TABS: (PostStatus | 'all')[] = ['all', 'draft', 'published', 'archived', 'deleted']
// Distinct labels so filter buttons never collide with row-action names
// (e.g. the "published" filter vs the "Đăng" action).
const TAB_LABELS: Record<PostStatus | 'all', string> = {
  all: 'Tất cả',
  draft: 'Nháp',
  published: 'Đã đăng',
  archived: 'Lưu trữ',
  deleted: 'Thùng rác',
}

/**
 * Content management's first tab: everything written, in one list.
 *
 * Posts under modules and Ghi 01 notes sit together here. A note is a kind of
 * entry, not a separate thing to administer — giving it its own tab would mean
 * remembering which door leads to which kind of writing.
 *
 * A note has no draft/published life: it is on the page as soon as it exists.
 * So notes show under "Tất cả" and "Đã đăng", and the other filters are about
 * posts alone.
 */
const noteField: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 13.5,
  padding: '9px 12px',
  outline: 'none',
}

const noteControl: CSSProperties = { ...noteField, width: 'auto', fontSize: 12.5, padding: '6px 9px' }

/**
 * One Ghi 01 note in the list.
 *
 * It reads like a post row and expands into its own fields — a note is short
 * enough that opening it in place beats a separate editor screen, which is the
 * one way it differs from a post here.
 */
function NoteRow({
  note,
  open,
  onToggle,
  onPatch,
  onRemove,
}: {
  note: Note
  open: boolean
  onToggle: () => void
  onPatch: (patch: Partial<Omit<Note, 'id'>>) => void
  onRemove: () => void
}) {
  return (
    <div style={{ borderBottom: `1px solid ${paper.rule}`, padding: '14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 13 }}>
        <Hover
          onClick={() => onPatch({ pinned: !note.pinned })}
          title={note.pinned ? 'Bỏ ghim' : 'Ghim lên đầu Ghi 01'}
          style={{ fontSize: 12, cursor: 'pointer', width: 16, flex: 'none', opacity: note.pinned ? 1 : 0.25 }}
          hoverStyle={{ opacity: 1 }}
        >
          📌
        </Hover>
        <div
          onClick={onToggle}
          style={{ fontSize: 12, color: ink.muted, cursor: 'pointer', width: 14, flex: 'none' }}
        >
          {open ? '▾' : '▸'}
        </div>
        <div
          onClick={onToggle}
          style={{
            fontFamily: serif,
            fontSize: 20,
            lineHeight: 1.15,
            flex: 1,
            minWidth: 0,
            cursor: 'pointer',
            color: note.t ? ink.base : ink.faint,
          }}
        >
          {note.t || '(chưa đặt tên)'}
        </div>
        <div style={{ fontSize: 11, color: ink.faint, flex: 'none' }}>
          Ghi 01 · {note.template === 'memo' ? 'memo' : note.k} · {note.d}
        </div>
        <Hover
          onClick={onRemove}
          style={{ fontSize: 12, color: ink.faint, cursor: 'pointer', flex: 'none' }}
          hoverStyle={{ color: '#C25C7C' }}
        >
          ✕
        </Hover>
      </div>

      {open && (
        <div style={{ padding: '14px 0 4px 43px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input defaultValue={note.t} onBlur={(e) => onPatch({ t: e.target.value })} placeholder="Tiêu đề" style={noteField} />
          <textarea
            defaultValue={note.b}
            onBlur={(e) => onPatch({ b: e.target.value })}
            rows={4}
            placeholder="Nội dung"
            style={{ ...noteField, fontWeight: 300, lineHeight: 1.55, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <input type="date" defaultValue={note.d} onBlur={(e) => onPatch({ d: e.target.value })} style={{ ...noteControl, width: 150 }} />
            <select value={note.k} onChange={(e) => onPatch({ k: e.target.value as Note['k'] })} style={noteControl}>
              {noteKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={note.len}
              onChange={(e) => onPatch({ len: e.target.value as Note['len'] })}
              style={noteControl}
              title="Độ dài — quyết định cỡ tiêu đề và chỗ note chiếm trong lưới Ghi 01"
            >
              {noteLengths.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export function PostsPanel() {
  const nav = useNav()
  const { notes, add: addNote, patch: patchNote, remove: removeNote } = useNotes()
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<PostStatus | 'all'>('all')
  const [posts, setPosts] = useState<PostSummary[]>([])
  // Counts come from an unfiltered fetch so the stat row stays accurate no
  // matter which filter is active.
  const [allPosts, setAllPosts] = useState<PostSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setPosts(await listPosts(filter))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [filter])

  const loadCounts = useCallback(async () => {
    try {
      setAllPosts(await listPosts('all'))
    } catch {
      /* the stat row is decoration; the list's own error is enough */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  async function handleAction(id: string, action: StatusAction) {
    try {
      await transitionStatus(id, action)
      await Promise.all([load(), loadCounts()])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /**
   * Ghim, ngay tại danh sách. Bài ghim dẫn đầu module của nó, nên đổi một bài
   * là đổi thứ tự cả module — nạp lại danh sách sau khi ghi.
   */
  async function handlePin(id: string, pinned: boolean) {
    try {
      await updatePost(id, { pinned })
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // A note is live the moment it exists, so it belongs under these two.
  const showNotes = filter === 'all' || filter === 'published'

  const stats = [
    { n: allPosts.length, label: 'tổng' },
    { n: allPosts.filter((p) => p.status === 'draft').length, label: 'nháp' },
    { n: allPosts.filter((p) => p.status === 'published').length, label: 'đã đăng' },
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${paper.rule}`,
          marginBottom: 4,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            data-testid={`tab-${t}`}
            onClick={() => setFilter(t)}
            aria-pressed={filter === t}
            style={{
              fontSize: 11.5,
              padding: '14px 4px',
              marginRight: 26,
              color: filter === t ? ink.base : ink.muted,
              fontWeight: filter === t ? 500 : 400,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${filter === t ? ink.green : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'right' }}>
              <b style={{ fontSize: 15, display: 'block', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {s.n}
              </b>
              <span
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '.14em',
                  color: ink.faint,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
          <button
            onClick={() => void addNote().then((saved) => saved && setOpenNote(saved.id))}
            style={{
              fontSize: 11.5,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              border: `1px solid ${ink.base}`,
              cursor: 'pointer',
              background: 'transparent',
              color: ink.base,
              padding: '9px 16px',
              borderRadius: 4,
            }}
          >
            + Ghi chú
          </button>
          <button
            onClick={() => nav.newPost()}
            style={{
              fontSize: 11.5,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              background: ink.green,
              color: '#fff',
              padding: '9px 16px',
              borderRadius: 4,
            }}
          >
            + Bài mới
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: '#8E1E42', fontSize: 12.5, padding: '10px 0' }}>{error}</div>
      )}

      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onAction={handleAction}
          onEdit={(id) => nav.editPost(id)}
          onPin={handlePin}
        />
      ))}

      {showNotes &&
        notes.map((n) => (
          <NoteRow
            key={n.id}
            note={n}
            open={openNote === n.id}
            onToggle={() => setOpenNote(openNote === n.id ? null : n.id)}
            onPatch={(patch) => void patchNote(n.id, patch)}
            onRemove={() => void removeNote(n.id)}
          />
        ))}
      {posts.length === 0 && (!showNotes || notes.length === 0) && !error && (
        <div style={{ color: ink.faint, fontSize: 12.5, padding: '40px 0', textAlign: 'center' }}>
          Chưa có bài nào.
        </div>
      )}
    </div>
  )
}
