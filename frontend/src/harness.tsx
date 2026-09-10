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
const tpl = (new URLSearchParams(location.search).get('t') ?? 'report') as 'report' | 'memo' | 'bitesize'
const body = tpl === 'report' ? els : { len: 'ngắn', subtitle: 'phụ đề', elements: els }
function Harness() {
  const [b, setB] = useState<unknown>(body)
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
