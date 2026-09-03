/** Elements that are a picture, or stand where one will be. */
import { sans } from '../tokens'
import { registerElement, type ElementViewProps } from './registry'

export type ImageAttrs = { type: 'image'; id?: string; caption: string; imageUrl?: string | null }

export const image = registerElement<ImageAttrs>({
  name: 'image',
  title: 'Ảnh',
  category: 'media',
  description: 'Một tấm ảnh, chú thích tuỳ chọn. Chưa có ảnh thì là ô màu chờ.',
  keywords: ['ảnh', 'hình', 'image', 'photo', 'chú thích'],
  attributes: {
    imageUrl: { type: 'string', note: 'địa chỉ ảnh; rỗng thì vẽ ô màu chờ', optional: true },
    caption: { type: 'string', note: 'chú thích dưới ảnh' },
  },
  blank: () => ({ type: 'image', caption: '', imageUrl: null }),
  View: ({ attributes, palette, index, testId, render }: ElementViewProps<ImageAttrs>) => (
    <div
      data-testid={testId}
      style={{
        height: 250,
        background: palette.tint,
        display: 'flex',
        alignItems: 'flex-end',
        padding: 20,
        margin: '0 0 20px',
        backgroundImage: attributes.imageUrl ? `url(${attributes.imageUrl})` : undefined,
        backgroundSize: 'cover',
      }}
    >
      <div style={{ fontFamily: sans, fontSize: 10, color: palette.ink }}>
        {render?.renderImageCaption ? render.renderImageCaption(attributes.caption, index) : attributes.caption}
      </div>
    </div>
  ),
})
