import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) } },
}))

const { listPosts, transitionStatus } = await import('./apiClient')

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 'p1', status: 'draft' }] })
})

describe('apiClient.listPosts', () => {
  it('GETs /api/posts with the status query param and Bearer token', async () => {
    const result = await listPosts('draft')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/posts?status=draft',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    )
    expect(result).toEqual([{ id: 'p1', status: 'draft' }])
  })
})

describe('apiClient.transitionStatus', () => {
  it('POSTs the action to /api/posts/:id/status', async () => {
    await transitionStatus('p1', 'publish')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/posts/p1/status',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'publish' }) }),
    )
  })
})
