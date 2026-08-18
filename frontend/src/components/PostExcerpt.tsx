import type { PostRow } from '../data/usePublishedPosts'
import { ink, sans, serif } from '../design/tokens'

type Section = { h?: string; p?: string }
type Card = { n?: string; title?: string; sub?: string }
type Block = { t?: string; v?: string }

/**
 * A post's own words, rendered inside the list it was opened from.
 *
 * System conventions, rule 07: opening an item in a listing expands it in
 * place rather than navigating away — and the listing query already carries
 * the whole post, so there is nothing further to fetch.
 *
 * Each template stores a different shape under `body`, so each is unwrapped to
 * the same thing: headings and prose. This is a reading excerpt, not the
 * template — the template is what you get on the post's own page.
 */
export function PostExcerpt({ post }: { post: PostRow }) {
  const body = Array.isArray(post.body) ? post.body : []

  const heading = { fontFamily: serif, fontSize: 19, lineHeight: 1.2, color: ink.base }
  const prose = {
    fontFamily: sans,
    fontWeight: 300,
    fontSize: 14.5,
    lineHeight: 1.55,
    color: ink.strong,
    maxWidth: 620,
  }

  if (body.length === 0) {
    return (
      <div style={{ ...prose, color: ink.muted, fontStyle: 'italic' }}>
        {post.lead ?? post.vi} — bài này chưa có nội dung.
      </div>
    )
  }

  if (post.template === 'cards') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(body as Card[]).map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint, width: 24, flex: 'none' }}>
              {c.n}
            </div>
            <div>
              <div style={heading}>{c.title}</div>
              <div style={{ ...prose, marginTop: 2 }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (post.template === 'report') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(body as Block[])
          .filter((b) => b.v && (b.t === 'h' || b.t === 'p'))
          .map((b, i) => (
            <div key={i} style={b.t === 'h' ? heading : prose}>
              {b.v}
            </div>
          ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {(body as Section[]).map((s, i) => (
        <div key={i}>
          {s.h && <div style={{ ...heading, marginBottom: 4 }}>{s.h}</div>}
          {s.p && <div style={prose}>{s.p}</div>}
        </div>
      ))}
    </div>
  )
}
