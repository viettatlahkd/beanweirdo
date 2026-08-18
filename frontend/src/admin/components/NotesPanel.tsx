import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { noteKinds, noteLengths, type Note } from '../../content/notes'
import { useNotes } from '../../data/useNotes'
import { ink, paper, sans, serif } from '../../design/tokens'
import { Hover } from '../../lib/Hover'

const control: CSSProperties = {
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 12.5,
  padding: '6px 9px',
  outline: 'none',
}

const field: CSSProperties = {
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

const smallLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: ink.faint,
  marginBottom: 6,
}

/**
 * Content management's notes tab — where Ghi 01 is written.
 *
 * Editing used to happen on the public page itself, which put a "+ Ghi chú mới"
 * button in front of anyone who happened to be signed in while reading, and
 * left the site with two different places to manage content. Writing lives
 * here with the posts now; the public page is a public page.
 */
export function NotesPanel() {
  const { notes, loading, error, add, patch, remove } = useNotes()
  const [openId, setOpenId] = useState<string | null>(null)
  const [pinnedFirst, setPinnedFirst] = useState<Note[]>([])

  useEffect(() => {
    setPinnedFirst(notes)
  }, [notes])

  const create = useCallback(async () => {
    const saved = await add()
    if (saved) setOpenId(saved.id)
  }, [add])

  if (loading) return <div style={{ fontFamily: sans, fontSize: 13, color: ink.muted }}>Đang tải…</div>

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          borderBottom: `2px solid ${ink.base}`,
          paddingBottom: 9,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: ink.muted,
          }}
        >
          Ghi 01 — {notes.length} ghi chú
        </div>
        <div
          onClick={() => void create()}
          style={{
            fontFamily: sans,
            fontSize: 11,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            background: ink.base,
            color: paper.cream,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          + ghi chú mới
        </div>
      </div>

      {error && <div style={{ color: '#8E1E42', fontSize: 12.5, padding: '10px 0' }}>{error}</div>}

      {pinnedFirst.length === 0 && (
        <div style={{ fontFamily: sans, fontSize: 13, color: ink.faint, padding: '40px 0', textAlign: 'center' }}>
          Chưa có ghi chú nào.
        </div>
      )}

      {pinnedFirst.map((n) => {
        const open = openId === n.id
        return (
          <div key={n.id} style={{ borderBottom: '1px solid #F0EBDB', padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 13 }}>
              <Hover
                onClick={() => void patch(n.id, { pinned: !n.pinned })}
                title={n.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                style={{ fontSize: 13, cursor: 'pointer', width: 18, flex: 'none', opacity: n.pinned ? 1 : 0.25 }}
                hoverStyle={{ opacity: 1 }}
              >
                📌
              </Hover>
              <div
                onClick={() => setOpenId(open ? null : n.id)}
                style={{ fontFamily: sans, fontSize: 12, color: ink.muted, cursor: 'pointer', width: 14, flex: 'none' }}
              >
                {open ? '▾' : '▸'}
              </div>
              <div
                onClick={() => setOpenId(open ? null : n.id)}
                style={{
                  fontFamily: serif,
                  fontSize: 21,
                  lineHeight: 1.15,
                  flex: 1,
                  minWidth: 0,
                  cursor: 'pointer',
                  color: n.t ? ink.base : ink.faint,
                }}
              >
                {n.t || '(chưa đặt tên)'}
              </div>
              <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint, flex: 'none' }}>
                {n.template === 'memo' ? 'memo' : n.k} · {n.d}
              </div>
              <Hover
                onClick={() => void remove(n.id)}
                style={{ fontFamily: sans, fontSize: 12, color: ink.faint, cursor: 'pointer', flex: 'none' }}
                hoverStyle={{ color: '#C25C7C' }}
              >
                ✕
              </Hover>
            </div>

            {open && (
              <div style={{ padding: '14px 0 6px 45px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={smallLabel}>Tiêu đề</div>
                  <input defaultValue={n.t} onBlur={(e) => void patch(n.id, { t: e.target.value })} style={field} />
                </div>
                <div>
                  <div style={smallLabel}>Nội dung</div>
                  <textarea
                    defaultValue={n.b}
                    onBlur={(e) => void patch(n.id, { b: e.target.value })}
                    rows={5}
                    style={{ ...field, fontWeight: 300, lineHeight: 1.55, resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    defaultValue={n.d}
                    onBlur={(e) => void patch(n.id, { d: e.target.value })}
                    style={{ ...control, width: 150 }}
                  />
                  <select
                    value={n.k}
                    onChange={(e) => void patch(n.id, { k: e.target.value as Note['k'] })}
                    style={control}
                  >
                    {noteKinds.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <select
                    value={n.len}
                    onChange={(e) => void patch(n.id, { len: e.target.value as Note['len'] })}
                    style={control}
                    title="Độ dài — quyết định cỡ tiêu đề và chỗ note chiếm trong lưới"
                  >
                    {noteLengths.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint }}>
                    {n.template === 'memo' ? 'khung memo — nội dung sửa trong DB' : 'khung ghi chú thường'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
