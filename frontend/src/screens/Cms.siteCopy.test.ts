import { describe, expect, it } from 'vitest'

/**
 * Chữ đang dùng trên trang: bản chủ site đặt, hoặc bản mặc định khi chưa từng
 * đặt. Hàm này là bản rút gọn của phép hoà trong `Cms.tsx` — cùng một luật,
 * tách ra để chốt được điều đáng chốt: "chưa đặt" khác "đặt là rỗng".
 */
function resolve(defaults: Record<string, string>, overrides: Record<string, unknown>) {
  const out = { ...defaults }
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined && v !== null) out[k] = v as string
  }
  return out
}

const defaults = { plate1: 'ảnh mở đầu', title: 'beӕn weirdo' }

describe('chữ của trang', () => {
  it('chưa đặt thì lấy bản mặc định', () => {
    expect(resolve(defaults, {}).plate1).toBe('ảnh mở đầu')
    expect(resolve(defaults, { plate1: undefined }).plate1).toBe('ảnh mở đầu')
    expect(resolve(defaults, { plate1: null }).plate1).toBe('ảnh mở đầu')
  })

  it('đặt là rỗng thì rỗng — xoá trắng phải xoá được', () => {
    // Trước đây chuỗi rỗng cũng bị coi là chưa đặt, nên xoá xong ô nhảy về bản
    // mặc định và không cách nào bỏ trắng một chú thích.
    expect(resolve(defaults, { plate1: '' }).plate1).toBe('')
  })

  it('đặt gì thì hiện nấy', () => {
    expect(resolve(defaults, { plate1: 'mặt cắt' }).plate1).toBe('mặt cắt')
  })

  it('ô không đụng tới thì không đổi', () => {
    expect(resolve(defaults, { plate1: '' }).title).toBe('beӕn weirdo')
  })
})
