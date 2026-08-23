import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ImageBand } from '../../screens/Landing'
import { ink, paper, sans } from '../../design/tokens'
import { Hover } from '../../lib/Hover'
import type { ImageGroup, ModuleImageFields } from '../moduleForm'

/**
 * Width the public page gives the image band: the 1240px shell less its 56px
 * side padding. The preview renders at that width and is then scaled down, so
 * every cell keeps the proportions it will really have.
 */
const PAGE_WIDTH = 1240 - 56 * 2

const label: CSSProperties = {
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

const action: CSSProperties = {
  fontFamily: sans,
  fontSize: 10.5,
  color: ink.green,
  cursor: 'pointer',
}

/** Renders the real public layout at page scale, then shrinks it to fit. */
function Preview({ m, kind }: { m: ModuleImageFields; kind: ImageGroup['preview'] }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / PAGE_WIDTH)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const inner =
    kind === 'homepage-band' ? (
      <ImageBand m={m} />
    ) : (
      <NotesFooterPreview img1={m.img1} img2={m.img2} shot1={m.shot1} shot2={m.shot2} />
    )
  // 310px is the band's own height; the footer pair is 280px at its tallest.
  const tall = kind === 'homepage-band' ? 310 : 280

  return (
    <div
      ref={box}
      style={{
        border: `1px solid ${paper.rule}`,
        background: paper.white,
        padding: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: tall * scale, overflow: 'hidden' }}>
        <div
          style={{
            width: PAGE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {inner}
        </div>
      </div>
    </div>
  )
}

/** The two blocks that close Ghi 01, at the same 12-column rhythm as the page. */
function NotesFooterPreview({
  img1,
  img2,
  shot1,
  shot2,
}: {
  img1: string | null
  img2: string | null
  shot1: string | null
  shot2: string | null
}) {
  const cell = (img: string | null, tint: string, height: number, caption: string | null): CSSProperties => ({
    height,
    alignSelf: 'end',
    background: img ? `url(${img}) center/cover no-repeat` : tint,
    display: 'flex',
    alignItems: 'flex-end',
    padding: 14,
    fontFamily: sans,
    fontSize: 9.5,
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    color: img ? paper.cream : '#1F3A38',
    ...(caption && img ? { textShadow: '0 1px 2px rgba(0,0,0,.6)' } : null),
  })
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12,minmax(0,1fr))',
        gap: 20,
        height: 280,
        alignItems: 'end',
      }}
    >
      <div style={{ ...cell(img1, '#AFC8BC', 150, shot1), gridColumn: '6 / span 3' }}>{shot1}</div>
      <div style={{ ...cell(img2, '#E9B79C', 280, shot2), gridColumn: '9 / span 4' }}>{shot2}</div>
    </div>
  )
}

/**
 * The image editor: uploads on the left, the layout they land in on the right.
 *
 * The band's cells are fluid — their aspect ratios run from roughly 2:1 to 7:1
 * and move with the browser width — so there is no single ratio to ask for up
 * front. Showing the real layout is the only honest answer: upload, look, and
 * swap the photo if the crop loses what mattered.
 */
export function ModuleImages({
  m,
  group,
  onCaption,
  onUpload,
  onClear,
}: {
  m: ModuleImageFields
  group: ImageGroup
  onCaption: (slot: 1 | 2 | 3, v: string) => void
  onUpload: (slot: 1 | 2 | 3, f: File) => void
  onClear: (slot: 1 | 2 | 3) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr)',
        gap: 22,
        marginTop: 18,
      }}
    >
      <div>
        <div style={label}>{group.label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {group.slots.map((slot, i) => {
            const url = m[`img${slot}` as const]
            return (
              <div key={slot} style={rowBox}>
                <div
                  style={{
                    width: 72,
                    height: 45,
                    border: `1px solid ${paper.rule}`,
                    background: url ? `url(${url}) center/cover no-repeat` : paper.hover,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 10,
                      letterSpacing: '.14em',
                      textTransform: 'uppercase',
                      color: ink.soft,
                      marginBottom: 5,
                    }}
                  >
                    {group.names[i]}
                  </div>
                  <input
                    defaultValue={(m[`shot${slot}` as const] ?? '') as string}
                    onBlur={(e) => onCaption(slot, e.target.value)}
                    placeholder="chú thích"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: paper.white,
                      border: `1px solid ${paper.rule}`,
                      color: ink.base,
                      fontFamily: sans,
                      fontSize: 12.5,
                      padding: '6px 9px',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <Hover as="label" style={action} hoverStyle={{ color: ink.base }}>
                      {url ? 'đổi ảnh' : 'tải ảnh lên'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) onUpload(slot, f)
                          e.target.value = ''
                        }}
                        style={{ display: 'none' }}
                      />
                    </Hover>
                    {url && (
                      <Hover
                        as="button"
                        onClick={() => onClear(slot)}
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
      </div>

      <div>
        <div style={label}>Xem trước layout</div>
        <Preview m={m} kind={group.preview} />
      </div>
    </div>
  )
}
