import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_WORDS, resetWords, type StoredRoutes } from '../../lib/routeWords'
import { RoutesPanel } from './RoutesPanel'

const modules = [{ id: 'biochem', title: 'biochemistry 101' }] as never

const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement

const saveButton = () => screen.getByText('Lưu đường dẫn') as HTMLButtonElement

function open(stored?: StoredRoutes) {
  const onSave = vi.fn()
  render(<RoutesPanel stored={stored} modules={modules} onSave={onSave} />)
  return onSave
}

describe('RoutesPanel — chủ site đổi từ, không đổi logic', () => {
  beforeEach(() => resetWords())

  it('renames the addresses the word appears in, and says so before saving', () => {
    const onSave = open()
    fireEvent.change(box('Tên khu'), { target: { value: 'admin' } })

    // Địa chỉ mẫu đổi theo ngay khi đang gõ, trước khi lưu.
    expect(screen.getByText('/admin')).toBeTruthy()
    expect(screen.getByText('/admin-archive')).toBeTruthy()

    fireEvent.click(saveButton())
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({ admin: 'admin' })
  })

  it('keeps the words that were in force, so old links still open', () => {
    const onSave = open()
    fireEvent.change(box('Tên khu'), { target: { value: 'admin' } })
    fireEvent.click(saveButton())

    expect(onSave.mock.calls[0][0].past[0]).toMatchObject({ admin: DEFAULT_WORDS.admin })
  })

  it('refuses to save a word that would break an address', () => {
    const onSave = open()
    fireEvent.change(box('Tên khu'), { target: { value: 'ad/min' } })

    expect(saveButton().disabled).toBe(true)
    fireEvent.click(saveButton())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('refuses to save two pages under one name', () => {
    const onSave = open()
    fireEvent.change(box('Sơ đồ trang'), { target: { value: 'archive' } })

    expect(saveButton().disabled).toBe(true)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('offers no way to put anything but a word in an address', () => {
    // "Thêm sort order vào slug" không phải bị từ chối — không có ô nào nhận
    // nó. Hình dạng địa chỉ nằm trong mã, không nằm trên màn này.
    open()
    const typed = screen.getAllByRole('textbox').length
    expect(typed).toBe(Object.keys(DEFAULT_WORDS).length - 2 + modules.length)
  })
})
