// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('says a published post has edits waiting for Publish', () => {
    render(<StatusBadge status="published" pending />)
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Có sửa chưa đăng')
  })

  it('says "Đã đăng" when the page matches the last edit', () => {
    render(<StatusBadge status="published" />)
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Đã đăng')
  })

  it('ignores the flag on a post that is not published', () => {
    render(<StatusBadge status="draft" pending />)
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Nháp')
  })
})
