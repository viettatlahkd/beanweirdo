import { beforeEach, describe, expect, it } from 'vitest'
import { buildSlug } from './postSlug'
import { parsePath, toPath } from './routes'
import {
  adoptWords,
  checkWords,
  DEFAULT_WORDS,
  resetWords,
  resolveWords,
  withHistory,
  type RouteWords,
} from './routeWords'

const w = (patch: Partial<RouteWords>): RouteWords => ({ ...DEFAULT_WORDS, ...patch })

describe('checkWords — chủ site chỉ được đổi từ', () => {
  it('accepts a plain rename', () => {
    // Ví dụ chủ site đưa: đổi `ad` thành `admin`, và `p` thành `bd`.
    expect(checkWords(w({ admin: 'admin', postMark: 'bd', dateOrder: 'mmddyy' }))).toEqual({})
  })

  it('refuses a word that carries a separator', () => {
    // Dấu ngăn nằm trong một từ thì cái từ ấy tự cắt địa chỉ làm đôi.
    expect(checkWords(w({ admin: 'ad/min' })).admin).toBeTruthy()
    expect(checkWords(w({ edit: 'edit=' })).edit).toBeTruthy()
    expect(checkWords(w({ post: 'bài viết' })).post).toBeTruthy()
    expect(checkWords(w({ index: '' })).index).toBeTruthy()
  })

  it('refuses two pages with the same name', () => {
    // Hai trang cùng tên thì một trong hai không mở được — và cái không mở
    // được là cái người đọc đã có link.
    expect(checkWords(w({ module: 'post' })).module).toBeTruthy()
    expect(checkWords(w({ adSitemap: 'archive' })).adSitemap).toBeTruthy()
    expect(checkWords(w({ view: 'edit' })).view).toBeTruthy()
    // Khác chỗ đứng thì trùng tên không sao: `/post/…` và `/ad-post` không đụng nhau.
    expect(checkWords(w({ adPost: 'post' }))).toEqual({})
  })

  it('has no slot for anything but a word', () => {
    // Không có ô nào nhận thứ tự, bộ đếm hay dấu ngăn, nên "thêm sort order
    // vào slug" không phải bị từ chối mà là không gõ vào đâu được.
    const slots = Object.keys(DEFAULT_WORDS)
    expect(slots).not.toContain('order')
    expect(slots).not.toContain('separator')
    expect(slots).not.toContain('pattern')
  })

  it('takes only the slots it knows, not the whole stored blob', () => {
    // Bản lưu còn mang `past`. Bê cả nó vào thì bộ từ dựng từ kho không bao giờ
    // bằng bộ từ trên biểu mẫu, và nút Lưu không tắt được dù vừa lưu xong.
    const stored = { ...DEFAULT_WORDS, past: [{ admin: 'ad' }] }
    expect(resolveWords(stored)).toEqual(DEFAULT_WORDS)
    expect(Object.keys(resolveWords(stored))).not.toContain('past')
  })

  it('falls back to the defaults rather than breaking the site', () => {
    // Một bản lưu hỏng chỉ bị bỏ qua; trang chạy như trước khi ai đó đổi tên.
    expect(resolveWords({ admin: 'ad min' })).toEqual(DEFAULT_WORDS)
    expect(resolveWords(null)).toEqual(DEFAULT_WORDS)
    expect(resolveWords({ admin: 'admin' }).admin).toBe('admin')
  })
})

describe('đổi từ rồi thì cả trang đọc theo từ mới', () => {
  beforeEach(() => resetWords())

  it('renames every address the word appears in, both directions', () => {
    const words = w({ admin: 'admin' })
    expect(toPath({ area: 'admin', screen: 'cms' }, words)).toBe('/admin')
    expect(toPath({ area: 'admin', screen: 'archive' }, words)).toBe('/admin-archive')
    expect(toPath({ area: 'admin', screen: 'postEdit', slug: 'ghi-p260824' }, words))
      .toBe('/admin-post/edit=ghi-p260824')

    expect(parsePath('/admin-post/edit=ghi-p260824', '', words))
      .toMatchObject({ area: 'admin', screen: 'postEdit', slug: 'ghi-p260824' })
    expect(parsePath('/admin-archive', '', words).area).toBe('admin')
  })

  it('spells a slug with the words in force', () => {
    const words = w({ postMark: 'bd', dateOrder: 'mmddyy', draftMark: 'nhap' })
    const parts = { moduleId: 'ghi01', createdAt: '2026-08-24T09:00:00Z' }
    expect(buildSlug({ ...parts, status: 'published' }, words)).toBe('ghi-bd082426')
    expect(buildSlug({ ...parts, status: 'draft' }, words)).toBe('ghi-bd082426.nhap')
  })

  it('keeps reading the old back-office address after a rename', () => {
    // Dấu trang cũ không được gãy chỉ vì chủ site đổi tên một trang.
    const words = w({ admin: 'quan-tri' })
    expect(parsePath('/admin', '', words).area).toBe('admin')
    expect(parsePath('/admin', '', words)).toMatchObject({ area: 'admin', screen: 'cms' })
  })

  it('remembers the words for the next load', () => {
    // Địa chỉ phải đọc được trước khi mạng trả lời, nếu không thì lần tải đầu
    // sau khi đổi tên sẽ rơi về trang chủ.
    expect(adoptWords({ admin: 'admin' })).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('route_words') ?? '{}').admin).toBe('admin')
    expect(adoptWords({ admin: 'admin' })).toBe(false)
    resetWords()
  })

  it('keeps an address written with the words that were in force before', () => {
    // Đổi tên một trang không được giết những link đã phát ra. Bộ từ cũ được
    // giữ lại lúc lưu, nên địa chỉ cũ vẫn đọc ra đúng chỗ.
    adoptWords(withHistory(w({ admin: 'quan-tri' })))

    expect(parsePath('/quan-tri-archive')).toMatchObject({ area: 'admin', screen: 'archive' })
    expect(parsePath('/ad-archive')).toMatchObject({ area: 'admin', screen: 'archive' })
    // Và địa chỉ site tự viết ra thì luôn là bộ từ mới.
    expect(toPath({ area: 'admin', screen: 'archive' })).toBe('/quan-tri-archive')

    adoptWords(withHistory(w({ admin: 'qt' })))
    expect(parsePath('/quan-tri-archive')).toMatchObject({ screen: 'archive' })
    expect(parsePath('/ad-archive')).toMatchObject({ screen: 'archive' })
    resetWords()
  })
})
