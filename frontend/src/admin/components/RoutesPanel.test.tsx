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
  // Mục này co sẵn khi mở màn — xổ ra rồi mới có ô để gõ.
  fireEvent.click(screen.getByText('Đường dẫn'))
  return onSave
}

describe('RoutesPanel — chủ site đổi từ, không đổi logic', () => {
  beforeEach(() => {
    resetWords()
    // Mục co/mở nhớ lựa chọn trong máy; không dọn thì test trước mở sẵn cho
    // test sau, và cú bấm của `open()` lại đóng nó vào.
    window.localStorage.clear()
  })

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

describe('RoutesPanel — co lại', () => {
  beforeEach(() => {
    resetWords()
    window.localStorage.clear()
  })

  it('starts collapsed, and says which words are in force without opening', () => {
    // Đây là chỗ ít động tới nhất mà dài nhất trên tab này. Xổ sẵn thì nó đẩy
    // sơ đồ trang — thứ người ta vào đây để xem — ra khỏi tầm mắt.
    render(<RoutesPanel stored={undefined} modules={modules} onSave={vi.fn()} />)

    expect(screen.queryByLabelText('Tên khu')).toBeNull()
    expect(screen.getByText('/ad · /post/…')).toBeTruthy()

    fireEvent.click(screen.getByText('Đường dẫn'))
    expect(screen.getByLabelText('Tên khu')).toBeTruthy()
  })

  it('remembers that it was left open', () => {
    const { unmount } = render(<RoutesPanel stored={undefined} modules={modules} onSave={vi.fn()} />)
    fireEvent.click(screen.getByText('Đường dẫn'))
    unmount()

    render(<RoutesPanel stored={undefined} modules={modules} onSave={vi.fn()} />)
    expect(screen.getByLabelText('Tên khu')).toBeTruthy()
  })
})
