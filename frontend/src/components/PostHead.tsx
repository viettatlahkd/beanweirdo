import { Fragment, type CSSProperties, type ReactNode } from 'react'
import type { PostSite } from 'api-contract'
import { ink, sans, serif } from '../design/tokens'
import type { Tag } from '../lib/tagColor'
import { templateName } from '../lib/templateNames'
import { imageOf } from '../portfolio/layout'
import { Avatar, type BylineAuthor } from './Byline'
import { TagBadges } from './TagBadges'

/** The sites a post can be ticked for, as the reader sees them, each with its dot colour. */
export const SITE_CHIPS: Record<PostSite, { name: string; color: string }> = {
  biz: { name: 'biz', color: '#5B7DB1' },
  bean: { name: 'bean', color: '#B7795A' },
  blog: { name: 'personal blog', color: '#2B4B33' },
}

const dayOf = (iso: string): string | null => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`
}

type Props = {
  title: string
  lead?: string | null
  cover?: string | null
  authors: BylineAuthor[]
  topic?: string | null
  tags?: Tag[]
  shownOn?: PostSite[]
  /** Only a published post has one worth printing; callers pass null for a draft. */
  publishedAt?: string | null
  minutes?: number | null
  template?: string | null
}

/**
 * The head of the post page every site shares (owner picked mock B,
 * 2026-10-15): cover, title, lead, then the post's properties Notion style,
 * on the page's paper rather than a coloured band. The template draws only
 * the body under it (`head` in post-renderer), so every template opens alike.
 *
 * A property shows only when it has a value. `updated_at` is left out on
 * purpose: reordering or pinning a post moves it, so it would claim edits
 * nobody made.
 */
export function PostHead({ title, lead, cover, authors, topic, tags = [], shownOn = [], publishedAt, minutes, template }: Props) {
  const image = imageOf(cover)
  const date = publishedAt ? dayOf(publishedAt) : null
  const read = [minutes ? `${minutes} phút` : null, templateName(template) || null].filter(Boolean).join(' · ')
  const rows: [string, ReactNode][] = []
  if (authors.length)
    rows.push([
      'Tác giả',
      authors.map((a) => (
        <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Avatar author={a} size={24} />
          {a.name}
        </span>
      )),
    ])
  if (topic) rows.push(['Chủ đề', topic])
  if (tags.length) rows.push(['Tag', <TagBadges key="t" tags={tags} />])
  if (shownOn.length)
    rows.push([
      'Hiện ở',
      shownOn.map((s) => (
        <span key={s} style={chip}>
          <i style={{ width: 7, height: 7, borderRadius: 999, background: SITE_CHIPS[s].color }} />
          {SITE_CHIPS[s].name}
        </span>
      )),
    ])
  if (date) rows.push(['Ngày', date])
  if (read) rows.push(['Đọc', read])

  return (
    <header data-post-head style={{ maxWidth: 760, marginBottom: 40, fontFamily: sans, color: ink.base }}>
      {image && (
        <img
          src={image.src}
          alt=""
          style={{ display: 'block', width: '100%', aspectRatio: '16 / 7', objectFit: 'cover', objectPosition: image.position, borderRadius: 6, marginBottom: 32 }}
        />
      )}
      <h1 lang="en" style={{ fontFamily: serif, fontWeight: 500, fontSize: 'clamp(30px, 4.4vw, 46px)', lineHeight: 1.12, letterSpacing: '-.02em', margin: 0, color: ink.base, textWrap: 'balance' }}>
        {title}
      </h1>
      {lead?.trim() && (
        <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, lineHeight: 1.45, color: ink.soft, margin: '14px 0 0', maxWidth: '62ch' }}>{lead.trim()}</p>
      )}
      {rows.length > 0 && (
        <dl data-testid="post-props" style={props}>
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt style={{ color: ink.muted }}>{label}</dt>
              <dd style={{ margin: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', minWidth: 0, color: ink.strong }}>{value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </header>
  )
}

const RULE = '1px solid #E3DFD3'

const props: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '110px minmax(0, 1fr)',
  gap: '10px 16px',
  margin: '28px 0 0',
  padding: '16px 0',
  borderTop: RULE,
  borderBottom: RULE,
  fontSize: 14,
  lineHeight: 1.5,
}

const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: RULE,
  borderRadius: 999,
  padding: '1px 10px',
  fontSize: 13,
}
