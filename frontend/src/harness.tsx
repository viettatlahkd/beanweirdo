import './admin/admin.css'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorCanvas } from './admin/screens/Editor'
import type { PostDetail } from './admin/lib/apiClient'
const els = [
  { type: 'heading', id: 'b1', level: 2, text: 'Trải nghiệm khi dùng' },
  { type: 'paragraph', id: 'b2', text: 'Một đoạn văn dài vừa đủ để xuống hai dòng khi cột hẹp lại nhé bạn.' },
  { type: 'quote', id: 'b3', text: 'Lời trích ở đây.', attribution: 'sổ tay' },
  { type: 'table', id: 't1', table: { columns: ['Ngày'], rows: [{ cells: ['01'] }] } },
  { type: 'paragraph', id: 'b4', text: 'Đoạn sau bảng.' },
]
type Tpl = 'report' | 'memo' | 'bitesize' | 'article' | 'longform' | 'cards'
const tpl = (new URLSearchParams(location.search).get('t') ?? 'report') as Tpl

/*
 * Article và longform có từ vựng thân bài riêng, và **chính hai cái ấy** là
 * chỗ nút `+` chèn sai vị trí (xem `mdBlocks.ts`). Trang thử mà chỉ dựng ba
 * khuôn element thì không bao giờ chạm tới lỗi đó, nên nay nó dựng cả sáu.
 */
const sections = [
  { h: 'Phần một', p: 'Một đoạn văn của phần một, dài vừa đủ để xuống dòng.' },
  { h: 'Phần hai', p: 'Đoạn của phần hai, **đậm *cả hai* đậm** và *nghiêng*.' },
  { h: 'Phần ba', p: 'Đoạn của phần ba.' },
]
const longform = [
  { k: 'h2', runs: [{ t: 'Tiêu đề longform' }] },
  // Đậm, nghiêng, và cả hai lồng trong đậm — ba trường hợp từng đọc sai.
  { k: 'p', runs: [{ t: 'Đoạn một ' }, { t: 'đậm ', w: '600', s: 'normal' }, { t: 'cả hai', w: '600', s: 'italic' }, { t: ' nghiêng', s: 'italic' }] },
  { k: 'p', runs: [{ t: 'Đoạn hai.' }] },
  { k: 'li', runs: [{ t: 'mục một' }], lvl: 1 },
  { k: 'p', runs: [{ t: 'Đoạn ba.' }] },
]
const cards = [{ t: 'Thẻ một', d: 'mô tả' }, { t: 'Thẻ hai', d: 'mô tả' }]
/*
 * `?b=empty` dựng bài rỗng, `?b=heads` dựng bài toàn tiêu đề — hai hình dạng
 * mà bài thật hay có mà bộ mẫu ở trên thì không.
 */
const variant = new URLSearchParams(location.search).get('b') ?? ''
const heads = [
  { type: 'heading', id: 'h1', level: 2, text: 'Tiêu đề một' },
  { type: 'heading', id: 'h2', level: 2, text: 'Tiêu đề hai' },
]
const lfHeads = [
  { k: 'h1', runs: [{ t: 'Tiêu đề lớn' }] },
  { k: 'h2', runs: [{ t: 'Tiêu đề nhỏ' }] },
]
const pick = <T,>(normal: T, empty: T, headings: T): T =>
  variant === 'empty' ? empty : variant === 'heads' ? headings : normal

const body =
  tpl === 'report' ? pick(els, [] as unknown as typeof els, heads as unknown as typeof els)
  : tpl === 'article' ? pick(sections, [] as unknown as typeof sections, sections.map((x) => ({ h: x.h, p: '' })))
  : tpl === 'longform' ? (variant === 'aside' ? [...longform, { k: 'aside', items: [{ k: 'p', runs: [{ t: 'trong hộp' }] }] }, { k: 'p', runs: [{ t: 'sau hộp' }] }] as unknown as typeof longform : pick(longform, [] as unknown as typeof longform, lfHeads as unknown as typeof longform))
  : tpl === 'cards' ? cards
  : { len: 'ngắn', subtitle: 'phụ đề', elements: pick(els, [] as unknown as typeof els, heads as unknown as typeof els) }
function Harness() {
  const [b, setB] = useState<unknown>(body)
  ;(window as unknown as { __body: unknown }).__body = b
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <EditorCanvas template={tpl}
        post={{ id: 'p1', module_id: 'sensory', en: 'Bài thử', vi: 'm', kind: 'note', date_label: '2026.09',
          status: 'draft', template: tpl, hero_image_url: null, theme_color: '#6FA8C0', sort_order: 0,
          slug: 'thu', lead: 'dẫn', further_reading: [], body: b } as unknown as PostDetail}
        onChange={(p) => { if ('body' in p) setB(p.body) }} onHeroDrop={() => {}} />
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<Harness />)
