import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../components/AuthGate', () => ({ AuthGate: ({ children }: { children: React.ReactNode }) => children }))
const transitionStatus = vi.fn().mockResolvedValue({ id: 'p1', status: 'published' })
vi.mock('../../lib/apiClient', () => ({
  listPosts: vi.fn().mockResolvedValue([
    { id: 'p1', slug: 'senses', en: 'Senses of Flavors', vi: 'mô tả', moduleId: 'sensory', kind: 'note', status: 'draft', heroImageUrl: null, publishedAt: null, updatedAt: '2026-06-01T00:00:00Z' },
  ]),
  transitionStatus,
}))

const { default: PostsPage } = await import('./page')

describe('PostsPage', () => {
  it('lists posts and publishes one on click', async () => {
    render(<PostsPage />)
    expect(await screen.findByText('Senses of Flavors')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(transitionStatus).toHaveBeenCalledWith('p1', 'publish')
  })
})
