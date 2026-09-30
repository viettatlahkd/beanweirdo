import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/*
 * Cây module trong CMS: nhiều tầng, kéo thả được vào trong nhau.
 *
 * Chủ site: *"trong trang này chỗ tree module ấy, các module đang là 1 lv
 * thôi. tôi muốn làm thành nhiều lv các module có thể kéo thả nằm bên trong
 * nhau thì sao?"*
 *
 * Cột `parent_id` có từ migration 0025 và cả site đã đọc nó, nhưng bảng này
 * vẫn bày một danh sách phẳng, còn cách duy nhất đặt cha là ô chọn "Nằm
 * trong" nằm khuất trong biểu mẫu sửa.
 *
 * Test dựng màn thật rồi kéo thả. jsdom không đo được thẻ — mọi
 * `getBoundingClientRect` đều trả về 0 — nên hàm nào phải biết con trỏ đang ở
 * phần nào của thẻ thì test phải tự dựng khung cho thẻ ấy.
 */

const reorderModules = vi.fn(async (order: string[]) =>
  order.map((id) => MODULES.find((m) => m.id === id)!),
)
const updateModule = vi.fn(async (_id: string, patch: unknown) => patch)

const mod = (
  id: string,
  sort_order: number,
  kind: 'normal' | 'special',
  parent_id: string | null = null,
) => ({
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
  parent_id,
  kind,
})

/** `roasting` đã nằm trong `bean`; phần còn lại ở tầng trên cùng. */
const MODULES = [
  mod('bean', 1, 'normal'),
  mod('roasting', 2, 'normal', 'bean'),
  mod('tu-duy', 3, 'normal'),
  mod('vi-giac', 4, 'normal'),
  mod('ghi-01', 5, 'special'),
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
  reorderPosts: vi.fn(),
  updateModule: (...a: [string, unknown]) => updateModule(...a),
  updatePost: vi.fn(),
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

Element.prototype.scrollIntoView = function () {}

const row = (title: string) =>
  screen.getByRole('button', { name: title }).closest('[draggable]') as HTMLElement

const shown = () =>
  Array.from(document.querySelectorAll('[draggable]'))
    .map((el) => el.querySelector('.ab-disclose')?.textContent)
    .filter(Boolean)

/** Hàng chữ bên trong thẻ — chỗ mang lề thụt vào của tầng. */
const line = (title: string) =>
  screen.getByRole('button', { name: title }).parentElement as HTMLElement

/**
 * Kéo `from` thả lên `to`, con trỏ ở phần nào của thẻ do `part` quyết định:
 * 0 là sát mép trên, 1 là sát mép dưới.
 */
function drag(from: string, to: string, part: number) {
  const target = row(to)
  // 40px là chiều cao thật của một hàng; con số nào cũng được miễn khác 0,
  // vì thứ mã đọc là tỉ lệ chứ không phải pixel.
  target.getBoundingClientRect = () =>
    ({ top: 100, height: 40, bottom: 140, left: 0, right: 0, width: 0, x: 0, y: 100 }) as DOMRect
  /*
   * `MouseEvent`, không phải `fireEvent.dragOver(el, { clientY })`: jsdom
   * không cài `DragEvent`, nên testing-library dựng ra một `Event` trơn và
   * `clientY` trong init rơi mất — handler đọc được `undefined`. Mà `clientY`
   * đúng là thứ cả bài kiểm này xoay quanh.
   */
  const at = (type: string) =>
    new MouseEvent(type, { bubbles: true, cancelable: true, clientY: 100 + 40 * part })
  fireEvent.dragStart(row(from))
  fireEvent(target, at('dragover'))
  fireEvent(target, at('drop'))
}

async function openConfig() {
  render(
    <ToastProvider>
      <Cms />
    </ToastProvider>,
  )
  ;(await screen.findByText(TABS.find((t) => t.k === 'config')!.t)).click()
  await screen.findByText('bean')
}

describe('cây module trong CMS', () => {
  it('bày module con ngay dưới cha nó, thụt vào một nấc', async () => {
    await openConfig()
    expect(shown()).toEqual(['bean', 'roasting', 'tu-duy', 'vi-giac', 'ghi-01'])
    // Tầng trên cùng không thụt; tầng con thụt đúng một nấc.
    expect(line('bean').style.marginLeft).toBe('0px')
    expect(line('roasting').style.marginLeft).toBe('29px')
    expect(line('tu-duy').style.marginLeft).toBe('0px')
  })

  it('số thứ tự đếm lại từ 01 trong mỗi tầng', async () => {
    await openConfig()
    // Tầng trên cùng: bean 01, tu-duy 02, vi-giac 03, ghi-01 04. `roasting`
    // là con duy nhất của `bean` nên nó cũng là 01, không phải 02 của cả bảng.
    // Lọc theo `.ab-disclose` như `shown()`: màn này còn những thẻ kéo được
    // khác (dải ảnh, danh sách bài), và chúng không phải module.
    const numbers = Array.from(document.querySelectorAll('[draggable]'))
      .filter((el) => el.querySelector('.ab-disclose'))
      .map((el) => el.querySelector('div[style*="width: 26px"]')?.textContent)
    expect(numbers).toEqual(['01', '01', '02', '03', '04'])
  })

  /*
   * Thả vào giữa thẻ là hai lượt ghi, và `parent_id` phải đi trước: `PUT
   * /api/modules` đọc lại cả bảng để trả về, nên ghi ngược thứ tự thì màn hình
   * dựng lại cây cũ đè lên cây vừa kéo.
   */
  it('thả vào giữa một thẻ thì module chui vào trong thẻ ấy', async () => {
    await openConfig()
    reorderModules.mockClear()
    updateModule.mockClear()
    drag('tu-duy', 'bean', 0.5)

    await waitFor(() => expect(reorderModules).toHaveBeenCalledTimes(1))
    expect(updateModule).toHaveBeenCalledWith('tu-duy', { parent_id: 'bean' })
    // Cắm xuống cuối danh sách con của `bean`, sau `roasting`.
    expect(reorderModules.mock.calls[0][0]).toEqual([
      'bean', 'roasting', 'tu-duy', 'vi-giac', 'ghi-01',
    ])
  })

  it('thả lên mép trên thì chỉ đổi thứ tự, không đổi cha', async () => {
    await openConfig()
    reorderModules.mockClear()
    updateModule.mockClear()
    drag('tu-duy', 'bean', 0.05)

    await waitFor(() => expect(reorderModules).toHaveBeenCalledTimes(1))
    expect(reorderModules.mock.calls[0][0]).toEqual([
      'tu-duy', 'bean', 'roasting', 'vi-giac', 'ghi-01',
    ])
    expect(updateModule).not.toHaveBeenCalled()
  })

  /*
   * Mép dưới của một thẻ có con phải nhảy qua hết cụm con ấy. Cắm ngay sau
   * dòng `bean` thì thẻ rơi vào giữa ruột `bean` trong khi cha nó là tầng trên
   * cùng — và cây dựng lại từ `sort_order` sẽ khác cái vừa nhìn thấy.
   */
  it('thả xuống mép dưới một thẻ có con thì qua hết cả cụm con', async () => {
    await openConfig()
    reorderModules.mockClear()
    updateModule.mockClear()
    drag('vi-giac', 'bean', 0.95)

    await waitFor(() => expect(reorderModules).toHaveBeenCalledTimes(1))
    expect(reorderModules.mock.calls[0][0]).toEqual([
      'bean', 'roasting', 'vi-giac', 'tu-duy', 'ghi-01',
    ])
    // Xuống dưới `bean`, ngang hàng với nó — không chui vào trong.
    expect(updateModule).not.toHaveBeenCalled()
  })

  it('từ chối thả một module vào trong chính con của nó, và nói vì sao', async () => {
    await openConfig()
    reorderModules.mockClear()
    updateModule.mockClear()
    drag('bean', 'roasting', 0.5)

    expect(await screen.findByText('Không đặt được module vào trong chính nó')).toBeTruthy()
    expect(reorderModules).not.toHaveBeenCalled()
    expect(updateModule).not.toHaveBeenCalled()
    expect(shown()).toEqual(['bean', 'roasting', 'tu-duy', 'vi-giac', 'ghi-01'])
  })

  it('nhật ký đứng cạnh được nhưng không lồng vào một module đọc', async () => {
    await openConfig()
    reorderModules.mockClear()
    updateModule.mockClear()
    drag('ghi-01', 'tu-duy', 0.5)

    expect(await screen.findByText('Nhật ký và module đọc không lồng vào nhau được')).toBeTruthy()
    expect(reorderModules).not.toHaveBeenCalled()
    expect(updateModule).not.toHaveBeenCalled()
  })

  it('kéo được Ghi 01 lên đứng cạnh một module đọc', async () => {
    await openConfig()
    reorderModules.mockClear()
    updateModule.mockClear()
    drag('ghi-01', 'tu-duy', 0.1)

    await waitFor(() => expect(reorderModules).toHaveBeenCalledTimes(1))
    expect(reorderModules.mock.calls[0][0]).toEqual([
      'bean', 'roasting', 'ghi-01', 'tu-duy', 'vi-giac',
    ])
    expect(updateModule).not.toHaveBeenCalled()
  })
})
