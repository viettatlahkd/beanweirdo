/** The elements a post is mostly made of: words, and words set apart. */
import { ink, sans, serif } from '../tokens'
import { registerElement, type ElementViewProps } from './registry'

export type ParagraphAttrs = { type: 'paragraph'; id?: string; text: string }
export type HeadingAttrs = { type: 'heading'; id?: string; text: string; level?: 1 | 2 | 3 }
export type MetaAttrs = { type: 'meta'; id?: string; text: string }
export type QuoteAttrs = { type: 'quote'; id?: string; text: string; attribution?: string }
export type CalloutAttrs = { type: 'callout'; id?: string; text: string; heading?: string }

export const paragraph = registerElement<ParagraphAttrs>({
  name: 'paragraph',
  title: 'Đoạn văn',
  category: 'text',
  description: 'Khối cơ bản nhất — một đoạn chữ chạy.',
  keywords: ['đoạn', 'văn', 'chữ', 'text', 'body'],
  attributes: { text: { type: 'string', note: 'nội dung đoạn' } },
  blank: () => ({ type: 'paragraph', text: '' }),
  View: ({ attributes, index, testId, render }: ElementViewProps<ParagraphAttrs>) => (
    <div
      data-testid={testId}
      style={{ fontFamily: sans, fontWeight: 300, fontSize: 15.5, lineHeight: 1.55, color: ink.strong, margin: '0 0 20px', maxWidth: 660 }}
    >
      {render?.renderParagraph ? render.renderParagraph(attributes.text, index) : attributes.text}
    </div>
  ),
})

/**
 * Three sizes, one family. The smallest wears the module's colour so a level
 * reads at a glance instead of resting on a few points of type size.
 */
const HEADING: Record<1 | 2 | 3, { size: number; top: number; accented: boolean }> = {
  1: { size: 34, top: 40, accented: false },
  2: { size: 26, top: 20, accented: false },
  3: { size: 20, top: 20, accented: true },
}

export const heading = registerElement<HeadingAttrs>({
  name: 'heading',
  title: 'Tiêu đề',
  category: 'text',
  description: 'Chia bài thành các phần có thứ bậc.',
  keywords: ['tiêu đề', 'đầu mục', 'heading', 'h1', 'h2', 'h3'],
  attributes: {
    text: { type: 'string', note: 'chữ của tiêu đề' },
    level: { type: 'number', note: 'cấp 1–3; vắng nghĩa là 1', optional: true },
  },
  blank: () => ({ type: 'heading', text: '', level: 1 }),
  View: ({ attributes, palette, index, testId, render }: ElementViewProps<HeadingAttrs>) => {
    const step = HEADING[attributes.level ?? 1]
    return (
      <div
        data-testid={testId}
        style={{
          fontFamily: serif,
          fontSize: step.size,
          lineHeight: 1.08,
          letterSpacing: '-.03em',
          color: step.accented ? palette.ink : '#172124',
          margin: `${step.top}px 0 20px`,
        }}
      >
        {render?.renderHeading ? render.renderHeading(attributes.text, index) : attributes.text}
      </div>
    )
  },
})

export const meta = registerElement<MetaAttrs>({
  name: 'meta',
  title: 'Dòng nhãn',
  category: 'text',
  description: 'Một dòng in hoa nhỏ — nơi chốn, ngày, lô.',
  keywords: ['nhãn', 'meta', 'ngày', 'eyebrow', 'label'],
  attributes: { text: { type: 'string', note: 'nội dung dòng nhãn' } },
  blank: () => ({ type: 'meta', text: '' }),
  View: ({ attributes, index, testId, render }: ElementViewProps<MetaAttrs>) => (
    <div
      data-testid={testId}
      style={{ fontFamily: sans, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8A8A7C', margin: '0 0 20px' }}
    >
      {render?.renderMeta ? render.renderMeta(attributes.text, index) : attributes.text}
    </div>
  ),
})

export const quote = registerElement<QuoteAttrs>({
  name: 'quote',
  title: 'Trích dẫn',
  category: 'text',
  description: 'Lời của người khác, có dấu ngoặc kép do template in.',
  keywords: ['trích', 'dẫn', 'quote', 'ngoặc kép'],
  attributes: {
    text: { type: 'string', note: 'lời được trích' },
    attribution: { type: 'string', note: 'nguồn', optional: true },
  },
  blank: () => ({ type: 'quote', text: '', attribution: '' }),
  View: ({ attributes, palette, testId }: ElementViewProps<QuoteAttrs>) => (
    <div data-testid={testId} style={{ margin: '20px 0', maxWidth: 660, position: 'relative', paddingLeft: 40 }}>
      {/* The mark belongs to the template — nobody should have to type it. */}
      <span aria-hidden style={{ position: 'absolute', left: 0, top: -8, fontFamily: serif, fontSize: 52, lineHeight: 1, color: palette.edge }}>
        “
      </span>
      <div style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.35, color: '#172124' }}>{attributes.text}</div>
      {attributes.attribution && (
        <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: palette.ink, marginTop: 8 }}>
          {attributes.attribution}
        </div>
      )}
    </div>
  ),
})

export const callout = registerElement<CalloutAttrs>({
  name: 'callout',
  title: 'Khối nhấn',
  category: 'text',
  description: 'Đoạn đặt trên nền riêng — chỗ đáng dừng lại.',
  keywords: ['nhấn', 'highlight', 'callout', 'kết luận', 'lưu ý'],
  attributes: {
    text: { type: 'string', note: 'nội dung' },
    heading: { type: 'string', note: 'nhãn nhỏ phía trên', optional: true },
  },
  blank: () => ({ type: 'callout', text: '', heading: '' }),
  View: ({ attributes, palette, testId }: ElementViewProps<CalloutAttrs>) => (
    <div
      data-testid={testId}
      style={{ background: palette.tint, borderLeft: `2px solid ${palette.accent}`, padding: 20, margin: '0 0 20px', maxWidth: 660 }}
    >
      {attributes.heading && (
        <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.ink, marginBottom: 8 }}>
          {attributes.heading}
        </div>
      )}
      <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 14.5, lineHeight: 1.55, color: ink.strong }}>{attributes.text}</div>
    </div>
  ),
})
