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
 */
import { paletteFrom } from 'post-renderer'
import { ink, paper } from '../../design/tokens'

export type Theme = { id: string; label: string; color: string }

const SWATCH = 22

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

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {moduleColor && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`theo màu module${moduleLabel ? ` ${moduleLabel}` : ''}`}
            aria-pressed={value === null}
            title={moduleLabel ? `theo ${moduleLabel}` : 'theo module'}
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
              aria-label={`màu ${t.label}`}
              aria-pressed={same(value, t.color)}
              title={t.label}
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
          title="màu khác"
        >
          <span style={{ fontSize: 13, lineHeight: 1, color: ink.muted }}>+</span>
          <input
            type="color"
            aria-label="màu khác"
            value={showing}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
          />
        </label>
      </div>

      {/* The derived set, so the choice is made against what it actually does. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ display: 'flex', border: `1px solid ${paper.rule}`, borderRadius: 3, overflow: 'hidden' }}>
          {[palette.accent, palette.ink, palette.edge, palette.tint].map((c) => (
            <span key={c} style={{ width: 26, height: 14, background: c }} />
          ))}
        </span>
        <span style={{ fontSize: 11, color: ink.muted }}>
          {value === null ? `theo module${moduleLabel ? ` — ${moduleLabel}` : ''}` : showing}
        </span>
      </div>
    </div>
  )
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
