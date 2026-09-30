import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * Chỉ mục của tab Cấu hình và các phần nội dung phải khớp nhau.
 *
 * `BoxIndex` đọc `CONFIG_BOXES` để vẽ ra các mục, rồi cuộn tới phần tử có
 * `id` đúng bằng `id` của mục vừa bấm. Cái mang `id` ấy là một `<Section>`
 * viết tay ở tận dưới. Hai chỗ ấy không có gì buộc phải khớp: đổi tên hay
 * thêm một mục mà quên sửa chỗ kia thì TypeScript không kêu, màn vẫn dựng,
 * test cũ vẫn xanh — chỉ có cái nút bấm không đi đâu cả. Hỏng im lặng, đúng
 * kiểu khó tìm nhất.
 *
 * Nên test này dựng màn thật rồi soi DOM, chứ không đọc mã.
 */

vi.mock('../admin/lib/apiClient', () => ({
  getSite: () => Promise.resolve({}),
  listModules: () => Promise.resolve([]),
  listPosts: () => Promise.resolve([]),
  listTemplates: () => Promise.resolve([]),
  listTags: () => Promise.resolve([]),
  updateSite: (p: unknown) => Promise.resolve(p),
  createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn(),
  createModule: vi.fn(), deleteModule: vi.fn(), reorderModules: vi.fn(),
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

const { Cms, CONFIG_BOXES, GRID_LABEL, TABS } = await import('./Cms')

const tabLabel = (k: string) => TABS.find((t) => t.k === k)!.t

/*
 * jsdom không cài `scrollIntoView`, mà bấm một mục nào cũng gọi nó — thiếu thì
 * mọi test ở đây ném lỗi ngoài luồng. Gắn một cái giả cho cả tệp, và nó cũng
 * chính là chỗ đọc xem phần nào bị cuộn tới.
 */
const scrolled: string[] = []
Element.prototype.scrollIntoView = function (this: Element) {
  scrolled.push(this.id)
}
beforeEach(() => {
  scrolled.length = 0
})

/*
 * Chỉ mục, chứ không phải cả trang: "Trang chủ" cũng là một chặng trên đường
 * dẫn ngay phía trên, nên tìm khắp màn thì trúng hai chỗ.
 */
const index = async () => within(await screen.findByLabelText(GRID_LABEL))

/** Mở tab Cấu hình và đợi nội dung dựng xong. */
async function openConfig() {
  render(<Cms />)
  ;(await screen.findByText(tabLabel('config'))).click()
  await screen.findByLabelText(GRID_LABEL)
}

/** `<Section>` mờ đi bằng `opacity`, nên đó là thứ phải đọc. */
const dim = (id: string) => document.getElementById(id)!.style.opacity

describe('chỉ mục của tab Cấu hình', () => {
  it('mỗi mục ở chỉ mục có đúng một phần nội dung mang id của nó', async () => {
    await openConfig()
    for (const b of CONFIG_BOXES) {
      expect((await index()).queryAllByText(b.t).length, `thiếu mục “${b.t}”`).toBe(1)
      expect(document.getElementById(b.id), `mục “${b.t}” không trỏ vào đâu`).not.toBeNull()
    }
  })

  it('không có phần nội dung nào thừa ra ngoài chỉ mục', async () => {
    await openConfig()
    const named = new Set(CONFIG_BOXES.map((b) => b.id))
    for (const el of document.querySelectorAll('section[id]')) {
      expect(named.has(el.id), `phần “${el.id}” không có mục nào ở chỉ mục trỏ tới`).toBe(true)
    }
  })

  it('hiện hết mọi phần ngay từ đầu, không phải bấm mới thấy', async () => {
    await openConfig()
    // Chưa bấm gì: cả năm phần đều có mặt và đều rõ như nhau.
    for (const b of CONFIG_BOXES) {
      expect(document.getElementById(b.id), `phần “${b.t}” chưa dựng`).not.toBeNull()
      expect(dim(b.id), `phần “${b.t}” mờ sẵn khi chưa ai chọn gì`).toBe('1')
    }
  })

  it('bấm một mục thì phần ấy sáng, các phần khác mờ đi', async () => {
    await openConfig()
    const picked = CONFIG_BOXES[2]
    ;(await (await index()).findByText(picked.t)).click()

    await waitFor(() => expect(dim(picked.id)).toBe('1'))
    for (const b of CONFIG_BOXES) {
      if (b.id === picked.id) continue
      expect(Number(dim(b.id)), `phần “${b.t}” đáng lẽ phải mờ`).toBeLessThan(1)
    }
  })

  it('mục đang chọn tự nói ra là nó đang được chọn', async () => {
    await openConfig()
    const picked = CONFIG_BOXES[1]
    const entry = await (await index()).findByText(picked.t)
    entry.click()

    // `aria-current` chứ không `aria-pressed`: mục này không bật cái gì lên,
    // nó nói đang đứng ở đâu trong một trang dài.
    await waitFor(() => {
      expect(entry.closest('button')).toHaveAttribute('aria-current', 'true')
    })
    const others = CONFIG_BOXES.filter((b) => b.id !== picked.id)
    for (const b of others) {
      const el = await (await index()).findByText(b.t)
      expect(el.closest('button')).toHaveAttribute('aria-current', 'false')
    }
  })

  it('bấm một mục thì cuộn tới đúng phần ấy', async () => {
    await openConfig()
    const picked = CONFIG_BOXES[3]
    ;(await (await index()).findByText(picked.t)).click()

    await waitFor(() => expect(scrolled).toContain(picked.id))
  })
})

describe('khối sửa module', () => {
  /*
   * Nó từng nằm giữa 484 dòng của một tab chữ dài, và chủ site đi tìm ô "Nằm
   * trong" mãi không ra. Nay nó là một phần riêng, có mục riêng ở chỉ mục.
   */
  it('là một phần riêng, đứng cạnh các phần chữ chứ không lẫn vào', async () => {
    await openConfig()
    expect(document.getElementById('modules')).not.toBeNull()
    expect(document.getElementById('landing')).not.toBeNull()
    // Không phần nào lồng trong phần nào.
    expect(document.getElementById('modules')!.contains(document.getElementById('landing'))).toBe(false)
  })
})
