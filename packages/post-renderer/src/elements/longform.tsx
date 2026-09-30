/**
 * Hai khối long-form mang sẵn, nay khai vào kho dùng chung.
 *
 * Chủ site: *"menu [+] ấy cái nào cũng giống nhau hết nhé chứ không phải mỗi
 * template là một kiểu đâu nhé... nó là bộ skeleton luôn"*.
 *
 * Menu `+` đọc thẳng từ kho, nên một khối chỉ ra được menu khi nó **ở trong
 * kho**. Chừng nào `formula` và `aside` còn là hình dạng riêng của long-form
 * thì long-form buộc phải có menu riêng — và đó chính là chỗ lệch. Khai chúng
 * vào đây là bỏ luôn lý do tồn tại của cái menu riêng ấy, đồng thời cho mọi
 * khuôn khác dùng được hai khối này.
 *
 * Hình dạng giữ đúng như `Longform.tsx` vẫn vẽ: công thức có vạch bên trái
 * trên nền trắng, khung ghi chú nằm trên nền cát.
 */
import { sans } from '../tokens'
import { registerElement, type ElementViewProps } from './registry'
import { ElementList } from './view'

type FormulaAttrs = { type: 'formula'; id?: string; text: string }
type AsideAttrs = { type: 'aside'; id?: string; items: unknown[] }

registerElement<FormulaAttrs>({
  name: 'formula',
  title: 'Công thức',
  category: 'data',
  description: 'Một dòng công thức, đứng tách khỏi chữ chạy.',
  keywords: ['công thức', 'formula', 'phương trình', 'equation', 'phản ứng'],
  attributes: { text: { type: 'string', note: 'nội dung công thức' } },
  blank: () => ({ type: 'formula', text: '' }),
  View: ({ attributes, palette, index, testId, render }: ElementViewProps<FormulaAttrs>) => (
    <div
      data-testid={testId}
      style={{
        background: '#FFFFFF',
        borderLeft: `2px solid ${palette.ink}`,
        padding: '12px 16px',
        margin: '10px 0 12px',
        fontFamily: sans,
        fontSize: 13.5,
        color: palette.ink,
      }}
    >
      {render?.renderParagraph ? render.renderParagraph(attributes.text, index) : attributes.text}
    </div>
  ),
})

registerElement<AsideAttrs>({
  name: 'aside',
  title: 'Khung ghi chú',
  category: 'text',
  description: 'Một khung nền cát, đựng mấy khối nói nhỏ hơn phần còn lại.',
  keywords: ['khung', 'ghi chú', 'aside', 'hộp', 'note', 'bên lề'],
  attributes: { items: { type: 'array', note: 'các khối bên trong khung' } },
  blank: () => ({ type: 'aside', items: [{ type: 'paragraph', text: '' }] }),
  /*
   * Khung không có chữ nào thì không vẽ. Chèn từ menu `+` là được ngay một
   * khung với một đoạn rỗng, và trang từng bày ra những ô nền cát trống
   * trơn mà người đọc không hiểu từ đâu ra — bài AI Twin có ba ô như thế.
   */
  View: ({ attributes, palette, mobile, testId }: ElementViewProps<AsideAttrs>) =>
    isEmptyAside(attributes.items) ? null : (
    <div
      data-testid={testId}
      style={{ background: '#F3EEE1', padding: '24px 26px 20px', margin: '22px 0 26px' }}
    >
      {/* Khối trong khung là element như mọi chỗ khác — khung chỉ là cái nền. */}
      <ElementList elements={attributes.items} palette={palette} mobile={mobile} />
    </div>
    ),
})

/** Mọi khối con là đoạn chữ rỗng — thứ menu `+` vừa chèn mà chưa ai gõ. */
function isEmptyAside(items: unknown[] | undefined): boolean {
  return (items ?? []).every((x) => {
    const el = x as { type?: unknown; text?: unknown } | null
    return el?.type === 'paragraph' && String(el.text ?? '').trim() === ''
  })
}
