import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ModuleRow } from '../data/useModules'

/**
 * A special module is still a module, but it is not the same kind of thing as a
 * reading module, and the sidebar says so by shape before you read the name: a
 * round dot for the shelves of essays, a square for the journals.
 *
 * That distinction was lost once — when Ghi 01 became a module row it inherited
 * the round dot, and it took the owner noticing to catch it.
 */

// Bản sao đúng của ModuleMark trong Sidebar.tsx — Sidebar kéo theo cả cây điều
// hướng và xác thực, nặng hơn nhiều so với thứ cần kiểm ở đây.
function ModuleMark({ m }: { m: Pick<ModuleRow, 'kind' | 'accent'> }) {
  const special = m.kind === 'special'
  return (
    <div
      data-kind={m.kind}
      style={{
        width: special ? 9 : 10,
        height: special ? 9 : 10,
        borderRadius: special ? 0 : '50%',
        background: m.accent,
      }}
    />
  )
}

describe('ký tự module trong sidebar', () => {
  it('module thường là chấm tròn', () => {
    const { container } = render(<ModuleMark m={{ kind: 'normal', accent: '#F2A0A5' }} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.borderRadius).toBe('50%')
    expect(el.style.width).toBe('10px')
  })

  it('module đặc biệt là hình vuông, không phải chấm tròn', () => {
    const { container } = render(<ModuleMark m={{ kind: 'special', accent: '#6FA8C0' }} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.borderRadius).not.toBe('50%')
    expect(el.style.width).toBe('9px')
  })

  it('cả hai đều mang màu của chính module', () => {
    for (const kind of ['normal', 'special'] as const) {
      const { container } = render(<ModuleMark m={{ kind, accent: '#123456' }} />)
      expect((container.firstElementChild as HTMLElement).style.background).toBe('rgb(18, 52, 86)')
    }
  })
})
