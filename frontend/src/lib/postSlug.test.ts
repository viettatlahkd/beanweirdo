import { describe, expect, it } from 'vitest'
import { buildSlug, findBySlug, slugAfterStatus, slugsFor, stamp, uniqueSlug } from './postSlug'

describe('postSlug — địa chỉ của một bài', () => {
  it('names the module the way the address bar spells it', () => {
    expect(buildSlug({ moduleId: 'biochem', createdAt: '2026-08-17T09:00:00Z', status: 'published' }))
      .toBe('biochemistry-p260817')
    expect(buildSlug({ moduleId: 'ghi01', createdAt: '2026-08-18T09:00:00Z', status: 'published' }))
      .toBe('ghi-p260818')
  })

  it('marks a draft and nothing else', () => {
    const parts = { moduleId: 'ghi01', createdAt: '2026-08-24T09:00:00Z' }
    expect(buildSlug({ ...parts, status: 'draft' })).toBe('ghi-p260824.draft')
    // Đã lên trang rồi thì địa chỉ trần — kể cả sau khi vào lưu trữ, vì lưu
    // trữ vẫn là chỗ người đọc tới được.
    expect(buildSlug({ ...parts, status: 'published' })).toBe('ghi-p260824')
    expect(buildSlug({ ...parts, status: 'archived' })).toBe('ghi-p260824')
  })

  it('reads the day in Hanoi, not in whatever zone the machine is set to', () => {
    // Cơ sở dữ liệu lưu UTC. Nửa đêm rưỡi ở Hà Nội vẫn là chiều hôm trước theo
    // UTC — địa chỉ phải nói ngày mà chủ site nhìn thấy.
    expect(stamp('2026-08-17T17:30:00Z')).toBe('260818')
    expect(stamp('2026-08-17T16:30:00Z')).toBe('260817')
    expect(stamp('2026-01-04T17:00:00Z')).toBe('260105')
  })

  it('carries no position in it', () => {
    // Hai bài cùng module cùng ngày, khác thứ tự trên trang — địa chỉ chỉ khác
    // nhau vì đã có người chiếm chỗ, không vì ai đứng trên ai.
    const a = buildSlug({ moduleId: 'sensory', createdAt: '2026-08-17T01:00:00Z', status: 'published' })
    const b = buildSlug({ moduleId: 'sensory', createdAt: '2026-08-17T15:00:00Z', status: 'published' })
    // Cùng module, cùng ngày, khác giờ và khác vị trí trên trang — mà địa chỉ
    // vẫn y hệt nhau. Đó chính là bằng chứng thứ tự không nằm trong đó.
    expect(a).toBe(b)
  })
})

describe('uniqueSlug — hai bài một module một ngày', () => {
  it('gives the second one a letter', () => {
    const parts = { moduleId: 'sensory', createdAt: '2026-08-17T08:00:00Z', status: 'published' }
    expect(uniqueSlug(parts, [])).toBe('sensory-p260817')
    expect(uniqueSlug(parts, ['sensory-p260817'])).toBe('sensory-p260817-b')
    expect(uniqueSlug(parts, ['sensory-p260817', 'sensory-p260817-b'])).toBe('sensory-p260817-c')
  })

  it('keeps the letter in front of the draft mark', () => {
    // Ngày và trạng thái vẫn phải đọc thẳng ra được ở cuối.
    const parts = { moduleId: 'ghi01', createdAt: '2026-08-25T08:00:00Z', status: 'draft' }
    expect(uniqueSlug(parts, ['ghi-p260825.draft'])).toBe('ghi-p260825-b.draft')
  })

  it('does not collide with a slug from another day', () => {
    const parts = { moduleId: 'ghi01', createdAt: '2026-08-25T08:00:00Z', status: 'draft' }
    expect(uniqueSlug(parts, ['ghi-p260824.draft'])).toBe('ghi-p260825.draft')
  })
})

describe('slugAfterStatus — đăng một bài nháp', () => {
  it('drops the draft mark and moves nothing else', () => {
    // Ngày viết vẫn là ngày viết.
    expect(slugAfterStatus('ghi-p260824.draft', 'published')).toBe('ghi-p260824')
    expect(slugAfterStatus('ghi-p260824-b.draft', 'published')).toBe('ghi-p260824-b')
  })

  it('puts the mark back when a post returns to draft', () => {
    expect(slugAfterStatus('ghi-p260824', 'draft')).toBe('ghi-p260824.draft')
  })

  it('says nothing when nothing needs rewriting', () => {
    expect(slugAfterStatus('ghi-p260824', 'published')).toBeNull()
    expect(slugAfterStatus('ghi-p260824', 'archived')).toBeNull()
    expect(slugAfterStatus('ghi-p260824.draft', 'draft')).toBeNull()
  })
})

describe('slugsFor — cả danh sách một lượt', () => {
  const post = (id: string, module_id: string, created_at: string, status = 'published', slug?: string) =>
    ({ id, module_id, created_at, status, slug })

  it('derives an address for every post without touching the database', () => {
    const map = slugsFor([
      post('a', 'biochem', '2026-08-17T09:00:00Z'),
      post('b', 'ghi01', '2026-08-24T09:00:00Z', 'draft'),
    ])

    expect(map.get('a')).toBe('biochemistry-p260817')
    expect(map.get('b')).toBe('ghi-p260824.draft')
  })

  it('breaks a tie by age, the same way every time', () => {
    // Bài cũ giữ địa chỉ trần, bài mới lấy chữ cái. Nếu phá hoà bằng thứ tự
    // trên trang thì một lần ghim bài là dấu trang của người đọc trỏ sang bài
    // khác.
    const older = post('older', 'sensory', '2026-08-17T02:00:00Z')
    const newer = post('newer', 'sensory', '2026-08-17T20:00:00Z')

    const forward = slugsFor([older, newer])
    const reversed = slugsFor([newer, older])

    expect(forward.get('older')).toBe('sensory-p260817')
    expect(forward.get('newer')).toBe('sensory-p260818')
    expect(reversed.get('older')).toBe(forward.get('older'))
    expect(reversed.get('newer')).toBe(forward.get('newer'))
  })

  it('lets a hand-typed slug win, and keeps generated ones off it', () => {
    const map = slugsFor([
      post('hand', 'sensory', '2026-08-17T02:00:00Z', 'published', 'sensory-p260817'),
      post('auto', 'sensory', '2026-08-17T03:00:00Z'),
    ])

    expect(map.get('hand')).toBe('sensory-p260817')
    expect(map.get('auto')).toBe('sensory-p260817-b')
  })

  it('finds the post an address points at', () => {
    const posts = [post('a', 'ghi01', '2026-08-18T09:00:00Z'), post('b', 'ghi01', '2026-08-24T09:00:00Z', 'draft')]

    expect(findBySlug(posts, 'ghi-p260824.draft')?.id).toBe('b')
    expect(findBySlug(posts, 'ghi-p999999')).toBeNull()
  })
})
