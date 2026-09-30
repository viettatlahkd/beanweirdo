import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Button, IconButton } from './Button'
import { IconClose } from './icons'
import { sizes } from './controls'

/*
 * The paint is in CSS, so the CSS is what these read — jsdom applies no
 * stylesheet, and a `?raw` import comes back empty because vitest processes
 * CSS to nothing. `process.cwd()` is the repo root, which is where
 * vitest.config.ts sits.
 */
const css = readFileSync(resolve(process.cwd(), 'frontend/src/admin/admin.css'), 'utf8')

/**
 * The complaint these guard against: "nhiều button lại không hiển thị là
 * button mà lại là chữ? click vào chữ thì mới được?"
 *
 * jsdom applies no stylesheet, so the paint is checked by reading admin.css
 * rather than by computing styles — what matters is that no level can ship
 * without a border, which is exactly what went wrong the first time.
 */
describe('nút phải trông như nút', () => {
  it('mọi cấp đều vẽ viền ngay lúc nghỉ, không chờ rê chuột', () => {
    for (const level of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      const rule = css.match(new RegExp(`\\.ab-${level} \\{([^}]*)\\}`))
      expect(rule, `thiếu .ab-${level}`).toBeTruthy()
      expect(rule![1], `.ab-${level} không có viền`).toMatch(/border-color:\s*#[0-9a-f]{6}/i)
      expect(rule![1], `.ab-${level} không có nền`).toMatch(/background:\s*#[0-9a-f]{6}/i)
    }
  })

  it('mọi cỡ đều cao hơn ngưỡng bấm được 24px', () => {
    for (const [name, s] of Object.entries(sizes)) {
      expect(s.height, `cỡ ${name} quá thấp`).toBeGreaterThanOrEqual(24)
      expect(s.padding, `cỡ ${name} không có padding ngang`).toBeGreaterThan(0)
    }
  })

  it('có đúng một bán kính, và viền không đổi độ dày khi hover', () => {
    // Cả khu quản trị một bán kính. Hình viên thuốc của huy hiệu trạng thái
    // nằm inline trong StatusBadge, không nằm ở đây.
    const radii = new Set([...css.matchAll(/border-radius:\s*([\w.]+)/g)].map((m) => m[1]))
    expect([...radii]).toEqual(['8px'])
    // Không có quy tắc nào đổi `border-width` — viền có sẵn ở mọi trạng thái.
    expect(css).not.toMatch(/border-width:/)
  })

  it('có viền focus — trước đây cả web không có dòng nào', () => {
    expect(css).toMatch(/\.ab:focus-visible/)
    expect(css).toMatch(/outline:\s*2px solid #3e7a4e/i)
  })

  it('class cũ đã bỏ hẳn', () => {
    expect(css).not.toMatch(/admin-link-action/)
  })
})

describe('Button', () => {
  it('mặc định là type="button" nên không tự gửi form quanh nó', () => {
    const submit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={submit}>
        <Button onClick={vi.fn()}>Lưu</Button>
      </form>,
    )
    expect(screen.getByRole('button', { name: 'Lưu' })).toHaveAttribute('type', 'button')
  })

  it('cấp và cỡ đi thẳng vào class', () => {
    render(
      <Button level="danger" size="sm">
        Xoá
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Xoá' }).className).toBe('ab ab-danger ab-sm')
  })

  it('icon bên trong không cướp mất tên của nút', () => {
    render(<Button icon={<IconClose size={14} />}>Đóng lại</Button>)
    expect(screen.getByRole('button', { name: 'Đóng lại' })).toBeInTheDocument()
  })
})

describe('IconButton', () => {
  it('luôn có tên đọc được, vì nội dung của nó chỉ là một hình', () => {
    render(
      <IconButton label="Bỏ ảnh này">
        <IconClose />
      </IconButton>,
    )
    const b = screen.getByRole('button', { name: 'Bỏ ảnh này' })
    expect(b).toHaveAttribute('title', 'Bỏ ảnh này')
    expect(b.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
