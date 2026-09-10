import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorCanvas } from './admin/screens/Editor'
import type { PostDetail } from './admin/lib/apiClient'
const start = [
  { type: 'heading', id: 'b1', level: 2, text: 'Overall feedback' },
  { type: 'paragraph', id: 'b2', text: 'Một đoạn văn ngắn.' },
  { type: 'list', id: 'b3', items: [
    { runs: [{ t: 'Mục một, khá dài để xem nó có xuống dòng đàng hoàng không nhé' }] },
    { runs: [{ t: 'Mục hai' }] },
    { runs: [{ t: 'Mục ba' }] },
  ] },
  { type: 'paragraph', id: 'b4', text: '' },
]
function Harness() {
  const [body, setBody] = useState<unknown>(start)
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <EditorCanvas template="report"
        post={{ id: 'p1', module_id: 'sensory', en: 'Bài thử', vi: 'm', kind: 'note', date_label: '2026.09',
          status: 'draft', template: 'report', hero_image_url: null, theme_color: '#6FA8C0', sort_order: 0,
          slug: 'thu', lead: 'dẫn', further_reading: [], body } as unknown as PostDetail}
        onChange={(p) => { if ('body' in p) { setBody(p.body); (window as never as { __body: unknown }).__body = p.body } }}
        onHeroDrop={() => {}} />
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<Harness />)
