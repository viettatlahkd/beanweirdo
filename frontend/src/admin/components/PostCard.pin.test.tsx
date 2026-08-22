import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PostCard } from './PostCard'
import type { PostSummary } from '../lib/apiClient'

const post = (over: Partial<PostSummary> = {}): PostSummary =>
  ({
    id: 'p1',
    module_id: 'sensory',
    en: 'Sensory Lexicon',
    vi: 'mô tả',
    kind: 'ref',
    date_label: '2026.03',
    status: 'published',
    template: 'cards',
    hero_image_url: null,
    thumbnail_url: null,
    sort_order: null,
    pinned: false,
    created_at: '',
    updated_at: '',
    published_at: null,
    ...over,
  }) as PostSummary

const pin = () => screen.getByRole('button', { name: '📌' })

describe('ghim bài', () => {
  it('ghim được từ danh sách, ở mọi module — không riêng Ghi 01', () => {
    const onPin = vi.fn()
    render(<PostCard post={post({ module_id: 'biochem' })} onAction={vi.fn()} onEdit={vi.fn()} onPin={onPin} />)
    fireEvent.click(pin())
    expect(onPin).toHaveBeenCalledWith('p1', true)
  })

  it('bài đang ghim thì bấm lại là bỏ ghim', () => {
    const onPin = vi.fn()
    render(<PostCard post={post({ pinned: true })} onAction={vi.fn()} onEdit={vi.fn()} onPin={onPin} />)
    expect(pin()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(pin())
    expect(onPin).toHaveBeenCalledWith('p1', false)
  })

  it('nhìn là biết bài nào đang ghim', () => {
    const { rerender } = render(
      <PostCard post={post({ pinned: false })} onAction={vi.fn()} onEdit={vi.fn()} onPin={vi.fn()} />,
    )
    const mo = Number(pin().style.opacity)
    rerender(<PostCard post={post({ pinned: true })} onAction={vi.fn()} onEdit={vi.fn()} onPin={vi.fn()} />)
    expect(Number(pin().style.opacity)).toBeGreaterThan(mo)
  })
})
