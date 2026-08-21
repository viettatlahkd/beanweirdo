import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  login,
  listPosts,
  createPost,
  getPost,
  updatePost,
  transitionStatus,
  uploadImage,
  listModules,
  getToken,
  setToken,
  clearToken,
  TOKEN_KEY,
  ApiError,
} = await import('./apiClient')

function mockJsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

beforeEach(() => {
  window.localStorage.clear()
  global.fetch = vi.fn()
})

describe('token storage', () => {
  it('stores and clears the bearer token under a stable localStorage key', () => {
    expect(TOKEN_KEY).toBe('admin_token')
    expect(getToken()).toBeNull()
    setToken('tok')
    expect(getToken()).toBe('tok')
    expect(window.localStorage.getItem('admin_token')).toBe('tok')
    clearToken()
    expect(getToken()).toBeNull()
  })
})

describe('apiClient.login', () => {
  it('POSTs the password to /api/login without a bearer token, and stores the returned token', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ token: 'new-tok' }))
    const result = await login('hunter2')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'hunter2' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
    expect(result).toEqual({ token: 'new-tok' })
    expect(getToken()).toBe('new-tok')
  })

  it('throws an ApiError with the server message on 401', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ error: 'Sai mật khẩu' }, 401))
    await expect(login('wrong')).rejects.toMatchObject({ message: 'Sai mật khẩu', status: 401 })
    await expect(login('wrong')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('apiClient authenticated calls', () => {
  beforeEach(() => setToken('tok'))

  it('listPosts GETs /api/posts with the status query param, sends the Bearer token, and unwraps { posts }', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ posts: [{ id: 'p1', status: 'draft' }] }))
    const result = await listPosts('draft')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/posts?status=draft',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    )
    expect(result).toEqual([{ id: 'p1', status: 'draft' }])
  })

  it('listPosts defaults to status=all when omitted', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ posts: [] }))
    await listPosts()
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/posts?status=all', expect.anything())
  })

  it('createPost POSTs the input to /api/posts', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ id: 'p2' }, 201))
    const result = await createPost({ module_id: 'sensory', kind: 'note', en: 'Title', vi: 'Mô tả' })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/posts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ module_id: 'sensory', kind: 'note', en: 'Title', vi: 'Mô tả' }),
      }),
    )
    expect(result).toEqual({ id: 'p2' })
  })

  it('getPost GETs /api/posts/:id and unwraps { post }', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ post: { id: 'p1', slug: 's' } }))
    const result = await getPost('p1')
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/posts/p1', expect.anything())
    expect(result).toEqual({ id: 'p1', slug: 's' })
  })

  it('updatePost PATCHes editable fields to /api/posts/:id and unwraps { post }', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ post: { id: 'p1', en: 'New' } }))
    const result = await updatePost('p1', { en: 'New' })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/posts/p1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ en: 'New' }) }),
    )
    expect(result).toEqual({ id: 'p1', en: 'New' })
  })

  it('transitionStatus POSTs the action to /api/posts/:id/status and unwraps { post }', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ post: { id: 'p1', status: 'published' } }))
    const result = await transitionStatus('p1', 'publish')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/posts/p1/status',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'publish' }) }),
    )
    expect(result).toEqual({ id: 'p1', status: 'published' })
  })

  it('transitionStatus returns { deleted: true } as-is for permanently-delete', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ deleted: true }))
    const result = await transitionStatus('p1', 'permanently-delete')
    expect(result).toEqual({ deleted: true })
  })

  it('uploadImage POSTs multipart form data without a Content-Type header (browser sets the boundary)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ url: 'https://x/img.png' }))
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    const result = await uploadImage(file)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData), headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    )
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(result).toEqual({ url: 'https://x/img.png' })
  })

  it('listModules GETs /api/modules and unwraps { modules }', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ modules: [{ id: 'sensory' }] }))
    const result = await listModules()
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/modules', expect.anything())
    expect(result).toEqual([{ id: 'sensory' }])
  })

  it('throws ApiError with status on a non-2xx response', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockJsonResponse({ error: 'Not found' }, 404))
    await expect(getPost('missing')).rejects.toMatchObject({ message: 'Not found', status: 404 })
  })
})
