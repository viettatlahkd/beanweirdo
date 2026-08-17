import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ink, paper, sans, serif } from './tokens'
import type { CardData, CardPart, CardsPostData } from './types'

export type CardsOverrides = {
  renderCardTitle?: (title: string, cardIndex: number) => ReactNode
  renderCardSub?: (sub: string, cardIndex: number) => ReactNode
  renderCardTag?: (tag: string, cardIndex: number) => ReactNode
  renderPartHeading?: (heading: string, cardIndex: number, partIndex: number) => ReactNode
  /** overrides the whole body of a part (method text / detail rows / callout lines) */
  renderPartBody?: (part: CardPart, cardIndex: number, partIndex: number) => ReactNode
}

export type CardsProps = CardsOverrides & {
  post: CardsPostData
}

type Group = { group: string; hue: string; count: number }

function groupsOf(cards: CardData[]): Group[] {
  const byGroup = new Map<string, Group>()
  for (const c of cards) {
    const existing = byGroup.get(c.group)
    if (existing) existing.count += 1
    else byGroup.set(c.group, { group: c.group, hue: c.hue, count: 1 })
  }
  return [...byGroup.values()]
}

/**
 * The "cards" template — a glossary of expandable term cards with a tag
 * filter bar and a sticky table of contents. Modeled on the "isCards"
 * section of the design source.
 */
export function Cards({ post, ...overrides }: CardsProps) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set())
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const groups = useMemo(() => groupsOf(post.cards), [post.cards])
  const visibleCards = useMemo(
    () => (activeGroup ? post.cards.filter((c) => c.group === activeGroup) : post.cards),
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
      <div style={{ background: '#E4F0DF', color: '#1F3323', padding: '40px 56px 32px' }}>
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
        <div
          style={{
            fontFamily: sans,
            fontSize: 9.5,
            fontWeight: 500,
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: '#8A8A7C',
            marginRight: 8,
          }}
        >
          Nhóm hương đã nếm
        </div>
        {groups.map((g) => (
          <div
            key={g.group}
            role="button"
            onClick={() => setActiveGroup((prev) => (prev === g.group ? null : g.group))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: activeGroup === g.group ? '#E4F0DF' : '#FFFFFF',
              border: `1px solid ${paper.rule}`,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.hue, flex: 'none' }} />
            <div style={{ fontFamily: sans, fontSize: 12, color: ink.base }}>{g.group}</div>
            <div style={{ fontFamily: sans, fontSize: 10.5, color: ink.base, opacity: 0.5 }}>{g.count}</div>
          </div>
        ))}
        {activeGroup && (
          <div
            role="button"
            onClick={() => setActiveGroup(null)}
            style={{
              fontFamily: sans,
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: '#8A8A7C',
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
            <div role="button" onClick={() => setOpenIndexes(new Set(visibleCards.map((_, i) => i)))} style={{ cursor: 'pointer', color: ink.faint }}>
              mở hết
            </div>
            <div role="button" onClick={() => setOpenIndexes(new Set())} style={{ cursor: 'pointer', color: ink.faint }}>
              gập hết
            </div>
          </div>

          {visibleCards.map((c, i) => {
            const open = openIndexes.has(i)
            return (
              <div key={c.n} style={{ borderBottom: `1px solid ${paper.rule}` }}>
                <div
                  role="button"
                  aria-expanded={open}
                  onClick={() => toggle(i)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '18px 4px 16px', cursor: 'pointer' }}
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
          })}
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
          {post.cards.map((c, i) => (
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
