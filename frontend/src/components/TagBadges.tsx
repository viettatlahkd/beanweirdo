import type { CSSProperties } from 'react'
import type { Tag } from '../lib/tagColor'

/** One tag's badge look; the admin list reuses it so a tag looks the same everywhere. */
export const tagBadge = (color: string): CSSProperties => ({
  display: 'inline-block',
  padding: '1px 8px',
  borderRadius: 999,
  border: `1px solid ${color}`,
  // The colour itself is a mid tone; a wash of it behind dark text stays readable on any page.
  background: `${color}2E`,
  color: '#2A2016',
  fontFamily: 'inherit',
  fontSize: 12,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
})

/** A post's tags as hashtags, each a badge in its tag's colour. */
export function TagBadges({ tags, style }: { tags: Tag[]; style?: CSSProperties }) {
  if (!tags.length) return null
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, ...style }}>
      {tags.map((t) => (
        <span key={t.id} style={tagBadge(t.color)}>
          #{t.label}
        </span>
      ))}
    </span>
  )
}
