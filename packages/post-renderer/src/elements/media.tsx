/** Elements that are a picture, or stand where one will be. */
import { cropStyle, fillStyle } from '../focus'
import { sans } from '../tokens'
import { registerElement, type ElementViewProps } from './registry'

export type ImageAttrs = {
  type: 'image'
  id?: string
  caption: string
  imageUrl?: string | null
  /** Where a reader lands when they click the picture; none means it is not a link. */
  href?: string | null
}

/**
 * The link target as it may be drawn, or null.
 *
 * The owner types this into a box and the page draws it as an `href`, so a
 * `javascript:` address would run on every reader's click. Only web addresses,
 * mail and in-site paths pass; a bare `example.com` is read as a web address
 * because that is what someone pasting it means.
 */
export function safeHref(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (v === '') return null
  if (v.startsWith('/') && !v.startsWith('//')) return v
  if (/^(https?:|mailto:)/i.test(v)) return v
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null
  return `https://${v.replace(/^\/+/, '')}`
}

registerElement<ImageAttrs>({
  name: 'image',
  title: 'Ảnh',
  category: 'media',
  description: 'Một tấm ảnh, chú thích tuỳ chọn. Chưa có ảnh thì là ô màu chờ.',
  keywords: ['ảnh', 'hình', 'image', 'photo', 'chú thích'],
  attributes: {
    imageUrl: { type: 'string', note: 'địa chỉ ảnh; rỗng thì vẽ ô màu chờ', optional: true },
    caption: { type: 'string', note: 'chú thích dưới ảnh' },
    href: { type: 'string', note: 'bấm vào ảnh thì mở link này; rỗng thì ảnh không bấm được', optional: true },
  },
  blank: () => ({ type: 'image', caption: '', imageUrl: null }),
  View: ({ attributes, palette, index, testId, render }: ElementViewProps<ImageAttrs>) => {
    const href = attributes.imageUrl ? safeHref(attributes.href) : null
    const picture = (
      <div
        data-testid={testId}
        style={{
          /*
           * A photo cut by hand takes the shape it was cut to; one placed before
           * cropping existed keeps the 250px strip it was published with.
           */
          ...(cropStyle(attributes.imageUrl) ?? { height: 250, ...fillStyle(attributes.imageUrl, palette.tint) }),
          display: 'flex',
          alignItems: 'flex-end',
          padding: 20,
          margin: '0 0 20px',
        }}
      >
        <div style={{ fontFamily: sans, fontSize: 10, color: palette.ink }}>
          {render?.renderImageCaption ? render.renderImageCaption(attributes.caption, index) : attributes.caption}
        </div>
      </div>
    )
    if (!href) return picture
    // A new tab: the reader is mid-article and the link is an aside, not the next page.
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
        {picture}
      </a>
    )
  },
})
