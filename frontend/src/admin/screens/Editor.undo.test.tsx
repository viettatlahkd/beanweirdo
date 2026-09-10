/**
 * Hoàn tác trên màn soạn thật.
 *
 * Phần lịch sử có test riêng ở `editHistory.test.ts`; chỗ này kiểm cái nối —
 * phím có tới được không, bản vá có chạy ngược đúng không, và cái quan trọng
 * nhất: xoá nhầm một khối rồi có lấy lại được không. Trước lượt này thì không:
 * `UNDO_MS` chỉ rút lại được một việc, trong hai giây.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReportBlock } from 'post-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Editor } from './Editor'

const saved = vi.fn()

vi.mock('../lib/apiClient', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getPost: vi.fn(async () => ({
    id: 'p1',
    module_id: 'sensory',
    en: 'Tiêu đề',
    vi: 'mô tả',
    kind: 'note',
    date_label: '2026.09',
    status: 'draft',
    template: 'report',
    hero_image_url: null,
    theme_color: null,
    sort_order: 0,
    slug: 'bai',
    lead: 'dẫn',
    further_reading: [],
    body: [
      { type: 'heading', id: 'b1', text: 'Mẻ rang #14' },
      { type: 'paragraph', id: 'b2', text: 'Đẩy lửa cao hơn 8%.' },
    ] as ReportBlock[],
  })),
  listModules: vi.fn(async () => []),
  updatePost: vi.fn(async (_id: string, patch: unknown) => saved(patch)),
}))

vi.mock('../../lib/nav', () => ({ useNav: () => ({ go: vi.fn() }) }))
vi.mock('../../data/usePostAddresses', () => ({
  usePostAddresses: () => ({ slugOf: (id: string) => id, idOf: (slug: string) => slug }),
}))

beforeEach(() => saved.mockClear())

const drawn = async (text: string) => {
  await waitFor(() => expect(screen.getByText(text)).toBeInTheDocument())
  return screen.getByText(text)
}

describe('Cmd+Z trên màn soạn', () => {
  it('lấy lại chữ vừa sửa', async () => {
    render(<Editor postId="p1" />)
    await userEvent.click(await drawn('Đẩy lửa cao hơn 8%.'))
    const field = screen.getByDisplayValue('Đẩy lửa cao hơn 8%.')
    await userEvent.type(field, ' Thêm.')
    await userEvent.tab()
    await drawn('Đẩy lửa cao hơn 8%. Thêm.')

    await userEvent.keyboard('{Meta>}z{/Meta}')

    await drawn('Đẩy lửa cao hơn 8%.')
  })

  it('**lấy lại được một khối đã xoá** — cái trước đây mất hẳn', async () => {
    render(<Editor postId="p1" />)
    await userEvent.click(await drawn('Đẩy lửa cao hơn 8%.'))
    await userEvent.clear(screen.getByDisplayValue('Đẩy lửa cao hơn 8%.'))
    await userEvent.tab()
    await waitFor(() => expect(screen.queryByText('Đẩy lửa cao hơn 8%.')).toBeNull())

    await userEvent.keyboard('{Meta>}z{/Meta}')

    await drawn('Đẩy lửa cao hơn 8%.')
  })

  it('lùi nhiều bậc, không phải một', async () => {
    render(<Editor postId="p1" />)
    await drawn('Mẻ rang #14')
    for (const add of ['A', 'B']) {
      await userEvent.click(screen.getByText(/Mẻ rang #14/))
      await userEvent.type(screen.getByDisplayValue(/Mẻ rang #14/), add)
      await userEvent.tab()
    }
    await drawn('Mẻ rang #14AB')

    await userEvent.keyboard('{Meta>}z{/Meta}')
    await userEvent.keyboard('{Meta>}z{/Meta}')

    await drawn('Mẻ rang #14')
  })

  it('Cmd+Shift+Z đi tới lại', async () => {
    render(<Editor postId="p1" />)
    await userEvent.click(await drawn('Đẩy lửa cao hơn 8%.'))
    await userEvent.type(screen.getByDisplayValue('Đẩy lửa cao hơn 8%.'), '!')
    await userEvent.tab()
    await drawn('Đẩy lửa cao hơn 8%.!')

    await userEvent.keyboard('{Meta>}z{/Meta}')
    await drawn('Đẩy lửa cao hơn 8%.')

    await userEvent.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}')
    await drawn('Đẩy lửa cao hơn 8%.!')
  })

  it('bước lùi cũng được ghi lên máy chủ, không chỉ đổi trên màn', async () => {
    render(<Editor postId="p1" />)
    await userEvent.click(await drawn('Đẩy lửa cao hơn 8%.'))
    await userEvent.type(screen.getByDisplayValue('Đẩy lửa cao hơn 8%.'), '!')
    await userEvent.tab()
    saved.mockClear()

    await userEvent.keyboard('{Meta>}z{/Meta}')

    await waitFor(() => expect(saved).toHaveBeenCalled())
  })
})
