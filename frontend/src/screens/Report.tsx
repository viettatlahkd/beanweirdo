import { useRef, useState, type CSSProperties } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import {
  BLOCK_MENU,
  SAMPLE_BLOCKS,
  SAMPLE_MEMOS,
  SAMPLE_NOTES,
  blankBlock,
  type ReportBlock,
  type ReportBlockType,
  type ReportMemo,
  type ReportNote,
} from '../content/report'
import { useModules } from '../data/useModules'
import { ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav } from '../lib/nav'

/** The report's own accent — cool blue, distinct from the module hues. */
const BLUE = '#6FA8C0'

const editable = (extra: CSSProperties): CSSProperties => ({ outline: 'none', ...extra })

let nextId = Date.now()
const rid = () => nextId++

/**
 * Field report — the process template.
 *
 * A wide column of typed blocks (text, metrics, chart, table, image) that are
 * all edited in place, and a narrow rail of notes. The divider between the two
 * is draggable, and the rail runs in two modes: Explorations stack top-down,
 * Memo notes pin beside the block they question.
 */
export function Report() {
  const nav = useNav()
  const { data: modules } = useModules()
  const [blocks, setBlocks] = useState<ReportBlock[]>(SAMPLE_BLOCKS)
  const [notes, setNotes] = useState<ReportNote[]>(SAMPLE_NOTES)
  const [memos, setMemos] = useState<ReportMemo[]>(SAMPLE_MEMOS)
  const [selected, setSelected] = useState<number | null>(null)
  const [noteMode, setNoteMode] = useState<'explore' | 'memo'>('explore')
  /** Main column width, in percent. Dragged, so it lives in state not props. */
  const [split, setSplit] = useState(68)
  const [dragging, setDragging] = useState(false)
  const host = useRef<HTMLDivElement | null>(null)

  const fromModule = nav.reportFrom === 'module'
  const roasting = modules.find((m) => m.id === 'roasting')
  const bandBg = fromModule ? (roasting?.accent ?? BLUE) : BLUE
  const bandFg = fromModule ? (roasting?.on_color ?? '#0E2C38') : '#0E2C38'

  const patch = (id: number, p: Partial<ReportBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)))

  function insertAfter(id: number, t: ReportBlockType) {
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id)
      const out = bs.slice()
      out.splice(i < 0 ? out.length : i + 1, 0, blankBlock(rid(), t))
      return out
    })
    setSelected(null)
  }

  /** Drag the divider. Clamped so neither column can collapse. */
  function grabSplit() {
    const move = (e: MouseEvent) => {
      const r = host.current?.getBoundingClientRect()
      if (!r) return
      setSplit(Math.round(Math.min(82, Math.max(45, ((e.clientX - r.left) / r.width) * 100))))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      setDragging(false)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    setDragging(true)
  }

  /** Drag a table's column divider — the two neighbours trade width. */
  function grabCol(b: ReportBlock, ci: number, e: React.MouseEvent<HTMLDivElement>) {
    const table = (e.currentTarget as HTMLElement).closest('table')
    if (!table) return
    const total = table.getBoundingClientRect().width
    const n = (b.th ?? []).length
    const base = (b.cols ?? (b.th ?? []).map(() => 100 / n)).slice()
    const x0 = e.clientX
    const move = (ev: MouseEvent) => {
      const d = ((ev.clientX - x0) / total) * 100
      const a = Math.max(8, base[ci] + d)
      const bb = Math.max(8, base[ci + 1] - d)
      if (a + bb !== base[ci] + base[ci + 1]) return
      const cols = base.slice()
      cols[ci] = a
      cols[ci + 1] = bb
      patch(b.id, { cols })
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    e.preventDefault()
  }

  function grabRow(b: ReportBlock, ri: number, e: React.MouseEvent<HTMLDivElement>) {
    const rows = (b.rowH ?? (b.tr ?? []).map(() => 40)).slice()
    const y0 = e.clientY
    const h0 = rows[ri]
    const move = (ev: MouseEvent) => {
      const rh = rows.slice()
      rh[ri] = Math.max(30, Math.round(h0 + (ev.clientY - y0)))
      patch(b.id, { rowH: rh })
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    e.preventDefault()
  }

  const memoWidth = `calc(${Math.round(((100 - split) / split) * 1000) / 10}% - 10px)`

  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: bandBg, color: bandFg, padding: '40px 56px 34px' }}>
        <Breadcrumbs style={{ marginBottom: 22, opacity: 0.85 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 44,
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: 70,
              lineHeight: 0.9,
              letterSpacing: '-.04em',
              margin: 0,
            }}
          >
            {fromModule ? 'Heat Transfer' : 'Ghi hiện trường'}
          </h1>
          <div
            style={{ fontFamily: sans, fontWeight: 300, fontSize: 13, lineHeight: 1.5, maxWidth: 330, opacity: 0.85 }}
          >
            {fromModule
              ? 'Ba đường nhiệt đi vào hạt: dẫn, đối lưu, bức xạ. Ghi lại số liệu từng mẻ và những gì đọc được từ đó.'
              : 'Mẫu cho tiến trình rang, pha hoặc lên men. Bấm vào bất cứ dòng nào để sửa, dùng dấu + để thêm khối, kéo vạch giữa hai cột để đổi tỉ lệ.'}
          </div>
        </div>
      </div>

      <div
        ref={host}
        style={{ display: 'flex', alignItems: 'stretch', padding: '0 56px 140px', maxWidth: 1320 }}
      >
        <div style={{ width: `${split}%`, minWidth: 0, padding: '34px 0 0' }}>
          {blocks.map((b, bi) => (
            <div key={b.id} style={{ position: 'relative', paddingRight: 34 }}>
              {b.t === 'meta' && (
                <Hover
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => patch(b.id, { v: e.currentTarget.innerText })}
                  style={editable({
                    fontFamily: sans,
                    fontSize: 10.5,
                    letterSpacing: '.18em',
                    textTransform: 'uppercase',
                    color: '#8A8A7C',
                    padding: '4px 6px',
                    margin: '0 -6px 18px',
                  })}
                  hoverStyle={{ background: '#F5F2E4' }}
                >
                  {b.v}
                </Hover>
              )}

              {b.t === 'h' && (
                <Hover
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => patch(b.id, { v: e.currentTarget.innerText })}
                  style={editable({
                    fontFamily: serif,
                    fontSize: 34,
                    lineHeight: 1.08,
                    letterSpacing: '-.03em',
                    color: '#172124',
                    padding: '4px 6px',
                    margin: '26px -6px 14px',
                  })}
                  hoverStyle={{ background: '#F5F2E4' }}
                >
                  {b.v}
                </Hover>
              )}

              {b.t === 'p' && (
                <Hover
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => patch(b.id, { v: e.currentTarget.innerText })}
                  style={editable({
                    fontFamily: sans,
                    fontWeight: 300,
                    fontSize: 15.5,
                    lineHeight: 1.55,
                    color: ink.strong,
                    padding: '5px 6px',
                    margin: '0 -6px 20px',
                    maxWidth: 660,
                  })}
                  hoverStyle={{ background: '#F5F2E4' }}
                >
                  {b.v}
                </Hover>
              )}

              {b.t === 'metrics' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))',
                    gap: 1,
                    background: '#E6E2D2',
                    margin: '0 0 24px',
                  }}
                >
                  {(b.m ?? []).map((x, mi) => (
                    <div key={mi} style={{ background: paper.white, padding: '13px 14px 14px' }}>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const m = (b.m ?? []).map((y) => ({ ...y }))
                          m[mi].k = e.currentTarget.innerText
                          patch(b.id, { m })
                        }}
                        style={editable({
                          fontFamily: sans,
                          fontSize: 9.5,
                          fontWeight: 500,
                          letterSpacing: '.16em',
                          textTransform: 'uppercase',
                          color: '#8A8A7C',
                          marginBottom: 7,
                        })}
                      >
                        {x.k}
                      </div>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const m = (b.m ?? []).map((y) => ({ ...y }))
                          m[mi].v = e.currentTarget.innerText
                          patch(b.id, { m })
                        }}
                        style={editable({
                          fontFamily: serif,
                          fontSize: 26,
                          lineHeight: 1,
                          letterSpacing: '-.02em',
                          color: '#172124',
                          fontVariantNumeric: 'tabular-nums',
                        })}
                      >
                        {x.v}
                      </div>
                    </div>
                  ))}
                  <Hover
                    onClick={() => patch(b.id, { m: (b.m ?? []).concat([{ k: 'Chỉ số', v: '—' }]) })}
                    style={{
                      background: paper.white,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      color: '#C4C1B2',
                      cursor: 'pointer',
                    }}
                    hoverStyle={{ color: BLUE }}
                  >
                    +
                  </Hover>
                </div>
              )}

              {b.t === 'chart' && (
                <div
                  style={{
                    margin: '0 0 26px',
                    borderLeft: '1px solid #DDD9C8',
                    borderBottom: '1px solid #DDD9C8',
                    padding: '0 0 0 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 168 }}>
                    {(b.c ?? []).map((p, i) => {
                      const max = Math.max(...(b.c ?? []).map((x) => x.v), 1)
                      return (
                        <div
                          key={i}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
                        >
                          <div style={{ height: `${Math.max(3, Math.round((p.v / max) * 100))}%`, background: BLUE }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
                    {(b.c ?? []).map((p, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontFamily: sans,
                          fontSize: 9.5,
                          color: '#8A8A7C',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {p.l}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {b.t === 'table' && (
                <div style={{ margin: '0 0 26px' }}>
                  <table
                    style={{
                      borderCollapse: 'collapse',
                      width: '100%',
                      tableLayout: 'fixed',
                      fontFamily: sans,
                    }}
                  >
                    <colgroup>
                      {(b.cols ?? (b.th ?? []).map(() => 100 / Math.max(1, (b.th ?? []).length))).map((w, i) => (
                        <col key={i} style={{ width: `${w}%` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        {(b.th ?? []).map((h, ci) => (
                          <th
                            key={ci}
                            style={{
                              textAlign: 'left',
                              padding: 0,
                              borderBottom: `1px solid ${ink.base}`,
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 10px 8px' }}>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const th = (b.th ?? []).slice()
                                  th[ci] = e.currentTarget.innerText
                                  patch(b.id, { th })
                                }}
                                style={editable({
                                  flex: 1,
                                  minWidth: 0,
                                  fontWeight: 500,
                                  fontSize: 9.5,
                                  letterSpacing: '.16em',
                                  textTransform: 'uppercase',
                                  color: BLUE,
                                })}
                              >
                                {h}
                              </div>
                              {ci === (b.th ?? []).length - 1 && (
                                <Hover
                                  onClick={() =>
                                    patch(b.id, {
                                      th: (b.th ?? []).concat([`Cột ${(b.th ?? []).length + 1}`]),
                                      tr: (b.tr ?? []).map((r) => r.concat([''])),
                                    })
                                  }
                                  style={{
                                    flex: 'none',
                                    fontFamily: sans,
                                    fontWeight: 400,
                                    fontSize: 10,
                                    letterSpacing: '.04em',
                                    textTransform: 'none',
                                    color: '#C4C1B2',
                                    cursor: 'pointer',
                                  }}
                                  hoverStyle={{ color: BLUE }}
                                >
                                  + cột
                                </Hover>
                              )}
                            </div>
                            {ci < (b.th ?? []).length - 1 && (
                              <div
                                onMouseDown={(e) => grabCol(b, ci, e)}
                                title="kéo để đổi bề rộng cột"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  right: -3,
                                  bottom: 0,
                                  width: 7,
                                  cursor: 'col-resize',
                                  zIndex: 5,
                                }}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(b.tr ?? []).map((rowCells, ri) => (
                        <tr key={ri} style={{ height: `${(b.rowH ?? [])[ri] || 40}px` }}>
                          {rowCells.map((cell, ci) => (
                            <td
                              key={ci}
                              style={{
                                padding: 0,
                                borderBottom: `1px solid ${paper.rule}`,
                                verticalAlign: 'top',
                                position: 'relative',
                              }}
                            >
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const tr = (b.tr ?? []).map((r) => r.slice())
                                  tr[ri][ci] = e.currentTarget.innerText
                                  patch(b.id, { tr })
                                }}
                                style={editable({
                                  fontWeight: 300,
                                  fontSize: 14,
                                  lineHeight: 1.45,
                                  color: ink.strong,
                                  padding: 10,
                                  overflowWrap: 'break-word',
                                })}
                              >
                                {cell}
                              </div>
                              {ci === 0 && (
                                <div
                                  onMouseDown={(e) => grabRow(b, ri, e)}
                                  title="kéo để đổi chiều cao dòng"
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    bottom: -3,
                                    height: 7,
                                    cursor: 'row-resize',
                                    zIndex: 5,
                                  }}
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Hover
                    onClick={() => patch(b.id, { tr: (b.tr ?? []).concat([(b.th ?? []).map(() => '')]) })}
                    style={{
                      padding: '8px 10px 0',
                      fontFamily: sans,
                      fontSize: 11,
                      color: '#C4C1B2',
                      cursor: 'pointer',
                      width: 'fit-content',
                    }}
                    hoverStyle={{ color: BLUE }}
                  >
                    + dòng
                  </Hover>
                </div>
              )}

              {b.t === 'image' && (
                <div
                  style={{
                    height: 250,
                    background: '#E9F1F4',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 14,
                    margin: '0 0 26px',
                  }}
                >
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => patch(b.id, { v: e.currentTarget.innerText })}
                    style={editable({ fontFamily: sans, fontSize: 10, color: '#4B6873' })}
                  >
                    {b.v}
                  </div>
                </div>
              )}

              {noteMode === 'memo' && (
                <div style={{ position: 'absolute', left: 'calc(100% + 22px)', top: 0, width: memoWidth }}>
                  {memos
                    .filter((m) => m.at === bi)
                    .map((m) => (
                      <div
                        key={m.id}
                        style={{
                          position: 'relative',
                          marginBottom: 12,
                          paddingLeft: 11,
                          borderLeft: `2px solid ${BLUE}`,
                          paddingRight: 14,
                        }}
                      >
                        <Hover
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const v = e.currentTarget.innerText
                            setMemos((ms) => ms.map((x) => (x.id === m.id ? { ...x, v } : x)))
                          }}
                          style={editable({
                            fontFamily: sans,
                            fontWeight: 300,
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            color: ink.mid,
                            padding: '2px 4px',
                            marginLeft: -4,
                          })}
                          hoverStyle={{ background: '#F5F2E4' }}
                        >
                          {m.v}
                        </Hover>
                        <Hover
                          onClick={() => setMemos((ms) => ms.filter((x) => x.id !== m.id))}
                          style={{ position: 'absolute', right: 0, top: 1, fontSize: 10, color: '#DAD7C7', cursor: 'pointer' }}
                          hoverStyle={{ color: '#C25C7C' }}
                        >
                          ✕
                        </Hover>
                      </div>
                    ))}
                  <Hover
                    onClick={() => setMemos((ms) => ms.concat([{ id: rid(), at: bi, v: '' }]))}
                    style={{ fontFamily: sans, fontSize: 11, color: '#E0DDCC', cursor: 'pointer', paddingLeft: 13 }}
                    hoverStyle={{ color: BLUE }}
                  >
                    + memo
                  </Hover>
                </div>
              )}

              <Hover
                onClick={() => setSelected((s) => (s === b.id ? null : b.id))}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 6,
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: '#D2CFBF',
                  cursor: 'pointer',
                }}
                hoverStyle={{ color: BLUE }}
              >
                +
              </Hover>
              {selected === b.id && (
                <div
                  style={{
                    position: 'absolute',
                    right: 24,
                    top: 2,
                    zIndex: 20,
                    background: paper.white,
                    border: '1px solid #E6E2D2',
                    boxShadow: '0 12px 30px -18px rgba(23,33,36,.5)',
                    padding: '5px 0',
                    minWidth: 126,
                  }}
                >
                  {BLOCK_MENU.map((mi) => (
                    <Hover
                      key={mi.label}
                      onClick={() => insertAfter(b.id, mi.t)}
                      style={{ fontFamily: sans, fontSize: 12.5, padding: '7px 14px', cursor: 'pointer', color: ink.strong }}
                      hoverStyle={{ background: '#EDF4F7', color: '#26606F' }}
                    >
                      {mi.label}
                    </Hover>
                  ))}
                  <Hover
                    onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}
                    style={{
                      fontFamily: sans,
                      fontSize: 12.5,
                      padding: '7px 14px',
                      cursor: 'pointer',
                      color: '#A2A296',
                      borderTop: `1px solid ${paper.rule}`,
                      marginTop: 4,
                    }}
                    hoverStyle={{ color: '#C25C7C' }}
                  >
                    xoá khối
                  </Hover>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          onMouseDown={grabSplit}
          title="kéo để đổi tỉ lệ cột"
          style={{ width: 11, flex: 'none', cursor: 'col-resize', display: 'flex', justifyContent: 'center', padding: '34px 0 0' }}
        >
          <div style={{ width: 1, background: dragging ? '#F2A0A5' : '#E6E6DE' }} />
        </div>

        <div style={{ width: `${100 - split}%`, minWidth: 0, padding: '34px 0 0 22px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${ink.base}`,
              paddingBottom: 9,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 16,
                fontFamily: sans,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
              }}
            >
              <div
                onClick={() => setNoteMode('explore')}
                style={{ cursor: 'pointer', color: noteMode === 'explore' ? '#26606F' : '#C4C1B2' }}
              >
                Explorations
              </div>
              <div
                onClick={() => setNoteMode('memo')}
                style={{ cursor: 'pointer', color: noteMode === 'memo' ? '#26606F' : '#C4C1B2' }}
              >
                Memo notes
              </div>
            </div>
            <div style={{ fontFamily: sans, fontSize: 9.5, color: '#C4C1B2', fontVariantNumeric: 'tabular-nums' }}>
              {split} / {100 - split}
            </div>
          </div>

          {noteMode === 'memo' ? (
            <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 12.5, lineHeight: 1.5, color: '#A2A296' }}>
              Memo nằm rải theo từng khối trong bài — bấm “+ memo” cạnh khối cần hỏi.
            </div>
          ) : (
            <>
              {notes.map((n) => (
                <div
                  key={n.id}
                  style={{ position: 'relative', marginBottom: 16, paddingLeft: 12, borderLeft: `2px solid ${BLUE}` }}
                >
                  <Hover
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const v = e.currentTarget.innerText
                      setNotes((ns) => ns.map((x) => (x.id === n.id ? { ...x, v } : x)))
                    }}
                    style={editable({
                      fontFamily: sans,
                      fontWeight: 300,
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      color: ink.mid,
                      padding: '2px 4px',
                      marginLeft: -4,
                    })}
                    hoverStyle={{ background: '#F5F2E4' }}
                  >
                    {n.v}
                  </Hover>
                  <Hover
                    onClick={() => setNotes((ns) => ns.filter((x) => x.id !== n.id))}
                    style={{ position: 'absolute', right: 0, top: 0, fontSize: 11, color: '#DAD7C7', cursor: 'pointer' }}
                    hoverStyle={{ color: '#C25C7C' }}
                  >
                    ✕
                  </Hover>
                </div>
              ))}
              <Hover
                onClick={() => setNotes((ns) => ns.concat([{ id: rid(), v: '' }]))}
                style={{ fontFamily: sans, fontSize: 12, color: '#C4C1B2', cursor: 'pointer', padding: '4px 0' }}
                hoverStyle={{ color: BLUE }}
              >
                + ghi chú
              </Hover>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
