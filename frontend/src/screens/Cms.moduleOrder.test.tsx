import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/*
 * Kéo thẻ module trong CMS phải đổi đúng thứ tự mà site đọc.
 *
 * Chủ site: *"hiện tại đổi chỗ các module ở đây nó không đổi chỗ ở trang chủ
 * và đổi chỗ ở cột dọc bên trái."*
 *
 * Từ 2026-09-24 site xếp mọi module theo đúng `sort_order`, nhật ký cũng vậy —
 * chủ site muốn kéo Ghi 01 lên nằm chung với các module đọc. CMS và site đọc
 * cùng một hàm `bySiteOrder`, nên kéo ở đây là đổi đúng thứ tự trên trang.
 *
 * Test dựng màn thật rồi kéo thả, chứ không đọc mã.
 */

const reorderModules = vi.fn(async (order: string[]) => MODULES.filter((m) => order.includes(m.id)))

const mod = (id: string, sort_order: number, kind: 'normal' | 'special') => ({
  id,
  title: id,
  accent: '#6FA8C0',
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
  parent_id: null,
  kind,
})

/*
 * Cố ý cho `sort_order` xen kẽ hai loại: nhật ký giờ đứng đúng chỗ con số của
 * nó nói, không bị đẩy xuống cuối nữa.
 */
const MODULES = [
  mod('sensory', 1, 'normal'),
  mod('roasting', 2, 'normal'),
  mod('ghi-01', 3, 'special'),
  mod('tu-duy', 4, 'normal'),
  mod('ghi-02', 5, 'special'),
]

vi.mock('../admin/lib/apiClient', () => ({
  getSite: () => Promise.resolve({}),
  listModules: () => Promise.resolve(MODULES),
  listPosts: () => Promise.resolve([]),
  listTemplates: () => Promise.resolve([]),
  listTags: () => Promise.resolve([]),
  updateSite: (p: unknown) => Promise.resolve(p),
  createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn(),
  createModule: vi.fn(), deleteModule: vi.fn(),
  reorderModules: (...a: [string[]]) => reorderModules(...a),
  reorderPosts: vi.fn(), updateModule: vi.fn(), updatePost: vi.fn(),
  uploadImage: vi.fn(), transitionStatus: vi.fn(),
}))

vi.mock('../lib/nav', async () => {
  const { useState } = await import('react')
  return {
    useNav: () => {
      const [cmsTab, goCms] = useState('posts')
      return { cmsTab, goCms, openArticle: vi.fn(), goHome: vi.fn() }
    },
  }
})

const { Cms, TABS } = await import('./Cms')
const { ToastProvider } = await import('../design/Toaster')
const { bySiteOrder } = await import('../lib/moduleOrder')

// jsdom không cài sẵn `scrollIntoView`, mà chỉ mục của tab Cấu hình gọi nó.
Element.prototype.scrollIntoView = function () {}

async function openConfig() {
  // Toast thật, không giả: chỗ cần kiểm là chủ site có đọc được lời từ chối
  // hay không, mà `useToast` ngoài provider thì im lặng.
  render(
    <ToastProvider>
      <Cms />
    </ToastProvider>,
  )
  ;(await screen.findByText(TABS.find((t) => t.k === 'config')!.t)).click()
  await screen.findByText('sensory')
}

/** Hàng kéo thả của một module — thẻ `draggable` bọc ngoài tên nó. */
const row = (title: string) =>
  screen.getByRole('button', { name: title }).closest('[draggable]') as HTMLElement

/** Tên module theo đúng thứ tự đang vẽ trên màn. */
const shown = () =>
  Array.from(document.querySelectorAll('[draggable]'))
    .map((el) => el.querySelector('.ab-disclose')?.textContent)
    .filter(Boolean)

function drag(from: string, to: string) {
  fireEvent.dragStart(row(from))
  fireEvent.dragOver(row(to))
  fireEvent.drop(row(to))
}

describe('thứ tự module trong CMS', () => {
  it('bày đúng thứ tự sort_order, nhật ký xen giữa được', async () => {
    await openConfig()
    expect(shown()).toEqual(['sensory', 'roasting', 'ghi-01', 'tu-duy', 'ghi-02'])
    // Và đúng bằng thứ tự thanh bên dựng ra từ cùng dữ liệu.
    expect(shown()).toEqual([...MODULES].sort(bySiteOrder).map((m) => m.title))
  })

  it('kéo một module đọc thì ghi đúng thứ tự vừa nhìn thấy', async () => {
    await openConfig()
    reorderModules.mockClear()
    drag('tu-duy', 'sensory')

    await waitFor(() => expect(reorderModules).toHaveBeenCalledTimes(1))
    expect(reorderModules.mock.calls[0][0]).toEqual([
      'tu-duy', 'sensory', 'roasting', 'ghi-01', 'ghi-02',
    ])
  })

  it('kéo được nhật ký lên đầu, giữa các module đọc', async () => {
    await openConfig()
    reorderModules.mockClear()
    drag('ghi-02', 'sensory')

    await waitFor(() => expect(reorderModules).toHaveBeenCalledTimes(1))
    expect(reorderModules.mock.calls[0][0]).toEqual([
      'ghi-02', 'sensory', 'roasting', 'ghi-01', 'tu-duy',
    ])
    expect(screen.queryByText('Nhật ký — luôn xếp sau các module đọc')).toBeNull()
  })
})
