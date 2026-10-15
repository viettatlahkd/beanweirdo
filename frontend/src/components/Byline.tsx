import type { CSSProperties } from 'react'
import type { AuthorRef } from 'api-contract'
import { serif, sans } from '../design/tokens'

/** The public read adds the bio for the card at the end; the admin's author list does not carry one. */
export type BylineAuthor = AuthorRef & { bio?: string | null }

export function Avatar({ author, size, ring }: { author: BylineAuthor; size: number; ring?: boolean }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 999,
    flex: 'none',
    objectFit: 'cover',
    // Opaque on purpose: stacked faces overlap, and a see-through disc (or a
    // transparent PNG) lets the face underneath show through.
    background: '#E4E0D8',
    color: '#3A3833',
    // The ring keeps overlapping faces apart on any band colour.
    boxShadow: ring ? '0 0 0 2px #fff' : undefined,
  }
  if (author.avatar_url) return <img src={author.avatar_url} alt="" style={style} />
  return (
    <span
      aria-hidden
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        textTransform: 'uppercase',
      }}
    >
      {author.name.slice(0, 1)}
    </span>
  )
}

/** "Viết bởi" at the end of the post, one row per author with their bio — Medium's "Written by". */
export function AuthorCard({ authors }: { authors: BylineAuthor[] }) {
  if (authors.length === 0) return null
  return (
    <div
      data-testid="author-card"
      style={{ borderTop: '1px solid rgba(127,127,127,.3)', marginTop: 40, paddingTop: 24, display: 'grid', gap: 20, fontFamily: sans }}
    >
      {authors.map((a) => (
        <div key={a.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Avatar author={a} size={56} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.6 }}>Viết bởi</div>
            <div style={{ fontFamily: serif, fontSize: 20, margin: '2px 0 6px' }}>{a.name}</div>
            {a.bio?.trim() && (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, opacity: 0.85, maxWidth: '60ch', whiteSpace: 'pre-line' }}>
                {a.bio.trim()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
