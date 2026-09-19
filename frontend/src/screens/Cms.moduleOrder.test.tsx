import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/*
 * Kéo thẻ module trong CMS phải đổi đúng thứ tự mà site đọc.
 *
 * Chủ site: *"hiện tại đổi chỗ các module ở đây nó không đổi chỗ ở trang chủ
 * và đổi chỗ ở cột dọc bên trái."*
 *
 * Site xếp mọi module `special` (Ghi 01, Ghi 02) xuống dưới mọi module
 * `normal` — xem `byBandThenOrder`. CMS thì xếp phẳng theo `sort_order`. Nên
 * cùng một dữ liệu cho hai thứ tự khác nhau, và kéo một cuốn nhật ký lên một
 * bậc là đổi một con số không ai nhìn thấy.
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
 * Cố ý cho `sort_order` xen kẽ hai loại: đây chính là hình dạng dữ liệu thật
 * hôm 2026-09-19, khi "Ghi 01" đứng thứ tư trong CMS còn trên thanh bên nó
 * đứng thứ năm.
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
const { byBandThenOrder } = await import('../lib/moduleOrder')

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
  it('bày đúng thứ tự site đọc, nhật ký xuống dưới, không kèm nhãn nào', async () => {
    await openConfig()
    expect(screen.queryByText('Nhật ký — luôn xếp sau các module đọc')).toBeNull()
    // Không phải thứ tự `sort_order` phẳng (…, ghi-01, tu-duy, …).
    expect(shown()).toEqual(['sensory', 'roasting', 'tu-duy', 'ghi-01', 'ghi-02'])
    // Và đúng bằng thứ tự thanh bên dựng ra từ cùng dữ liệu.
    expect(shown()).toEqual([...MODULES].sort(byBandThenOrder).map((m) => m.title))
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

  it('không cho kéo nhật ký lên xen giữa các module đọc, và nói vì sao', async () => {
    await openConfig()
    reorderModules.mockClear()
    drag('ghi-01', 'sensory')

    // Site sẽ xếp nó xuống lại ngay, nên ghi một con số như thế là nói dối.
    await waitFor(() => expect(reorderModules).not.toHaveBeenCalled())
    expect(shown()).toEqual(['sensory', 'roasting', 'tu-duy', 'ghi-01', 'ghi-02'])

    // Chủ site: đừng để một dòng nhãn đứng đấy suốt, báo lúc kéo thôi. Nên
    // luật chỉ lên tiếng khi có người vấp phải nó.
    expect(await screen.findByText('Nhật ký — luôn xếp sau các module đọc')).toBeTruthy()
  })

  it('không nói gì khi kéo hợp lệ', async () => {
    await openConfig()
    drag('tu-duy', 'sensory')

    await waitFor(() => expect(reorderModules).toHaveBeenCalled())
    expect(screen.queryByText('Nhật ký — luôn xếp sau các module đọc')).toBeNull()
  })

  it('vẫn kéo được trong nội bộ nhóm nhật ký', async () => {
    await openConfig()
    reorderModules.mockClear()
    drag('ghi-02', 'ghi-01')

    await waitFor(() => expect(reorderModules).toHaveBeenCalledTimes(1))
    expect(reorderModules.mock.calls[0][0]).toEqual([
      'sensory', 'roasting', 'tu-duy', 'ghi-02', 'ghi-01',
    ])
  })
})
