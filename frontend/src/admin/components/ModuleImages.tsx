import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { ImageBand } from '../../screens/Landing'
import { ink, paper, sans } from '../../design/tokens'
import { Hover } from '../../lib/Hover'
import type { ImageGroup, ModuleImageFields } from '../moduleForm'
import { coverStyle } from '../../lib/imageFocus'
import { FocusPicker } from './FocusPicker'

/**
 * Sidebar plus page padding — everything the content does not get. Measured
 * per screen, because they do not agree: the homepage band spans 1264px of a
 * 1440px window, Ghi 01's grid only 1232px.
 */
const CHROME = { 'homepage-band': 176, 'notes-footer': 208 } as const

/** Ghi 01 lays its twelve columns out with a wider gutter than the homepage. */
const NOTES_GAP = 30

/**
 * Width the public page gives the image band, on the screen looking at it.
 *
 * The band is fluid: it takes whatever the window leaves after the sidebar and
 * the page padding, while its height is fixed. So a cell's proportions move
 * with the window, and a preview drawn at some nominal width would show a
 * shape the admin never actually sees. Rendering at the real width and scaling
 * down keeps the preview honest — and keeps the crop frame honest with it.
 */
function pageWidth(kind: ImageGroup['preview']): number {
  if (typeof window === 'undefined') return 1128
  return Math.max(720, window.innerWidth - CHROME[kind])
}

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
function Preview({
  m,
  kind,
  gridRef,
}: {
  m: ModuleImageFields
  kind: ImageGroup['preview']
  /** The layout's own grid, so a cell can be measured rather than guessed. */
  gridRef?: RefObject<HTMLDivElement>
}) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [page, setPage] = useState(() => pageWidth(kind))

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => {
      setPage(pageWidth(kind))
      setScale(el.clientWidth / pageWidth(kind))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [kind])

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
          ref={gridRef}
          style={{
            width: page,
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
    ...(img ? coverStyle(img) : { background: tint }),
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
        gap: NOTES_GAP,
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
  onPlace,
}: {
  m: ModuleImageFields
  group: ImageGroup
  onCaption: (slot: 1 | 2 | 3, v: string) => void
  /** Uploads and returns the stored URL, so the frame can be set straight away. */
  onUpload: (slot: 1 | 2 | 3, f: File) => Promise<string | null>
  onClear: (slot: 1 | 2 | 3) => void
  /** The same photo, carrying a focal point. */
  onPlace: (slot: 1 | 2 | 3, url: string) => void
}) {
  const grid = useRef<HTMLDivElement>(null)
  const [placing, setPlacing] = useState<{ slot: 1 | 2 | 3; url: string } | null>(null)

  /**
   * The shape of the cell this slot fills, taken from the preview rather than
   * a table — the preview draws the real layout, so measuring it is the one
   * answer that cannot drift from what the page does.
   */
  const ratioOf = (i: number): number => {
    const cell = grid.current?.firstElementChild?.children[i] as HTMLElement | undefined
    if (!cell) return 16 / 9
    const r = cell.getBoundingClientRect()
    return r.height > 0 ? r.width / r.height : 16 / 9
  }

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
                    ...(url ? coverStyle(url) : { background: paper.hover }),
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
                          e.target.value = ''
                          if (!f) return
                          // Straight from the upload into placing it, because a
                          // photo that has not been placed is only half added.
                          void onUpload(slot, f).then((next) => {
                            if (next) setPlacing({ slot, url: next })
                          })
                        }}
                        style={{ display: 'none' }}
                      />
                    </Hover>
                    {url && (
                      <Hover
                        as="button"
                        onClick={() => setPlacing({ slot, url })}
                        style={{ ...action, background: 'none', border: 'none', padding: 0 }}
                        hoverStyle={{ color: ink.base }}
                      >
                        đặt vào khung
                      </Hover>
                    )}
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
        <Preview m={m} kind={group.preview} gridRef={grid} />
      </div>

      {placing && (
        <FocusPicker
          url={placing.url}
          ratio={ratioOf(group.slots.indexOf(placing.slot))}
          name={`${group.label} · ${group.names[group.slots.indexOf(placing.slot)]}`}
          onCancel={() => setPlacing(null)}
          onSave={(next) => {
            onPlace(placing.slot, next)
            setPlacing(null)
          }}
        />
      )}
    </div>
  )
}
