import { describe, expect, it } from 'vitest'
import { addressBook } from './usePostAddresses'

const rows = [
  { id: '11111111-1111-4111-8111-111111111111', module_id: 'ghi01', created_at: '2026-08-24T09:00:00Z', status: 'draft' },
  { id: '22222222-2222-4222-8222-222222222222', module_id: 'biochem', created_at: '2026-08-17T09:00:00Z', status: 'published' },
]

describe('addressBook — dịch giữa địa chỉ và bản ghi', () => {
  it('translates both ways', () => {
    const book = addressBook(rows)
    expect(book.slugOf(rows[0].id)).toBe('ghi-p260824.draft')
    expect(book.idOf('biochemistry-p260817')).toBe(rows[1].id)
  })

  it('lets a uuid work as an address of its own', () => {
    // Đường link xem trước của khung sửa vẫn là uuid, và một cú bấm trong nửa
    // giây trước khi sổ về vẫn phải mở đúng bài.
    expect(addressBook([]).idOf(rows[0].id)).toBe(rows[0].id)
    expect(addressBook([]).slugOf(rows[0].id)).toBe(rows[0].id)
  })

  it('resolves a stale address to nothing rather than to a wrong post', () => {
    expect(addressBook(rows).idOf('ghi-p999999')).toBeNull()
  })
})

describe('addressBook — bài trong thùng rác', () => {
  it('gives the letters to the posts that have an address', () => {
    // Bài đã xoá không ai tới được, nên nó không được đẩy bài còn sống sang
    // `-b`. Sổ địa chỉ trong khu admin lọc chúng ra trước khi dựng.
    const live = [
      { id: 'a', module_id: 'biochem', created_at: '2026-08-17T09:00:00Z', status: 'published' },
    ]
    expect(addressBook(live).slugOf('a')).toBe('biochemistry-p260817')
  })
})
