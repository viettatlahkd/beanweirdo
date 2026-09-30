import type { AuthorRef } from 'api-contract'
import { sans } from '../design/tokens'

/**
 * "Viết bởi An, Bình" — drawn by the app under the breadcrumb of every
 * template, so the six templates in `post-renderer` did not each grow a slot
 * for it. It inherits the band's ink. Nothing at all when nobody is named, so
 * posts from before authors existed look exactly as they did.
 */
export function Byline({ authors }: { authors: AuthorRef[] }) {
  if (authors.length === 0) return null
  return (
    <div
      data-testid="byline"
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontFamily: sans, fontSize: 12, marginBottom: 24, opacity: 0.8 }}
    >
      <span>Viết bởi</span>
      {authors.map((a, i) => (
        <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {a.avatar_url && (
            <img src={a.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: 999, objectFit: 'cover' }} />
          )}
          {a.name}
          {i < authors.length - 1 && ','}
        </span>
      ))}
    </div>
  )
}
