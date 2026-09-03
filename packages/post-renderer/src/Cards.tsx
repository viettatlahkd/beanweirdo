import { Fragment, type ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ink, paper, sans, serif, wrapTitle } from './tokens'
import type { CardData, CardPart, CardsPostData } from './types'

export type CardsOverrides = {
  renderCardTitle?: (title: string, cardIndex: number) => ReactNode
  renderCardSub?: (sub: string, cardIndex: number) => ReactNode
  renderCardTag?: (tag: string, cardIndex: number) => ReactNode
  renderPartHeading?: (heading: string, cardIndex: number, partIndex: number) => ReactNode
  /** overrides the whole body of a part (method text / detail rows / callout lines) */
  renderPartBody?: (part: CardPart, cardIndex: number, partIndex: number) => ReactNode
  /**
   * Wraps one card, so the admin can hang its move / copy / delete handles on
   * it. The page passes the card straight through.
   */
  wrapCard?: (card: ReactNode, cardIndex: number) => ReactNode
  /** Shown under the last card — where the editor puts "add a card". */
  renderAfterCards?: () => ReactNode
}

export type CardsProps = CardsOverrides & {
  /**
   * The trail back to where this post is filed. Supplied by the app, so the
   * renderer package stays independent of how routing works.
   */
  breadcrumb?: ReactNode
  post: CardsPostData
}

type GroupMeta = {
  /** the dot and, when selected, the chip's edge */
  hue: string
  /** the label colour when the chip is selected — a darkened hue */
  ink: string
  /** the chip's fill when selected — a washed-out hue */
  wash: string
}

type Group = GroupMeta & { group: string; count: number }

/**
 * The SCA flavour wheel's fourteen groups, each with the three colours a chip
 * needs. This is a fixed vocabulary, not user data, so it lives here rather
 * than in the post body — a deck that leads with Berry and one that leads with
 * Citrus must still paint Berry the same red.
 */
const FLAVOR_GROUPS: Record<string, GroupMeta> = {
  Berry: { hue: '#D93A6A', ink: '#8E1E42', wash: '#FBE4EC' },
  'Dried Fruit': { hue: '#C4603F', ink: '#7A3520', wash: '#FAE7DE' },
  'Other Fruit': { hue: '#F2703A', ink: '#8F3A14', wash: '#FDE8DC' },
  'Citrus Fruit': { hue: '#F0C020', ink: '#7A5A04', wash: '#FCF3D4' },
  Floral: { hue: '#C361C9', ink: '#753A7A', wash: '#F8E6FA' },
  Sweet: { hue: '#F0A93C', ink: '#8A5510', wash: '#FDEED6' },
  'Nutty/Cocoa': { hue: '#A87B4C', ink: '#5C3D1E', wash: '#F4E9DB' },
  Spices: { hue: '#E14B2A', ink: '#8A2A13', wash: '#FBE3DC' },
  Roasted: { hue: '#8A6248', ink: '#4A2E1D', wash: '#EFE5DB' },
  'Green/Vegetative': { hue: '#4FAE63', ink: '#256B37', wash: '#E4F4E6' },
  Sour: { hue: '#B9D62B', ink: '#5A6B0C', wash: '#F2F8D8' },
  Fermented: { hue: '#8B74D9', ink: '#4C3A8E', wash: '#EDE9FB' },
  'Papery/Musty': { hue: '#9C9684', ink: '#585345', wash: '#F0EEE6' },
  Chemical: { hue: '#3D9AB0', ink: '#1E5A69', wash: '#E0F1F5' },
}

/** Groups outside the wheel cycle this palette, so they still read as distinct. */
const SPARE_PALETTE: GroupMeta[] = [
  { hue: '#6FBF5C', ink: '#3B6B2E', wash: '#F1EFE6' },
  { hue: '#F0C020', ink: '#7A5A04', wash: '#F1EFE6' },
  { hue: '#E8628C', ink: '#8E1E42', wash: '#F1EFE6' },
  { hue: '#3D9AB0', ink: '#1E5A69', wash: '#F1EFE6' },
  { hue: '#8B74D9', ink: '#4C3A8E', wash: '#F1EFE6' },
]

/**
 * A group's three colours: from the wheel when it is one of the fourteen,
 * otherwise from the spare palette by position. `groupHues` still wins, so a
 * post can recolour a group's dot without touching this table.
 */
function metaFor(group: string, extraIndex: number, hues: Record<string, string>): GroupMeta {
  const base = FLAVOR_GROUPS[group] ?? SPARE_PALETTE[extraIndex % SPARE_PALETTE.length]
  return hues[group] ? { ...base, hue: hues[group] } : base
}

/**
 * Every group across the deck, each counting all the cards that mention it.
 * The wheel's own order comes first — a reader scanning the bar should meet
 * Berry before Chemical however the deck happens to be written — and any group
 * outside the wheel follows in the order the deck introduces it.
 */
function groupsOf(cards: CardData[], hues: Record<string, string> = {}): Group[] {
  const counts = new Map<string, number>()
  const extras: string[] = []
  for (const c of cards) {
    for (const g of c.groups) {
      counts.set(g, (counts.get(g) ?? 0) + 1)
      if (!(g in FLAVOR_GROUPS) && !extras.includes(g)) extras.push(g)
    }
  }
  const ordered = [...Object.keys(FLAVOR_GROUPS).filter((g) => counts.has(g)), ...extras]
  return ordered.map((group) => ({
    group,
    count: counts.get(group) ?? 0,
    ...metaFor(group, extras.indexOf(group), hues),
  }))
}

/**
 * The "cards" template — a glossary of expandable term cards with a tag
 * filter bar and a sticky table of contents. Modeled on the "isCards"
 * section of the design source.
 */
export function Cards({ post, breadcrumb, ...overrides }: CardsProps) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set())
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [hoverCard, setHoverCard] = useState<number | null>(null)
  const [clearHover, setClearHover] = useState(false)

  const groups = useMemo(() => groupsOf(post.cards, post.groupHues), [post.cards, post.groupHues])
  /**
   * The cards on screen, each still carrying where it sits in the real list.
   *
   * The filtered position used to be the only index there was, and it was the
   * one handed to the editing overrides — so with a group filter on, renaming
   * the first card on screen renamed the first card in the post, which is a
   * different card. Everything below keys off `at`, the real index.
   */
  const visibleCards = useMemo(
    () =>
      post.cards
        .map((card, at) => ({ card, at }))
        .filter(({ card }) => !activeGroup || card.groups.includes(activeGroup)),
    [post.cards, activeGroup],
  )

  function toggle(index: number) {
    setOpenIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div style={{ background: paper.cream, color: ink.base, minHeight: '100vh' }}>
      <div
        style={{
          background: post.band?.bg ?? '#E4F0DF',
          color: post.band?.fg ?? '#1F3323',
          padding: '40px 56px 32px',
        }}
      >
        {breadcrumb}
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
          lang="en"
            style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: 70,
              lineHeight: 0.9,
              letterSpacing: '-.04em',
              margin: 0,
              ...wrapTitle,
            }}
          >
            {post.title}
          </h1>
          <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 13, lineHeight: 1.5, maxWidth: 330, opacity: 0.85 }}>
            {post.intro.map((line, i) => (
              <div key={i} style={i > 0 ? { marginTop: 4 } : undefined}>
                {line}
              </div>
            ))}
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
        {groups.map((g) => {
          // Selected, the chip fills with the group's own wash and takes its
          // hue as an edge — so the bar says which group is on by colour, not
          // only by contrast.
          const on = activeGroup === g.group
          return (
            <div
              key={g.group}
              role="button"
              aria-pressed={on}
              onClick={() => setActiveGroup((prev) => (prev === g.group ? null : g.group))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: on ? g.wash : '#FFFFFF',
                border: `1px solid ${on ? g.hue : paper.rule}`,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.hue, flex: 'none' }} />
              <div style={{ fontFamily: sans, fontSize: 12, color: on ? g.ink : '#4B463A' }}>
                {g.group}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 10.5,
                  color: g.ink,
                  opacity: 0.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {g.count}
              </div>
            </div>
          )
        })}
        {activeGroup && (
          <div
            role="button"
            onClick={() => setActiveGroup(null)}
            onMouseEnter={() => setClearHover(true)}
            onMouseLeave={() => setClearHover(false)}
            style={{
              fontFamily: sans,
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: clearHover ? '#C25C2E' : '#8A8A7C',
              cursor: 'pointer',
              marginLeft: 4,
            }}
          >
            bỏ lọc ✕
          </div>
        )}
      </div>

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
            <div style={{ color: '#8A8A7C', flex: 1 }}>{visibleCards.length} mục</div>
            <div role="button" onClick={() => setOpenIndexes(new Set(visibleCards.map((v) => v.at)))} style={{ cursor: 'pointer', color: ink.faint }}>
              mở hết
            </div>
            <div role="button" onClick={() => setOpenIndexes(new Set())} style={{ cursor: 'pointer', color: ink.faint }}>
              gập hết
            </div>
          </div>

          {visibleCards.map(({ card: c, at: i }) => {
            const open = openIndexes.has(i)
            const card = (
              <div style={{ borderBottom: `1px solid ${paper.rule}` }}>
                <div
                  role="button"
                  aria-expanded={open}
                  onClick={() => toggle(i)}
                  onMouseEnter={() => setHoverCard(i)}
                  onMouseLeave={() => setHoverCard((prev) => (prev === i ? null : prev))}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0,
                    padding: '18px 4px 16px',
                    cursor: 'pointer',
                    background: hoverCard === i ? '#FBF8EC' : undefined,
                  }}
                >
                  <div style={{ fontFamily: sans, fontSize: 12, color: ink.base, paddingTop: 8, width: 16, flex: 'none' }}>
                    {open ? '▾' : '▸'}
                  </div>
                  <div style={{ width: 5, flex: 'none', alignSelf: 'stretch', background: c.hue, margin: '4px 14px 4px 0' }} />
                  <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '.16em', color: ink.faint, width: 34, flex: 'none', paddingTop: 11 }}>
                    {c.n}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1.02, letterSpacing: '-.03em', color: ink.base }}>
                      {overrides.renderCardTitle ? overrides.renderCardTitle(c.title, i) : c.title}
                    </div>
                    <div style={{ fontFamily: sans, fontWeight: 400, fontSize: 15, lineHeight: 1.35, color: '#6B6555', marginTop: 6 }}>
                      {overrides.renderCardSub ? overrides.renderCardSub(c.sub, i) : c.sub}
                    </div>
                    <div style={{ fontFamily: sans, fontWeight: 300, fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.4, color: '#A2A296', marginTop: 5 }}>
                      {overrides.renderCardTag ? overrides.renderCardTag(c.tag, i) : c.tag}
                    </div>
                  </div>
                </div>

                {open && (
                  <div style={{ padding: '0 4px 26px 54px' }}>
                    {c.parts.map((p, pi) => (
                      <CardPartBlock key={pi} part={p} cardIndex={i} partIndex={pi} overrides={overrides} />
                    ))}
                  </div>
                )}
              </div>
            )
            return (
              <Fragment key={c.n}>{overrides.wrapCard ? overrides.wrapCard(card, i) : card}</Fragment>
            )
          })}
          {overrides.renderAfterCards?.()}
        </div>

        <div style={{ position: 'sticky', top: 24 }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 9.5,
              fontWeight: 500,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: '#8A8A7C',
              borderBottom: `1px solid ${ink.base}`,
              paddingBottom: 9,
              marginBottom: 14,
            }}
          >
            Mục lục trong bài
          </div>
          {post.cards.map((c) => (
            <div key={c.n} style={{ position: 'relative', padding: '9px 0 10px', borderBottom: `1px solid #F0EBDB` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', cursor: 'pointer', paddingRight: 26 }}>
                <div style={{ width: 7, height: 7, flex: 'none', borderRadius: '50%', background: c.hue, marginTop: 6 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: sans, fontSize: 14, color: ink.body }}>
                    {c.n} · {c.title}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CardPartBlock({
  part,
  cardIndex,
  partIndex,
  overrides,
}: {
  part: CardPart
  cardIndex: number
  partIndex: number
  overrides: CardsOverrides
}) {
  const heading = overrides.renderPartHeading ? overrides.renderPartHeading(part.heading, cardIndex, partIndex) : part.heading
  if (overrides.renderPartBody) {
    return (
      <div style={{ position: 'relative', marginBottom: 24 }}>
        {overrides.renderPartBody(part, cardIndex, partIndex)}
      </div>
    )
  }

  if (part.type === 'method') {
    return (
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', color: '#8A8A7C', marginBottom: 9 }}>
          {heading}
        </div>
        <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 15, lineHeight: 1.55, color: ink.strong, maxWidth: 620 }}>{part.body}</div>
      </div>
    )
  }

  if (part.type === 'detail') {
    return (
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ fontFamily: sans, fontWeight: 500, fontStyle: 'italic', fontSize: 14, color: ink.base, marginBottom: 12 }}>{heading}</div>
        {part.rows.map((r, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '9px 0', borderTop: '1px solid #F0EBDB' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 15, lineHeight: 1.45, color: ink.strong }}>{r.label}</div>
              {r.note && (
                <div style={{ fontFamily: sans, fontWeight: 300, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.5, color: '#7C7768', marginTop: 4 }}>
                  {r.note}
                </div>
              )}
            </div>
            <div style={{ flex: 'none', fontFamily: serif, fontSize: 19, color: ink.green, width: 26, textAlign: 'right' }}>{r.score}</div>
          </div>
        ))}
      </div>
    )
  }

  // callout
  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div style={{ background: '#F4F2E8', padding: '18px 20px 19px', maxWidth: 640 }}>
        <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', color: '#8A8A7C', marginBottom: 10 }}>
          {heading}
        </div>
        {part.lines.map((line, li) => (
          <div key={li} style={{ fontFamily: sans, fontWeight: 300, fontSize: 14, lineHeight: 1.55, color: ink.strong }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
