import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

/*
 * Gõ không tạo tag. Phải bấm.
 *
 * Chủ site: *"tạo thì phải có nút save lưu thì mới tạo chứ chứ giờ cứ điền 1
 * phát là tạo à?"* — và đổi tên cũng vậy: trước đây mỗi tag là một ô nhập nằm
 * thẳng trong danh sách, rời ô là đổi tên luôn, trên mọi bài đang đeo nó.
 *
 * Hai bài kiểm ở đây chốt đúng chỗ ấy: có gõ, chưa bấm, thì API phải im.
 */

const createTag = vi.fn(async (label: string) => ({ id: 'moi', label }))
const renameTag = vi.fn(async () => ({}))

vi.mock('../admin/lib/apiClient', () => ({
  getSite: () => Promise.resolve({}),
  listModules: () => Promise.resolve([]),
  listPosts: () => Promise.resolve([]),
  listTemplates: () => Promise.resolve([]),
  listTags: () => Promise.resolve([{ id: 't1', label: 'note' }]),
  updateSite: (p: unknown) => Promise.resolve(p),
  createTag: (...a: [string]) => createTag(...a),
  renameTag: (...a: [string, string]) => renameTag(...a),
  deleteTag: vi.fn(),
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
const CONFIG_TAB = TABS.find((t) => t.k === 'config')!.t
const TAG_BOX = CONFIG_BOXES.find((b) => b.id === 'tag')!.t

// jsdom không cài `scrollIntoView`, mà bấm một mục ở chỉ mục thì gọi tới nó.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

/*
 * Tab Cấu hình nay bày cả năm phần một lúc, nên ô Tag đã có sẵn trên màn ngay
 * khi mở tab — bấm mục "Tag" ở chỉ mục chỉ là cuộn tới nó. Phải tìm trong đúng
 * chỉ mục: chữ "Tag" giờ có ở cả hai chỗ, mục lẫn tiêu đề của phần.
 */
const openCopyTab = async () => {
  render(<Cms />)
  ;(await screen.findByText(CONFIG_TAB)).click()
  const index = within(await screen.findByLabelText(GRID_LABEL))
  ;(await index.findByText(TAG_BOX)).click()
}

describe('tạo tag', () => {
  it('gõ xong mà chưa bấm thì chưa tạo gì', async () => {
    const user = userEvent.setup()
    await openCopyTab()

    await user.type(await screen.findByLabelText('tên tag mới'), 'quan sát')
    // Rời ô — lối cũ tạo ngay ở đây.
    await user.tab()

    expect(createTag).not.toHaveBeenCalled()
  })

  it('bấm Tạo tag thì mới tạo', async () => {
    const user = userEvent.setup()
    await openCopyTab()

    await user.type(await screen.findByLabelText('tên tag mới'), 'quan sát')
    await user.click(screen.getByRole('button', { name: /tạo tag/i }))

    await waitFor(() => expect(createTag).toHaveBeenCalledWith('quan sát'))
  })
})

describe('đổi tên tag', () => {
  it('sửa ô rồi rời ô thì chưa đổi — phải bấm Lưu tên', async () => {
    const user = userEvent.setup()
    await openCopyTab()

    // Danh sách chỉ để chọn; sửa tên nằm ở khung chi tiết.
    await user.click(await screen.findByRole('button', { name: 'note' }))
    const box = await screen.findByLabelText('tên tag note')
    await user.clear(box)
    await user.type(box, 'ghi chú')
    await user.tab()

    expect(renameTag).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /lưu tên/i }))
    await waitFor(() => expect(renameTag).toHaveBeenCalledWith('t1', 'ghi chú'))
  })
})
