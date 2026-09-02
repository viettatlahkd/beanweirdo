/**
 * What colour a post wears.
 *
 * A post filed under a module takes that module's colour, and until now that
 * was the whole story — which left two holes. A post in one of the journals has
 * no module colour to take, and a post in a module could never differ from it
 * even once.
 *
 * So: the module's colour is the default and stays the default. Choosing it
 * back stores nothing, which matters more than it looks — a post that merely
 * *copied* the colour would keep the old one when the module was recoloured
 * later, and the module's own posts would drift apart from it one by one.
 *
 * Every colour is named the same way wherever it appears: the module it belongs
 * to, then the code itself. A colour that belongs to no module is `customize`.
 * The code is written out rather than implied because a colour is often decided
 * somewhere else first — in a reference, a screenshot, another file — and
 * arrives here as six characters to paste.
 */
import { useEffect, useState } from 'react'
import { paletteFrom } from 'post-renderer'
import { ink, paper } from '../../design/tokens'

export type Theme = { id: string; label: string; color: string }

const SWATCH = 22
const HEX = /^#?([0-9a-fA-F]{6})$/

/** Two colours are the same colour however they were typed — or both absent. */
const same = (a?: string | null, b?: string | null) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

export function ThemePicker({
  value,
  moduleColor,
  moduleLabel,
  themes,
  onChange,
}: {
  /** The post's own colour, or null when it follows its module. */
  value: string | null
  /** The colour of the module it is filed under, if that module has one. */
  moduleColor?: string
  moduleLabel?: string
  themes: Theme[]
  onChange: (next: string | null) => void
}) {
  const showing = value ?? moduleColor ?? '#6FA8C0'
  const palette = paletteFrom(showing)

  /**
   * Whose colour this is — a module's, or nobody's. The module this post is
   * filed under answers first, so its name is right even if it never made it
   * into the list of themes.
   */
  const ownerOf = (color: string) =>
    (same(color, moduleColor) ? moduleLabel : undefined) ??
    themes.find((t) => t.color && same(t.color, color))?.label ??
    'customize'
  const describe = (color: string) => `${ownerOf(color)} — ${color.toUpperCase()}`

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {moduleColor && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={describe(moduleColor)}
            aria-pressed={value === null}
            title={describe(moduleColor)}
            style={swatchStyle(moduleColor, value === null)}
          />
        )}
        {themes
          // A module with no colour of its own offers nothing to pick, and the
          // module already shown above should not appear twice.
          .filter((t) => t.color && !same(t.color, moduleColor))
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.color)}
              aria-label={describe(t.color)}
              aria-pressed={same(value, t.color)}
              title={describe(t.color)}
              style={swatchStyle(t.color, same(value, t.color))}
            />
          ))}
        {/*
          * The way out of the list. A journal has no module colour to inherit
          * and no reason to borrow another module's, so there has to be a place
          * to simply say which colour.
          */}
        <label
          style={{ ...swatchStyle('transparent', false), borderStyle: 'dashed', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          title={`customize — ${showing.toUpperCase()}`}
        >
          <span style={{ fontSize: 13, lineHeight: 1, color: ink.muted }}>+</span>
          <input
            type="color"
            aria-label="chọn màu khác"
            value={normalise(showing) ?? '#6FA8C0'}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
          />
        </label>
        <HexField value={showing} onChange={onChange} />
      </div>

      {/* The derived set, so the choice is made against what it actually does. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ display: 'flex', border: `1px solid ${paper.rule}`, borderRadius: 3, overflow: 'hidden' }}>
          {[palette.accent, palette.ink, palette.edge, palette.tint].map((c) => (
            <span key={c} style={{ width: 26, height: 14, background: c }} />
          ))}
        </span>
        <span style={{ fontSize: 11, color: ink.muted, fontVariantNumeric: 'tabular-nums' }}>{describe(showing)}</span>
      </div>
    </div>
  )
}

/**
 * The code, spelled out and editable.
 *
 * Typing runs through half-finished values on its way to a real one, so the
 * field keeps whatever is being typed and only reports a colour once six hex
 * digits are there. Leaving it half-written puts the current colour back rather
 * than holding the post at something that is not a colour.
 */
function HexField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [draft, setDraft] = useState(value.toUpperCase())
  useEffect(() => setDraft(value.toUpperCase()), [value])

  return (
    <input
      aria-label="mã màu"
      value={draft}
      spellCheck={false}
      placeholder="#773236"
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        const hex = normalise(next)
        if (hex) onChange(hex)
      }}
      onBlur={() => setDraft(value.toUpperCase())}
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: '.02em',
        width: 84,
        padding: '4px 6px',
        color: ink.strong,
        background: paper.white,
        border: `1px solid ${paper.rule}`,
        borderRadius: 4,
        textTransform: 'uppercase',
      }}
    />
  )
}

/** `773236`, `#773236`, `#773236 ` — all one colour; anything else is not one yet. */
function normalise(input: string): string | null {
  const m = HEX.exec(input.trim())
  return m ? `#${m[1].toUpperCase()}` : null
}

function swatchStyle(color: string, on: boolean) {
  return {
    position: 'relative' as const,
    width: SWATCH,
    height: SWATCH,
    borderRadius: 4,
    background: color,
    border: on ? `2px solid ${ink.base}` : `1px solid ${paper.rule}`,
    boxShadow: on ? `inset 0 0 0 2px ${paper.white}` : undefined,
    cursor: 'pointer',
    padding: 0,
  }
}
