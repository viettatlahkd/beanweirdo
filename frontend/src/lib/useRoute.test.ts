import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { adoptWords, resetWords, withHistory, DEFAULT_WORDS } from './routeWords'
import { useRoute } from './useRoute'

const at = () => window.location.pathname + window.location.search

/**
 * What the browser does when back is pressed: the address goes back to an
 * earlier entry, then `popstate` fires. jsdom's own `history.back()` is not
 * used here — it would be testing jsdom's stack rather than this hook, and it
 * carries entries from one test into the next.
 */
const stepBackTo = (path: string) => {
  act(() => {
    window.history.replaceState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

describe('useRoute — nút back của trình duyệt', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'))

  it('leaves an entry behind for every move', () => {
    // Đây là toàn bộ lý do của hook này: trước đó cả phiên chỉ có một mục
    // lịch sử, nên đi bốn trang rồi bấm back là rời khỏi trang web.
    const { result } = renderHook(() => useRoute())
    const before = window.history.length

    act(() => result.current[1]({ area: 'public', screen: 'home' }))
    act(() => result.current[1]({ area: 'public', screen: 'module', moduleId: 'biochem' }))

    expect(at()).toBe('/module/biochemistry')
    expect(window.history.length - before).toBe(2)
  })

  it('does not stack the address already open', () => {
    // Bấm lại đúng mục đang mở không phải một bước. Nếu nó thành một mục lịch
    // sử thì back phải bấm hai lần mới rời được một trang.
    const { result } = renderHook(() => useRoute())
    const before = window.history.length

    act(() => result.current[1]({ area: 'public', screen: 'home' }))
    act(() => result.current[1]({ area: 'public', screen: 'home' }))

    expect(window.history.length - before).toBe(1)
  })

  it('reads the address on the way back, not a copy kept aside', () => {
    // Bước lùi và một đường link dán vào tab mới phải về cùng một chỗ, bằng
    // cùng một đoạn code — nếu không, back đưa người dùng tới một nơi khác
    // với nơi họ vừa rời.
    const { result } = renderHook(() => useRoute())
    act(() => result.current[1]({ area: 'public', screen: 'module', moduleId: 'biochem' }))

    stepBackTo('/muc-luc')
    expect(result.current[0]).toMatchObject({ area: 'public', screen: 'home' })

    stepBackTo('/post/ghi-p260824?from=archive')
    expect(result.current[0]).toMatchObject({ screen: 'article', slug: 'ghi-p260824', from: 'archive' })
  })

  it('straightens an old address in place', () => {
    // Không đẩy thêm mục: người đọc chưa bước đi đâu cả, mới chỉ tới nơi.
    window.history.replaceState({}, '', '/admin')
    const before = window.history.length
    const { result } = renderHook(() => useRoute())

    expect(at()).toBe('/ad')
    expect(window.history.length).toBe(before)
    expect(result.current[0]).toMatchObject({ area: 'admin', screen: 'cms' })
  })
})

describe('useRoute — sau khi chủ site đổi tên đường dẫn', () => {
  beforeEach(() => {
    resetWords()
    window.history.replaceState({}, '', '/')
  })

  it('opens an address written with the old words, then writes the new one', () => {
    // Link cũ vẫn tới đúng chỗ; thanh địa chỉ thì mang tên mới. Thay tại chỗ,
    // không đẩy thêm mục lịch sử — người đọc chưa bước đi đâu cả.
    adoptWords(withHistory({ ...DEFAULT_WORDS, admin: 'quan-tri' }))
    window.history.replaceState({}, '', '/ad-archive')
    const before = window.history.length

    const { result } = renderHook(() => useRoute())

    expect(result.current[0]).toMatchObject({ area: 'admin', screen: 'archive' })
    expect(at()).toBe('/quan-tri-archive')
    expect(window.history.length).toBe(before)
    resetWords()
  })
})
