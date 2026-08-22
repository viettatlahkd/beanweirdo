import type { ReactNode } from 'react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { sans, serif } from './tokens'
import type { LongformBlock, LongformPostData, LongformRun } from './types'

export type LongformProps = {
  post: LongformPostData
  /**
   * The trail back to where this post is filed. Supplied by the app, so the
   * renderer package stays independent of how routing works.
   */
  breadcrumb?: ReactNode
}

/** Which heading owns a block, and whether that heading is folded away. */
type Prepared = {
  key: string
  block: LongformBlock
  /** Fold id when this block is itself a foldable heading. */
  selfId: string
  /** The h1/h2 sections this block sits inside. */
  ownerH1: string
  ownerH2: string
  /** Index among h1s — 0 is the title. */
  h1Index: number
  /** Blocks since the last h1, for tightening the first h2's top margin. */
  sinceH1: number
}

/**
 * Walk the blocks once, recording which section each belongs to.
 *
 * Headings fold, and folding one has to hide everything under it until the next
 * heading of the same rank — which the flat block list doesn't say. This is
 * where that structure is recovered, so rendering can stay a straight map.
 */
function prepare(blocks: LongformBlock[]): Prepared[] {
  let h1n = 0
  let curH1 = ''
  let curH2 = ''
  let sinceH1 = 99

  return blocks.map((block, i) => {
    const h1Index = block.k === 'h1' ? h1n++ : -1
    let selfId = ''
    let ownerH1 = curH1
    let ownerH2 = curH2
    const since = sinceH1
    sinceH1 = block.k === 'h1' ? 0 : sinceH1 + 1

    // The first h1 is the title — it owns nothing and cannot be folded away.
    if (block.k === 'h1' && h1Index > 0) {
      selfId = `a${i}`
      curH1 = selfId
      curH2 = ''
      ownerH1 = ''
      ownerH2 = ''
    } else if (block.k === 'h2') {
      selfId = `b${i}`
      curH2 = selfId
      ownerH1 = curH1
      ownerH2 = ''
    }

    return { key: `${i}`, block, selfId, ownerH1, ownerH2, h1Index, sinceH1: since }
  })
}

const runStyle = (r: LongformRun): CSSProperties => ({
  fontWeight: r.w ? Number(r.w) : undefined,
  fontStyle: r.s === 'italic' ? 'italic' : 'normal',
})

const Runs = ({ runs }: { runs?: LongformRun[] }) => (
  <>
    {(runs ?? []).map((r, i) => (
      <span key={i} style={runStyle(r)}>
        {r.t}
      </span>
    ))}
  </>
)

const plain = (runs?: LongformRun[]) => (runs ?? []).map((r) => r.t).join('')

/** li indent and bullet shape both come from the nesting level. */
function bullet(lvl = 1) {
  return {
    width: lvl === 3 ? 3 : 4,
    height: lvl === 3 ? 3 : 4,
    borderRadius: lvl === 2 ? '50%' : 0,
    background: lvl === 1 ? '#172124' : lvl === 2 ? 'transparent' : '#8A6420',
    border: lvl === 2 ? '1px solid #172124' : 0,
  }
}

const padOf = (b: LongformBlock) =>
  b.k === 'li' ? (b.lvl === 2 ? 26 : b.lvl === 3 ? 52 : 0) : b.ind ? 26 : 0

/** A `note` block's runs, split into lines on newline runs. */
function noteLines(runs: LongformRun[] = []): LongformRun[][] {
  const groups: LongformRun[][] = [[]]
  for (const r of runs) {
    if (r.t === '\n') groups.push([])
    else groups[groups.length - 1].push(r)
  }
  return groups.filter((g) => g.length > 0)
}

function NoteBlock({ runs }: { runs?: LongformRun[] }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: '#EAF1F4', borderLeft: '2px solid #6FA8C0', margin: '16px 0 20px' }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 11,
          padding: '9px 16px 7px',
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 8.5, letterSpacing: '.26em', textTransform: 'uppercase', color: '#9DB6C0' }}>
          Ghi chú
        </div>
        <div style={{ fontSize: 12, color: '#9DB6C0' }}>{open ? '−' : '+'}</div>
      </div>
      {open && (
        <div style={{ padding: '0 18px 16px', fontSize: 14.5, lineHeight: 1.7 }}>
          {noteLines(runs).map((line, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              {line.map((r, j) => (
                <span
                  key={j}
                  style={{
                    ...runStyle(r),
                    // The export marks emphasis with weight; a note is short
                    // enough that the emphasis reads better as a highlight.
                    color: r.w === '600' ? '#0F3D4A' : '#2A4A55',
                    background: r.w === '600' ? 'rgba(111,168,192,.22)' : 'transparent',
                    padding: '1px 2px',
                    margin: '0 -2px',
                  }}
                >
                  {r.t}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Blocks nested inside an `aside` — quieter, on its own sand ground. */
function AsideBlock({ items }: { items: LongformBlock[] }) {
  return (
    <div style={{ background: '#F3EEE1', padding: '24px 26px 20px', margin: '22px 0 26px' }}>
      {items.map((a, i) => {
        const pad = padOf(a)
        if (a.k === 'p')
          return (
            <div key={i} style={{ fontSize: 14.5, lineHeight: 1.66, color: '#3B3729', margin: '0 0 10px', paddingLeft: pad }}>
              <Runs runs={a.runs} />
            </div>
          )
        if (a.k === 'cont')
          return (
            <div key={i} style={{ fontSize: 14, lineHeight: 1.62, color: '#5C5745', margin: '0 0 6px', paddingLeft: pad }}>
              <Runs runs={a.runs} />
            </div>
          )
        if (a.k === 'li')
          return (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: '14px minmax(0,1fr)', gap: 10, margin: '0 0 8px', paddingLeft: pad }}
            >
              <div style={{ ...bullet(a.lvl), margin: '9px 0 0 4px' }} />
              <div style={{ fontSize: 14.5, lineHeight: 1.62, color: '#3B3729' }}>
                <Runs runs={a.runs} />
              </div>
            </div>
          )
        if (a.k === 'h4')
          return (
            <div
              key={i}
              style={{
                fontWeight: 500,
                fontSize: 11.5,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: '#7A5230',
                margin: '6px 0 10px',
              }}
            >
              {plain(a.runs)}
            </div>
          )
        if (a.k === 'fig')
          return (
            <div
              key={i}
              style={{
                margin: '14px 0 16px',
                background: '#FFFFFF',
                border: '1px solid #E6DFCB',
                aspectRatio: a.ar ?? '1.5',
                backgroundImage: a.src ? `url(${a.src})` : undefined,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )
        if (a.k === 'formula')
          return (
            <div
              key={i}
              style={{
                background: '#FFFFFF',
                borderLeft: '2px solid #7A5230',
                padding: '12px 16px',
                margin: '10px 0 12px',
                fontSize: 13.5,
                color: '#7A5230',
              }}
            >
              {a.v}
            </div>
          )
        return null
      })}
    </div>
  )
}

/**
 * The "longform" template — a piece long enough that reading it needs
 * furniture: headings that fold, an index that follows you down the page.
 *
 * Modelled on the "isLongform" section of the design source. Content arrives
 * pre-parsed from a Notion export, so this only renders and folds; it never
 * parses.
 */
export function Longform({ post, breadcrumb }: LongformProps) {
  const prepared = useMemo(() => prepare(post.blocks), [post.blocks])
  const [folded, setFolded] = useState<Record<string, boolean>>({})
  const [navOpen, setNavOpen] = useState(false)
  const [deep, setDeep] = useState(false)

  // The index drifts upward once you're properly into the piece, so it sits
  // beside the text rather than centred against a screen you've left behind.
  useEffect(() => {
    const onScroll = () => setDeep(window.scrollY > window.innerHeight * 0.9)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const headIds = useMemo(() => prepared.filter((p) => p.selfId).map((p) => p.selfId), [prepared])

  /** Every h1 after the title, in order — the index's entries. */
  const index = useMemo(
    () =>
      prepared
        .filter((p) => p.block.k === 'h1' && p.h1Index > 0)
        .map((p, i) => ({
          id: p.selfId,
          n: String(i + 1).padStart(2, '0'),
          t: plain(p.block.runs),
          h1Index: p.h1Index,
        })),
    [prepared],
  )

  function toggle(p: Prepared) {
    setFolded((f) => {
      const next = { ...f }
      // Opening an h2 whose h1 is folded opens the h1 too — otherwise the
      // click appears to do nothing.
      if (p.block.k === 'h2' && p.ownerH1 && next[p.ownerH1]) {
        delete next[p.ownerH1]
        delete next[p.selfId]
        return next
      }
      if (next[p.selfId]) delete next[p.selfId]
      else next[p.selfId] = true
      return next
    })
  }

  function jumpTo(entry: { id: string; h1Index: number }) {
    setFolded((f) => {
      const next = { ...f }
      delete next[entry.id]
      return next
    })
    setNavOpen(false)
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-lf-h1="${entry.h1Index}"]`)
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24 })
    })
  }

  const anyFolded = Object.values(folded).some(Boolean)

  return (
    <div
      style={{
        background: '#FCFCFA',
        color: '#172124',
        minHeight: '100vh',
        fontFamily: sans,
        fontWeight: 300,
      }}
    >
      {/* A long read is still filed somewhere. The band is shallower than the
          other templates' — this page is a document, and a tall colour block
          at the top would push the first paragraph off the screen. */}
      <div
        style={{
          background: post.band?.bg ?? '#EAF1F4',
          color: post.band?.fg ?? '#172124',
          padding: '22px 56px 20px',
        }}
      >
        {breadcrumb}
      </div>
      <div style={{ padding: '40px 56px 140px' }}>
      {/* Floating index: a rail of numbers that opens on hover. */}
      <div
        onMouseLeave={() => setNavOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            transform: deep ? 'translateY(-15vh)' : 'translateY(0)',
            transition: 'transform 1.1s cubic-bezier(.22,.72,.2,1)',
            willChange: 'transform',
          }}
        >
          <div
            onMouseEnter={() => setNavOpen(true)}
            style={{
              pointerEvents: 'auto',
              width: 44,
              flex: 'none',
              display: navOpen ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {index.map((ix) => (
              <div
                key={ix.id}
                style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'stretch', justifyContent: 'flex-end' }}
              >
                <div
                  style={{
                    fontFamily: serif,
                    fontStyle: 'italic',
                    fontSize: 11,
                    color: '#C4C0B0',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {ix.n}
                </div>
                <div style={{ width: 16, height: 1, background: '#D8D4C6' }} />
              </div>
            ))}
          </div>

          <div
            style={{
              pointerEvents: 'auto',
              width: 300,
              flex: 'none',
              maxHeight: '76vh',
              overflowY: 'auto',
              display: navOpen ? 'flex' : 'none',
              flexDirection: 'column',
                background:
                  'linear-gradient(to left, rgba(252,252,250,.99) 0%, rgba(252,252,250,.97) 52%, rgba(252,252,250,.86) 78%, rgba(252,252,250,0) 100%)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                padding: '18px 26px 12px 44px',
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: '.24em', textTransform: 'uppercase', color: '#B0B0A6', marginBottom: 4 }}>
              Mục trong bài
            </div>
            {index.map((ix) => (
              <div
                key={ix.id}
                onClick={() => jumpTo(ix)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '22px minmax(0,1fr)',
                  gap: 9,
                  padding: '9px 0',
                  cursor: 'pointer',
                  borderTop: '1px solid rgba(23,33,36,.08)',
                }}
              >
                <div
                  style={{
                    fontFamily: serif,
                    fontStyle: 'italic',
                    fontSize: 11.5,
                    color: '#B0B0A6',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {ix.n}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{ix.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fold controls, pinned low-right and always reachable. */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          bottom: 44,
          zIndex: 39,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1,
          padding: '8px 16px 8px 18px',
          background: 'linear-gradient(to left, rgba(252,252,250,.97) 70%, rgba(252,252,250,0))',
        }}
      >
        <div
          onClick={() => setFolded(Object.fromEntries(headIds.map((k) => [k, true])))}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', cursor: 'pointer', color: '#7C7C70' }}
        >
          <div style={{ fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase' }}>thu gọn</div>
          <div style={{ width: 19, height: 19, border: '1px solid rgba(124,124,112,.4)', fontSize: 10, lineHeight: '17px', textAlign: 'center' }}>
            ▸
          </div>
        </div>
        <div
          onClick={() => setFolded({})}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', cursor: 'pointer', color: '#7C7C70' }}
        >
          <div style={{ fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase' }}>
            {anyFolded ? 'xem tất cả' : 'đang mở hết'}
          </div>
          <div style={{ width: 19, height: 19, border: '1px solid rgba(124,124,112,.4)', fontSize: 10, lineHeight: '17px', textAlign: 'center' }}>
            ▾
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,760px)', justifyContent: 'center', paddingRight: 56 }}>
        <div>
          {prepared.map((p) => {
            const { block: b, selfId } = p
            const parentFolded = Boolean(p.ownerH1 && folded[p.ownerH1])
            const hidden = b.k === 'h2' ? false : parentFolded || Boolean(p.ownerH2 && folded[p.ownerH2])
            if (hidden) return null

            const isFolded = Boolean(folded[selfId]) || (b.k === 'h2' && parentFolded)
            const pad = padOf(b)
            const title = p.h1Index === 0

            return (
              <Fragment key={p.key}>
                {b.k === 'h1' && (
                  <>
                    <h1
                      onClick={() => selfId && toggle(p)}
                      data-lf-h1={p.h1Index}
                      style={{
                        cursor: selfId ? 'pointer' : 'default',
                        fontFamily: serif,
                        fontWeight: 400,
                        fontSize: title ? 70 : 42,
                        lineHeight: title ? 0.94 : 1.04,
                        letterSpacing: '-.03em',
                        color: title ? '#172124' : '#102F35',
                        borderTop: title ? 0 : '2px solid #102F35',
                        paddingTop: title ? 0 : 22,
                        margin: title ? '0 0 8px' : '58px 0 14px',
                      }}
                    >
                      {selfId && (
                        <span
                          style={{
                            display: 'inline-block',
                            fontFamily: sans,
                            fontSize: 17,
                            lineHeight: 1,
                            verticalAlign: 'middle',
                            marginRight: 16,
                            color: isFolded ? '#8A6420' : '#B5AE99',
                          }}
                        >
                          {isFolded ? '▸' : '▾'}
                        </span>
                      )}
                      {title ? post.title : <Runs runs={b.runs} />}
                    </h1>
                    {title && post.subtitle && (
                      <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 24, lineHeight: 1.3, color: '#3E7A4E', margin: '-4px 0 8px' }}>
                        {post.subtitle}
                      </div>
                    )}
                  </>
                )}

                {b.k === 'h2' && (
                  <h2
                    onClick={() => toggle(p)}
                    style={{
                      cursor: 'pointer',
                      fontFamily: serif,
                      fontWeight: 400,
                      fontSize: 27,
                      lineHeight: 1.16,
                      letterSpacing: '-.022em',
                      color: '#172124',
                      margin: `${p.sinceH1 <= 2 ? 24 : 42}px 0 10px`,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: sans,
                        fontSize: 13,
                        lineHeight: 1,
                        verticalAlign: 'middle',
                        marginRight: 12,
                        color: isFolded ? '#8A6420' : '#B5AE99',
                      }}
                    >
                      {isFolded ? '▸' : '▾'}
                    </span>
                    <Runs runs={b.runs} />
                  </h2>
                )}

                {b.k === 'h3' && (
                  <h3
                    style={{
                      fontFamily: serif,
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: 20,
                      lineHeight: 1.22,
                      color: '#3E7A4E',
                      margin: '32px 0 10px',
                    }}
                  >
                    {plain(b.runs)}
                  </h3>
                )}

                {b.k === 'h4' && (
                  <h4
                    style={{
                      fontFamily: sans,
                      fontWeight: 500,
                      fontSize: 12,
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: '#8A6420',
                      margin: '32px 0 12px',
                    }}
                  >
                    {plain(b.runs)}
                  </h4>
                )}

                {b.k === 'meta' && (
                  <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#B0B0A6', margin: '0 0 26px' }}>
                    {plain(b.runs)}
                  </div>
                )}

                {b.k === 'p' && (
                  <div style={{ fontSize: 15.5, lineHeight: 1.68, color: '#2E2A20', margin: '0 0 14px', paddingLeft: pad }}>
                    <Runs runs={b.runs} />
                  </div>
                )}

                {b.k === 'cont' && (
                  <div style={{ fontSize: 14.5, lineHeight: 1.66, color: '#4B4A40', margin: '0 0 8px', paddingLeft: pad }}>
                    <Runs runs={b.runs} />
                  </div>
                )}

                {b.k === 'li' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '16px minmax(0,1fr)', gap: 11, margin: '0 0 10px', paddingLeft: pad }}>
                    <div style={{ ...bullet(b.lvl), margin: '9px 0 0 5px' }} />
                    <div style={{ fontSize: 15, lineHeight: 1.66, color: '#2E2A20' }}>
                      <Runs runs={b.runs} />
                    </div>
                  </div>
                )}

                {b.k === 'note' && <NoteBlock runs={b.runs} />}

                {b.k === 'formula' && (
                  <div
                    style={{
                      background: '#F1F4EF',
                      borderLeft: '2px solid #102F35',
                      padding: '14px 18px',
                      margin: '14px 0 16px',
                      fontFamily: sans,
                      fontSize: 14,
                      letterSpacing: '.02em',
                      color: '#102F35',
                    }}
                  >
                    {b.v}
                  </div>
                )}

                {b.k === 'fig' && (
                  <div
                    style={{
                      margin: '26px 0 30px',
                      background: '#FFFFFF',
                      border: '1px solid #EDEBE0',
                      aspectRatio: b.ar ?? '1.5',
                      backgroundImage: b.src ? `url(${b.src})` : undefined,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}

                {b.k === 'aside' && <AsideBlock items={b.items ?? []} />}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
    </div>
  )
}
