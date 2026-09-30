import { beforeEach, describe, expect, it, vi } from 'vitest'

const listModules = vi.fn()
const listTags = vi.fn()
const listTemplates = vi.fn()

vi.mock('./apiClient', () => ({
  listModules: (...a: unknown[]) => listModules(...a),
  listTags: (...a: unknown[]) => listTags(...a),
  listTemplates: (...a: unknown[]) => listTemplates(...a),
}))

const { listModulesCached, listTagsCached, forgetModules, forgetAllLists } = await import('./lists')

beforeEach(() => {
  vi.clearAllMocks()
  forgetAllLists()
})

describe('danh sách dùng chung', () => {
  it('chỉ hỏi máy chủ một lần, dù bao nhiêu màn cùng hỏi', async () => {
    listModules.mockResolvedValue([{ id: 'sensory' }])

    const a = await listModulesCached()
    const b = await listModulesCached()

    expect(listModules).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('hai màn dựng cùng lúc vẫn chỉ là một lượt gọi', async () => {
    listModules.mockResolvedValue([{ id: 'sensory' }])

    const [a, b] = await Promise.all([listModulesCached(), listModulesCached()])

    expect(listModules).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  /*
   * Cache một lỗi mạng lại thì một lần chập mạng thành một màn hỏng vĩnh viễn
   * cho tới khi tải lại trang.
   */
  it('không giữ lại lượt gọi hỏng', async () => {
    listModules.mockRejectedValueOnce(new Error('mạng lỗi'))
    await expect(listModulesCached()).rejects.toThrow('mạng lỗi')

    listModules.mockResolvedValue([{ id: 'sensory' }])
    await expect(listModulesCached()).resolves.toEqual([{ id: 'sensory' }])
    expect(listModules).toHaveBeenCalledTimes(2)
  })

  it('quên rồi thì hỏi lại', async () => {
    listModules.mockResolvedValue([{ id: 'sensory' }])
    await listModulesCached()
    forgetModules()
    await listModulesCached()
    expect(listModules).toHaveBeenCalledTimes(2)
  })

  it('ba danh sách độc lập với nhau', async () => {
    listModules.mockResolvedValue([])
    listTags.mockResolvedValue([])
    await listModulesCached()
    forgetModules()
    await listTagsCached()
    await listTagsCached()
    expect(listTags).toHaveBeenCalledTimes(1)
  })
})
