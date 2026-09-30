import { describe, expect, it } from 'vitest'
import { slug } from './tags.js'

/*
 * Hai đường tạo tag — `POST /api/tags` và `POST /api/posts` kèm `kindLabel` —
 * đều đi qua hàm này. Cùng một nhãn phải ra cùng một `id`, nếu không thì cùng
 * một tag nằm ở hai dòng và bài đeo cái này không hiện dưới cái kia.
 */
describe('slug', () => {
  it('bỏ dấu tiếng Việt', () => {
    expect(slug('Ghi chép')).toBe('ghi-chep')
    expect(slug('Cà phê')).toBe('ca-phe')
    expect(slug('Bột nở')).toBe('bot-no')
  })

  it('đổi đ thành d — NFD không tách được chữ này', () => {
    expect(slug('đọc')).toBe('doc')
    expect(slug('Đường')).toBe('duong')
  })

  it('gộp mọi thứ không phải chữ hay số thành một gạch nối', () => {
    expect(slug('  hai   khoảng trắng  ')).toBe('hai-khoang-trang')
    expect(slug('a/b — c')).toBe('a-b-c')
  })

  it('không để gạch nối ở hai đầu', () => {
    expect(slug('!!! xin chào !!!')).toBe('xin-chao')
  })

  it('trả về chuỗi rỗng khi nhãn không có chữ hay số nào', () => {
    expect(slug('!!!')).toBe('')
    expect(slug('   ')).toBe('')
  })
})
