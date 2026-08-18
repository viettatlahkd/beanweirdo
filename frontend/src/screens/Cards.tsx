import { useMemo, useRef, useState } from 'react'
import {
  FLAVOR_GROUPS,
  SAMPLE_CARDS,
  groupMeta,
  type Card,
  type CardPart,
} from '../content/cards'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useModules } from '../data/useModules'
import { garden, ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav } from '../lib/nav'

const uppercase = {
  fontFamily: sans,
  fontSize: 9.5,
  fontWeight: 500,
  letterSpacing: '.2em',
  textTransform: 'uppercase' as const,
  color: '#8A8A7C',
}

function move<T>(list: T[], i: number, dir: number): T[] {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const out = list.slice()
  const t = out[i]
  out[i] = out[j]
  out[j] = t
  return out
}

/** A `method` / `detail` / `callout` block inside an open card. */
function Part({
  part,
  notFirst,
  notLast,
  onUp,
  onDown,
}: {
  part: CardPart
  notFirst: boolean
  notLast: boolean
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div style={{ position: 'relative', marginBottom: 24, paddingRight: 44 }}>
      {part.k === 'method' && (
        <div>
          <div style={{ ...uppercase, marginBottom: 9 }}>{part.h}</div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: 15,
              lineHeight: 1.55,
              color: ink.strong,
              maxWidth: 620,
            }}
          >
            {part.v}
          </div>
        </div>
      )}

      {part.k === 'detail' && (
        <div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 500,
              fontStyle: 'italic',
              fontSize: 14,
              color: ink.base,
              marginBottom: 12,
            }}
          >
            {part.h}
          </div>
          {(part.rows ?? []).map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'baseline',
                padding: '9px 0',
                borderTop: '1px solid #F0EBDB',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: sans,
                    fontWeight: 300,
                    fontSize: 15,
                    lineHeight: 1.45,
                    color: ink.strong,
                  }}
                >
                  {r.l}
                </div>
                {r.n && (
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 300,
                      fontStyle: 'italic',
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      color: '#7C7768',
                      marginTop: 4,
                    }}
                  >
                    {r.n}
                  </div>
                )}
              </div>
              <div
                style={{
                  flex: 'none',
                  fontFamily: serif,
                  fontSize: 19,
                  color: ink.green,
                  fontVariantNumeric: 'tabular-nums',
                  width: 26,
                  textAlign: 'right',
                }}
              >
                {r.s}
              </div>
            </div>
          ))}
        </div>
      )}

      {part.k === 'callout' && (
        <div style={{ background: '#F4F2E8', padding: '18px 20px 19px', maxWidth: 640 }}>
          <div style={{ ...uppercase, marginBottom: 10 }}>{part.h}</div>
          {(part.v ?? '').split('\n').map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: sans,
                fontWeight: 300,
                fontSize: 14,
                lineHeight: 1.55,
                color: ink.strong,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          fontFamily: sans,
          fontSize: 11,
          color: '#DAD7C7',
        }}
      >
        {notFirst && (
          <Hover onClick={onUp} style={{ cursor: 'pointer', padding: '1px 4px' }} hoverStyle={{ color: ink.green }}>
            ↑
          </Hover>
        )}
        {notLast && (
          <Hover onClick={onDown} style={{ cursor: 'pointer', padding: '1px 4px' }} hoverStyle={{ color: ink.green }}>
            ↓
          </Hover>
        )}
      </div>
    </div>
  )
}

/**
 * Info cards — the glossary template.
 *
 * A flat deck where any number of cards can be open at once (the one place the
 * site breaks its one-item-open rule, because the whole point is comparing two
 * notes side by side). The flavour-group tags live in a single bar at the top
 * rather than on each card, and the first group on a card colours it.
 */
export function Cards() {
  const nav = useNav()
  const { data: modules } = useModules()
  const [cards, setCards] = useState<Card[]>(SAMPLE_CARDS)
  const [open, setOpen] = useState<Record<number, boolean>>({ 2: true })
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [extraGroups, setExtraGroups] = useState<string[]>([])
  /** Groups added from the bar that no card carries yet — kept visible anyway. */
  const [pinnedGroups, setPinnedGroups] = useState<string[]>([])
  const [tagAdding, setTagAdding] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const cardEls = useRef<Record<number, HTMLDivElement | null>>({})

  const fromModule = nav.cardsFrom === 'module'
  const sensory = modules.find((m) => m.id === 'sensory')
  const bandBg = fromModule ? (sensory?.accent ?? garden.blush) : garden.leafTint
  const bandFg = fromModule ? (sensory?.on_color ?? '#3B2A2B') : '#1F3323'

  const meta = (g: string) => groupMeta(g, extraGroups)

  function scrollToCard(id: number) {
    const el = cardEls.current[id]
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' })
  }

  function toggleCard(id: number) {
    const willOpen = !open[id]
    setOpen((o) => ({ ...o, [id]: willOpen }))
    if (willOpen) setTimeout(() => scrollToCard(id), 60)
  }

  function commitTag() {
    const v = tagDraft.trim()
    setTagAdding(false)
    setTagDraft('')
    if (!v) return
    const known = FLAVOR_GROUPS.map((x) => x.g).concat(extraGroups)
    if (!known.includes(v)) setExtraGroups((g) => g.concat([v]))
    setPinnedGroups((g) => (g.includes(v) ? g : g.concat([v])))
  }

  function movePart(cardId: number, pi: number, dir: number) {
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, parts: move(c.parts, pi, dir) } : c)))
  }

  function shiftCard(id: number, dir: number) {
    setCards((cs) => {
      const i = cs.findIndex((c) => c.id === id)
      return i < 0 ? cs : move(cs, i, dir)
    })
  }

  // Chips: wheel order first, then anything the reader added, then pinned-but-empty.
  const groupBar = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of cards) for (const g of c.groups) counts[g] = (counts[g] || 0) + 1
    const order = FLAVOR_GROUPS.map((x) => x.g).concat(extraGroups)
    return order.filter((g) => counts[g]).concat(pinnedGroups.filter((g) => !counts[g]))
      .map((g) => ({ ...groupMeta(g, extraGroups), n: counts[g] || 0 }))
  }, [cards, extraGroups, pinnedGroups])

  const shown = groupFilter ? cards.filter((c) => c.groups.includes(groupFilter)) : cards

  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div style={{ background: bandBg, color: bandFg, padding: '40px 56px 32px' }}>
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
            sensory lexicon
          </h1>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: 13,
              lineHeight: 1.5,
              maxWidth: 330,
              opacity: 0.85,
            }}
          >
            <div>Tham khảo: Sensory Lexicon, 2016 Edition</div>
            <div style={{ marginTop: 4 }}>
              {fromModule
                ? 'Thang rút ngắn 0-8, trên thang gốc 0-15'
                : 'Mẫu info cards — bấm một thẻ để mở, kéo ↑↓ để đổi thứ tự.'}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#F6F4EA',
          borderBottom: `1px solid ${paper.rule}`,
          padding: '16px 56px 17px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          flexWrap: 'wrap',
        }}
      >
        {groupBar.map((g) => {
          const on = groupFilter === g.g
          return (
            <div
              key={g.g}
              onClick={() => setGroupFilter(on ? null : g.g)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: on ? g.w : paper.white,
                border: `1px solid ${on ? g.c : paper.rule}`,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.c, flex: 'none' }} />
              <div style={{ fontFamily: sans, fontSize: 12, color: on ? g.ink : ink.mid }}>{g.g}</div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 10.5,
                  color: g.ink,
                  opacity: 0.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {g.n}
              </div>
            </div>
          )
        })}
        {tagAdding ? (
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTag()
              if (e.key === 'Escape') {
                setTagAdding(false)
                setTagDraft('')
              }
            }}
            onBlur={commitTag}
            autoFocus
            list="flavor-groups"
            placeholder="thêm nhóm hương"
            style={{
              width: 170,
              background: paper.white,
              border: `1px solid ${ink.green}`,
              color: ink.base,
              fontFamily: sans,
              fontWeight: 300,
              fontSize: 12,
              padding: '6px 10px',
              outline: 'none',
            }}
          />
        ) : (
          <Hover
            onClick={() => {
              setTagAdding(true)
              setTagDraft('')
            }}
            style={{
              fontFamily: sans,
              fontSize: 12,
              color: ink.faint,
              border: '1px dashed #DAD7C7',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
            hoverStyle={{ color: ink.green, borderColor: ink.green }}
          >
            + tag
          </Hover>
        )}
        {groupFilter && (
          <Hover
            onClick={() => setGroupFilter(null)}
            style={{
              fontFamily: sans,
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: '#8A8A7C',
              cursor: 'pointer',
              marginLeft: 4,
            }}
            hoverStyle={{ color: '#C25C2E' }}
          >
            bỏ lọc ✕
          </Hover>
        )}
      </div>

      <datalist id="flavor-groups">
        {FLAVOR_GROUPS.map((g) => (
          <option key={g.g} value={g.g} />
        ))}
        {extraGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(220px,272px)',
          gap: 52,
          padding: '32px 56px 140px',
          maxWidth: 1320,
          alignItems: 'start',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 18,
              borderBottom: `1px solid ${ink.base}`,
              paddingBottom: 10,
              marginBottom: 6,
              fontFamily: sans,
              fontSize: 10,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
            }}
          >
            <div style={{ color: '#8A8A7C', flex: 1 }}>{cards.length} thẻ</div>
            <Hover
              onClick={() => setOpen(Object.fromEntries(cards.map((c) => [c.id, true])))}
              style={{ cursor: 'pointer', color: ink.faint }}
              hoverStyle={{ color: ink.green }}
            >
              mở hết
            </Hover>
            <Hover
              onClick={() => setOpen({})}
              style={{ cursor: 'pointer', color: ink.faint }}
              hoverStyle={{ color: ink.green }}
            >
              gập hết
            </Hover>
          </div>

          {shown.map((c) => {
            const m = meta(c.groups[0] ?? 'Other Fruit')
            const isOpen = !!open[c.id]
            return (
              <div
                key={c.id}
                ref={(el) => {
                  cardEls.current[c.id] = el
                }}
                style={{ borderBottom: `1px solid ${paper.rule}` }}
              >
                <Hover
                  onClick={() => toggleCard(c.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', padding: '18px 4px 16px', cursor: 'pointer' }}
                  hoverStyle={{ background: '#FBF8EC' }}
                >
                  <div style={{ fontFamily: sans, fontSize: 12, color: m.ink, paddingTop: 8, width: 16, flex: 'none' }}>
                    {isOpen ? '▾' : '▸'}
                  </div>
                  <div
                    style={{ width: 5, flex: 'none', alignSelf: 'stretch', background: m.c, margin: '4px 14px 4px 0' }}
                  />
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '.16em',
                      color: ink.faint,
                      width: 34,
                      flex: 'none',
                      paddingTop: 11,
                    }}
                  >
                    {c.n}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontFamily: serif, fontSize: 32, lineHeight: 1.02, letterSpacing: '-.03em', color: m.ink }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontFamily: sans,
                        fontWeight: 400,
                        fontSize: 15,
                        lineHeight: 1.35,
                        color: '#6B6555',
                        marginTop: 6,
                      }}
                    >
                      {c.sub}
                    </div>
                    <div
                      style={{
                        fontFamily: sans,
                        fontWeight: 300,
                        fontStyle: 'italic',
                        fontSize: 12.5,
                        lineHeight: 1.4,
                        color: '#A2A296',
                        marginTop: 5,
                      }}
                    >
                      {c.tag}
                    </div>
                  </div>
                </Hover>

                {isOpen && (
                  <div style={{ padding: '0 4px 26px 54px' }}>
                    {c.parts.map((p, pi) => (
                      <Part
                        key={pi}
                        part={p}
                        notFirst={pi > 0}
                        notLast={pi < c.parts.length - 1}
                        onUp={() => movePart(c.id, pi, -1)}
                        onDown={() => movePart(c.id, pi, 1)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ position: 'sticky', top: 24 }}>
          <div
            style={{
              ...uppercase,
              borderBottom: `1px solid ${ink.base}`,
              paddingBottom: 9,
              marginBottom: 14,
            }}
          >
            Mục lục trong bài
          </div>
          {cards.map((c, i) => {
            const active = !!open[c.id]
            return (
              <div key={c.id} style={{ position: 'relative', padding: '9px 0 10px', borderBottom: '1px solid #F0EBDB' }}>
                <div
                  onClick={() => {
                    setOpen((o) => ({ ...o, [c.id]: true }))
                    setTimeout(() => scrollToCard(c.id), 60)
                  }}
                  style={{ display: 'flex', gap: 10, alignItems: 'baseline', cursor: 'pointer', paddingRight: 26 }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      flex: 'none',
                      borderRadius: '50%',
                      background: meta(c.groups[0] ?? 'Other Fruit').c,
                      marginTop: 6,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: sans, fontSize: 14, color: active ? ink.base : '#8A8A7C' }}>
                      {c.n} · {c.title}
                    </div>
                    {active && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {c.parts.map((p, pi) => (
                          <div
                            key={pi}
                            style={{ fontFamily: sans, fontWeight: 300, fontSize: 11.5, color: '#A2A296', paddingLeft: 2 }}
                          >
                            — {p.h}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    fontFamily: sans,
                    fontSize: 10,
                    color: '#DAD7C7',
                  }}
                >
                  {i > 0 && (
                    <Hover
                      onClick={() => shiftCard(c.id, -1)}
                      style={{ cursor: 'pointer', padding: '0 3px' }}
                      hoverStyle={{ color: ink.green }}
                    >
                      ↑
                    </Hover>
                  )}
                  {i < cards.length - 1 && (
                    <Hover
                      onClick={() => shiftCard(c.id, 1)}
                      style={{ cursor: 'pointer', padding: '0 3px' }}
                      hoverStyle={{ color: ink.green }}
                    >
                      ↓
                    </Hover>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
