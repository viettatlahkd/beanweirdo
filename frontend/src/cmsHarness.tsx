/**
 * Trang thử cho màn `Cấu hình` — dựng `Cms` thật với một máy chủ giả.
 *
 * Khu quản trị nằm sau cổng đăng nhập và chỉ chủ site có mật khẩu, nên không
 * phiên nào mở được `/ad-config` để nhìn. Mà cây module là chỗ kéo thả: nó phụ
 * thuộc vào **chiều cao thật của một thẻ** — `whereIn` trong `Cms.tsx` chia
 * thẻ làm bốn phần để biết con trỏ đang định đặt thẻ cạnh hay vào trong. jsdom
 * trả về chiều cao 0 cho mọi thứ, nên đúng cái quan trọng nhất ở đây là cái nó
 * không kiểm được.
 *
 * Trang này chặn `fetch` và trả về một cây module dựng sẵn, nên nó không đụng
 * tới dữ liệu thật của chủ site và chạy được mà không cần mật khẩu.
 *
 *   npx vite frontend --port 5199
 *   mở http://127.0.0.1:5199/cms-harness.html
 */
import { createRoot } from 'react-dom/client'
// Đúng hai tệp css mà `main.tsx` nạp — thiếu chúng thì mọi nút vẽ ra viền mặc
// định của trình duyệt, và trang thử bày một màn khác màn thật.
import './global.css'
import './admin/admin.css'

type Row = Record<string, unknown>

const mod = (id: string, title: string, sort_order: number, parent_id: string | null, kind = 'normal'): Row => ({
  id,
  title,
  accent: parent_id ? '#C0705A' : '#6FA8C0',
  on_color: '#0E2C38',
  tint: '#DDEBF0',
  tint2: '#C6DDE5',
  layout: 'band',
  concept: '',
  blurb: '',
  long_desc: '',
  treatment: '',
  layout_note: '',
  shot1: '', shot2: '', shot3: '',
  img1: null, img2: null, img3: null,
  feature_cells: [],
  page_img1: null, page_img2: null, page_img3: null, page_img4: null,
  page_shot1: '', page_shot2: '', page_shot3: '', page_shot4: '',
  sort_order,
  parent_id,
  kind,
})

/*
 * Năm tầng. Ba tầng là đủ để nhìn lề thụt và cỡ chữ giảm dần, nhưng cỡ chữ
 * dừng giảm ở tầng 3 — nên chỗ duy nhất đo được nét dọc có làm nổi việc của nó
 * hay không là từ tầng 4 trở xuống.
 */
let MODULES: Row[] = [
  mod('tu-duy', 'tư duy tư duy', 1, null),
  mod('bean', 'bean weirdo', 2, null),
  mod('roasting', 'roasting 101', 3, 'bean'),
  mod('biochem', 'biochemistry 101', 4, 'bean'),
  mod('maillard', 'phản ứng Maillard', 5, 'biochem'),
  mod('melanoidin', 'melanoidin', 6, 'maillard'),
  mod('mau-nau', 'màu nâu từ đâu ra', 7, 'melanoidin'),
  mod('sensory', 'sensory', 8, null),
  mod('ghi-01', 'Ghi 01', 9, null, 'special'),
  mod('ghi-02', 'Ghi 02', 10, null, 'special'),
]

let AUTHORS: Row[] = [
  { id: 'a1', name: 'Norway', slug: 'norway', avatar_url: null, bio: 'Rang cà phê, viết về vị.', active: true, created_at: '', post_count: 12 },
  { id: 'a2', name: 'Mai Anh', slug: 'mai-anh', avatar_url: null, bio: '', active: true, created_at: '', post_count: 0 },
  { id: 'a3', name: 'Khách mời cũ', slug: 'khach-moi', avatar_url: null, bio: 'Viết hai bài về sensory năm ngoái.', active: false, created_at: '', post_count: 2 },
]

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}

  if (url.includes('/api/modules') && method === 'PUT') {
    const order = body.order as string[]
    MODULES = order.map((id, i) => ({ ...MODULES.find((m) => m.id === id)!, sort_order: i + 1 }))
    console.log('PUT /api/modules', order.join(' → '))
    return json({ modules: MODULES })
  }
  if (url.includes('/api/modules/') && method === 'PATCH') {
    const id = url.split('/api/modules/')[1].split('?')[0]
    MODULES = MODULES.map((m) => (m.id === id ? { ...m, ...body } : m))
    console.log('PATCH', id, JSON.stringify(body))
    return json({ module: MODULES.find((m) => m.id === id) })
  }
  if (url.includes('/api/authors') && method === 'POST') {
    const author = { id: crypto.randomUUID(), slug: String(body.name).toLowerCase().replace(/\s+/g, '-'), avatar_url: null, bio: '', active: true, created_at: '', post_count: 0, ...body }
    AUTHORS = [...AUTHORS, author]
    return json({ author })
  }
  if (url.includes('/api/authors/') && method === 'PATCH') {
    const id = url.split('/api/authors/')[1]
    AUTHORS = AUTHORS.map((a) => (a.id === id ? { ...a, ...body } : a))
    return json({ author: AUTHORS.find((a) => a.id === id) })
  }
  if (url.includes('/api/authors')) return json({ authors: AUTHORS })
  if (url.includes('/api/modules')) return json({ modules: MODULES })
  if (url.includes('/api/posts')) return json({ posts: [] })
  if (url.includes('/api/tags')) return json({ tags: [] })
  if (url.includes('/api/templates')) return json({ templates: [] })
  if (url.includes('/api/site')) return json({ site: {} })
  return json({})
}

const { Cms } = await import('./screens/Cms')
const { NavContext } = await import('./lib/nav')
const { ToastProvider } = await import('./design/Toaster')

const nop = () => {}
const nav = {
  screen: 'cms', area: 'admin', variant: 'a', moduleId: '', postId: null, articleFrom: 'admin',
  // `?tab=authors` mở thẳng tab khác; mặc định vẫn là Cấu hình.
  cmsTab: new URLSearchParams(location.search).get('tab') ?? 'config',
  goLanding: nop, goHome: nop, goArchive: nop, goHours: nop, goNotes: nop, goCms: nop,
  openModule: nop, openArticle: nop, toggleVariant: nop,
  newPost: nop, editPost: nop, previewPost: nop,
} as unknown as Parameters<typeof NavContext.Provider>[0]['value']

createRoot(document.getElementById('root')!).render(
  <NavContext.Provider value={nav}>
    <ToastProvider>
      <Cms />
    </ToastProvider>
  </NavContext.Provider>,
)
