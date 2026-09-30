import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/*
 * Gấp/mở một nhánh, và nét dọc theo tầng.
 *
 * Chủ site, sau khi dùng thử cây module:
 *
 *   *"Cây sâu 4 tầng trở lên: cỡ chữ dừng giảm ở tầng 3 nên từ tầng 4 hai tầng
 *   liền nhau chỉ khác lề thụt."*
 *   *"Chưa gấp/mở được một nhánh. Mũi tên hiện mở biểu mẫu sửa chứ không gấp
 *   cây, nên cây dài thì phải cuộn."*
 *
 * Tệp riêng chứ không nối vào `Cms.moduleTree.test.tsx` vì nó cần một cây sâu
 * bốn tầng, mà cây ở tệp kia chỉ hai tầng và mọi bài kiểm ở đó đọc đúng thứ tự
 * ấy.
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

/**
 * Bốn tầng — đúng chỗ chủ site nói là không đọc được nữa:
 *
 *   bean
 *     roasting
 *       biochem
 *         maillard
 *   tu-duy
 *   ghi-01
 */
const MODULES = [
  mod('bean', 1, 'normal'),
  mod('roasting', 2, 'normal', 'bean'),
  mod('biochem', 3, 'normal', 'roasting'),
  mod('maillard', 4, 'normal', 'biochem'),
  mod('tu-duy', 5, 'normal'),
  mod('ghi-01', 6, 'special'),
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

/**
 * jsdom không có `IntersectionObserver` lẫn `ResizeObserver`, mà biểu mẫu sửa
 * dựng `Rise` và `Preview` — cả hai đều gọi thẳng, không hỏi trước. Thiếu thì
 * React gỡ cả cây chứ không chỉ một ô, nên bài kiểm mở biểu mẫu thấy màn trắng.
 */
class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error test-only stub, not a full IntersectionObserver
global.IntersectionObserver = FakeObserver
// @ts-expect-error test-only stub, not a full ResizeObserver
global.ResizeObserver = FakeObserver

const row = (title: string) =>
  screen.getByRole('button', { name: title }).closest('[draggable]') as HTMLElement

const shown = () =>
  Array.from(document.querySelectorAll('[draggable]'))
    .map((el) => el.querySelector('.ab-disclose')?.textContent)
    .filter(Boolean)

/** Nét dọc của một hàng: con trực tiếp của thẻ hàng, đặt tuyệt đối. */
const guides = (title: string) =>
  Array.from(row(title).children)
    .filter((el) => (el as HTMLElement).style.position === 'absolute')
    .map((el) => (el as HTMLElement).style.left)

async function openConfig() {
  render(
    <ToastProvider>
      <Cms />
    </ToastProvider>,
  )
  ;(await screen.findByText(TABS.find((t) => t.k === 'config')!.t)).click()
  await screen.findByText('bean')
}

describe('nét dọc theo tầng', () => {
  it('mỗi hàng mang đúng số nét bằng độ sâu của nó', async () => {
    await openConfig()
    // Tầng trên cùng không cần nét nào: không có gì bao nó.
    expect(guides('bean')).toEqual([])
    expect(guides('roasting')).toEqual(['8px'])
    expect(guides('biochem')).toEqual(['8px', '37px'])
    // Tầng bốn — chỗ cỡ chữ đã hết giảm, nên nét là thứ duy nhất còn nói được
    // hàng này nằm trong hàng nào.
    expect(guides('maillard')).toEqual(['8px', '37px', '66px'])
    expect(guides('tu-duy')).toEqual([])
  })

  it('nét chạy bên trái hàng, không cắt qua nút nào', async () => {
    await openConfig()
    // Nét sâu nhất của `maillard` ở 66px, còn chữ của nó bắt đầu ở 87px.
    const deepest = Number.parseFloat(guides('maillard').at(-1)!)
    const left = Number.parseFloat(
      (screen.getByRole('button', { name: 'maillard' }).parentElement as HTMLElement).style.marginLeft,
    )
    expect(deepest).toBeLessThan(left)
  })
})

describe('gấp và mở một nhánh', () => {
  it('gấp một nhánh thì giấu cả cụm trong nó, sâu mấy tầng cũng vậy', async () => {
    await openConfig()
    expect(shown()).toEqual(['bean', 'roasting', 'biochem', 'maillard', 'tu-duy', 'ghi-01'])

    screen.getByRole('button', { name: 'Gấp nhánh bean' }).click()
    // Không chỉ `roasting` — cả cháu và chắt.
    await waitFor(() => expect(shown()).toEqual(['bean', 'tu-duy', 'ghi-01']))

    screen.getByRole('button', { name: 'Mở nhánh bean' }).click()
    await waitFor(() =>
      expect(shown()).toEqual(['bean', 'roasting', 'biochem', 'maillard', 'tu-duy', 'ghi-01']),
    )
  })

  it('gấp một nhánh giữa chừng chỉ giấu phần nằm dưới nó', async () => {
    await openConfig()
    screen.getByRole('button', { name: 'Gấp nhánh roasting' }).click()
    await waitFor(() => expect(shown()).toEqual(['bean', 'roasting', 'tu-duy', 'ghi-01']))
  })

  it('hàng không có con thì không có mũi tên', async () => {
    await openConfig()
    expect(screen.queryByRole('button', { name: 'Gấp nhánh maillard' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gấp nhánh tu-duy' })).toBeNull()
  })

  /*
   * Mũi tên đổi nghĩa, nên đường vào biểu mẫu sửa phải còn nguyên ở chỗ khác —
   * không thì bản sửa này lấy đi một việc trong lúc thêm một việc.
   */
  it('bấm tên module vẫn mở biểu mẫu sửa', async () => {
    await openConfig()
    expect(screen.queryByText('Tên module')).toBeNull()
    screen.getByRole('button', { name: 'bean' }).click()
    expect(await screen.findByText('Tên module')).toBeTruthy()
  })

  it('mũi tên không mở biểu mẫu sửa nữa', async () => {
    await openConfig()
    screen.getByRole('button', { name: 'Gấp nhánh bean' }).click()
    await waitFor(() => expect(shown()).toEqual(['bean', 'tu-duy', 'ghi-01']))
    expect(screen.queryByText('Tên module')).toBeNull()
  })

  /*
   * Thả một thẻ vào trong một nhánh đang gấp mà nhánh không mở ra thì thẻ vừa
   * kéo biến mất khỏi màn, và người ta tưởng lệnh hỏng.
   */
  it('thả vào trong một nhánh đang gấp thì nhánh ấy mở ra', async () => {
    await openConfig()
    screen.getByRole('button', { name: 'Gấp nhánh bean' }).click()
    await waitFor(() => expect(shown()).toEqual(['bean', 'tu-duy', 'ghi-01']))

    reorderModules.mockClear()
    updateModule.mockClear()
    const target = row('bean')
    target.getBoundingClientRect = () =>
      ({ top: 100, height: 40, bottom: 140, left: 0, right: 0, width: 0, x: 0, y: 100 }) as DOMRect
    // `MouseEvent` chứ không phải `fireEvent.dragOver`: jsdom không cài
    // `DragEvent`, nên `clientY` trong init rơi mất — xem `Cms.moduleTree.test.tsx`.
    const at = (type: string) =>
      new MouseEvent(type, { bubbles: true, cancelable: true, clientY: 120 })
    fireEvent.dragStart(row('tu-duy'))
    fireEvent(target, at('dragover'))
    fireEvent(target, at('drop'))

    await waitFor(() => expect(updateModule).toHaveBeenCalledWith('tu-duy', { parent_id: 'bean' }))
    await waitFor(() =>
      expect(shown()).toEqual(['bean', 'roasting', 'biochem', 'maillard', 'tu-duy', 'ghi-01']),
    )
  })
})
