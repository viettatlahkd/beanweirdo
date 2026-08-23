import { useState, type CSSProperties } from 'react'
import { featureCells, withOverrides, type FeatureOverride } from '../../content/notes'
import { ink, paper, sans, serif } from '../../design/tokens'
import { Hover } from '../../lib/Hover'
import { coverStyle } from '../../lib/imageFocus'
import { FocusPicker } from './FocusPicker'

const groupLabel: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: ink.faint,
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: `1px solid ${paper.rule}`,
}

const rowBox: CSSProperties = {
  border: `1px solid ${paper.rule}`,
  background: paper.white,
  padding: 10,
  display: 'grid',
  gridTemplateColumns: '72px minmax(0,1fr)',
  gap: 12,
  alignItems: 'center',
}

const textInput: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 12.5,
  padding: '6px 9px',
  outline: 'none',
}

const action: CSSProperties = {
  fontFamily: sans,
  fontSize: 10.5,
  color: ink.green,
  cursor: 'pointer',
}

const cellName: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: ink.soft,
  marginBottom: 5,
}

/**
 * Ghi 01's feature cells — F1…F7, the images and words woven between the posts.
 *
 * They carry their own numbering on purpose: F3 is the third *cell*, unrelated
 * to the third post, because the two are different kinds of thing sharing one
 * grid. Only the picture and the words are editable; where a cell sits and how
 * tall it stands belong to `content/notes.ts`, since the batch layout only
 * holds together if the geometry stays put.
 *
 * The count cell has nothing to edit — it prints how many notes are showing.
 */
export function FeatureCellsEditor({
  overrides,
  onChange,
  onUpload,
}: {
  overrides: FeatureOverride[]
  onChange: (next: FeatureOverride[]) => void
  /** Uploads and returns the stored URL, so the frame can be set straight away. */
  onUpload: (n: number, f: File) => Promise<string | null>
}) {
  const drawn = withOverrides(featureCells, overrides)
  const [placing, setPlacing] = useState<{ n: number; url: string; ratio: number; name: string } | null>(null)

  /**
   * A feature cell's shape, from the design's own numbers: `col` is a span of
   * the twelve-column grid the page lays out at 1128px wide, and `h` is a fixed
   * height. Nothing measures here because nothing moves — the geometry is the
   * drawing, and the drawing is fixed.
   */
  const ratioOf = (col: string, h: string): number => {
    const span = Number(/span (\d+)/.exec(col)?.[1] ?? 3)
    const width = ((1128 - 20 * 11) / 12) * span + 20 * (span - 1)
    const height = Number.parseFloat(h) || 240
    return width / height
  }


  const set = (n: number, patch: Partial<FeatureOverride>) => {
    const rest = overrides.filter((o) => o.n !== n)
    const current = overrides.find((o) => o.n === n) ?? { n }
    onChange([...rest, { ...current, ...patch }].sort((a, b) => a.n - b.n))
  }

  return (
    <div style={{ marginTop: 22 }}>
      <div style={groupLabel}>Ảnh feature dọc trang</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
          gap: 12,
        }}
      >
        {drawn.map((f) => {
          if (f.kind === 'count') {
            return (
              <div key={f.n} style={{ ...rowBox, opacity: 0.6 }}>
                <div
                  style={{
                    width: 72,
                    height: 45,
                    border: `1px solid ${paper.rule}`,
                    background: paper.hover,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: serif,
                    fontSize: 22,
                    color: ink.faint,
                  }}
                >
                  12
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={cellName}>F{f.n} · số đếm</div>
                  <div style={{ fontFamily: sans, fontSize: 11.5, color: ink.faint }}>
                    tự đếm số ghi chép đang hiện
                  </div>
                </div>
              </div>
            )
          }

          if (f.kind === 'quote') {
            return (
              <div key={f.n} style={rowBox}>
                <div
                  style={{
                    width: 72,
                    height: 45,
                    border: `1px solid ${paper.rule}`,
                    background: paper.cream,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: serif,
                    fontStyle: 'italic',
                    fontSize: 20,
                    color: ink.base,
                  }}
                >
                  “”
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={cellName}>F{f.n} · câu trích</div>
                  <input
                    defaultValue={f.t}
                    onBlur={(e) => set(f.n, { t: e.target.value })}
                    placeholder="câu trích"
                    style={textInput}
                  />
                </div>
              </div>
            )
          }

          return (
            <div key={f.n} style={rowBox}>
              <div
                style={{
                  width: 72,
                  height: 45,
                  border: `1px solid ${paper.rule}`,
                  ...(f.img ? coverStyle(f.img) : { background: f.bg }),
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={cellName}>F{f.n} · ảnh</div>
                <input
                  defaultValue={f.t}
                  onBlur={(e) => set(f.n, { t: e.target.value })}
                  placeholder="chú thích"
                  style={textInput}
                />
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <Hover as="label" style={action} hoverStyle={{ color: ink.base }}>
                    {f.img ? 'đổi ảnh' : 'tải ảnh lên'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        void onUpload(f.n, file).then((next) => {
                          if (next)
                            setPlacing({
                              n: f.n,
                              url: next,
                              ratio: ratioOf(f.col, f.h),
                              name: `Ảnh feature · F${f.n}`,
                            })
                        })
                      }}
                      style={{ display: 'none' }}
                    />
                  </Hover>
                  {f.img && (
                    <Hover
                      as="button"
                      onClick={() =>
                        setPlacing({
                          n: f.n,
                          url: f.img!,
                          ratio: ratioOf(f.col, f.h),
                          name: `Ảnh feature · F${f.n}`,
                        })
                      }
                      style={{ ...action, background: 'none', border: 'none', padding: 0 }}
                      hoverStyle={{ color: ink.base }}
                    >
                      đặt vào khung
                    </Hover>
                  )}
                  {f.img && (
                    <Hover
                      as="button"
                      onClick={() => set(f.n, { img: null })}
                      style={{ ...action, background: 'none', border: 'none', padding: 0 }}
                      hoverStyle={{ color: '#C25C7C' }}
                    >
                      xoá
                    </Hover>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {placing && (
        <FocusPicker
          url={placing.url}
          ratio={placing.ratio}
          name={placing.name}
          onCancel={() => setPlacing(null)}
          onSave={(next) => {
            set(placing.n, { img: next })
            setPlacing(null)
          }}
        />
      )}
    </div>
  )
}
