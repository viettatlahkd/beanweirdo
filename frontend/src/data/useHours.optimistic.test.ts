import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listHours = vi.fn()
const createLog = vi.fn()

vi.mock('../admin/lib/apiClient', () => ({
  listHours: (...a: unknown[]) => listHours(...a),
  createLog: (...a: unknown[]) => createLog(...a),
  deleteLog: vi.fn(),
  patchLog: vi.fn(),
  renameKind: vi.fn(),
  deleteKind: vi.fn(),
  addKind: vi.fn(),
  assignTags: vi.fn(),
}))

const { useHours } = await import('./useHours')

const entry = {
  date: '2026-09-18',
  name: 'beanweirdo: web code',
  kind: 'thực hành',
  project: 'Work',
  mins: 30,
  at: '13:42',
  done: true,
}

async function mounted() {
  const hook = renderHook(() => useHours())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

/*
 * `patch` và `remove` vẽ trước rồi mới gửi, chỉ riêng `add` từng `await` trước.
 * Nên trên /practice, sửa và xoá thì tức thì còn thêm thì đứng một nhịp đúng
 * bằng một vòng gọi mạng — mà mỗi vòng ấy còn gánh thêm một lượt preflight.
 */
describe('useHours — thêm hoạt động hiện ra ngay, không chờ máy chủ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listHours.mockResolvedValue({ logs: [], kinds: ['thực hành'], projects: ['Work'] })
  })

  it('vẽ dòng mới trước khi máy chủ trả lời, rồi thay bằng dòng thật', async () => {
    /** Giữ máy chủ im cho tới khi test cho phép trả lời. */
    let answer: (v: unknown) => void = () => {}
    createLog.mockReturnValue(new Promise((resolve) => { answer = resolve }))

    const hook = await mounted()

    let pending: Promise<unknown>
    await act(async () => {
      pending = hook.result.current.add(entry)
      // Chưa trả lời mà dòng đã phải có mặt.
      await Promise.resolve()
    })
    expect(hook.result.current.logs).toHaveLength(1)
    expect(hook.result.current.logs[0]).toMatchObject({ name: 'beanweirdo: web code', mins: 30 })
    // Id tạm, chưa phải id của máy chủ.
    expect(hook.result.current.logs[0].id).not.toBe('real-1')

    await act(async () => {
      answer({ ...entry, id: 'real-1' })
      await pending
    })

    // Vẫn đúng một dòng, và giờ là dòng thật.
    expect(hook.result.current.logs).toHaveLength(1)
    expect(hook.result.current.logs[0].id).toBe('real-1')
  })

  it('hỏng thì tải lại danh sách, dòng tạm không ở lại', async () => {
    createLog.mockRejectedValue(new Error('không lưu được'))

    const hook = await mounted()
    await act(async () => {
      await hook.result.current.add(entry)
    })

    await waitFor(() => expect(hook.result.current.error).toBe('không lưu được'))
    expect(hook.result.current.logs).toHaveLength(0)
  })
})
