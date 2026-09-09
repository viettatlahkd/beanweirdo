import { describe, expect, it } from 'vitest'
import { toBitesizeData } from './postToRenderer'
import type { RenderablePost } from './postToRenderer'

/*
 * Bitesize note mang phần riêng của nó trong `body` jsonb — độ dài, khung dọc,
 * chữ trong ô ảnh, ô ảnh phụ, thân bài — chứ không thành cột mới trong bảng
 * `posts`. Bài kiểm này giữ đúng chỗ ấy.
 */
const post = (over: Partial<RenderablePost> = {}): RenderablePost => ({
  en: 'Nước cứng và lớp crema',
  vi: 'mô tả ngắn',
  lead: null,
  kind: 'quan sát',
  date_label: '2026.02.06',
  body: null,
  hero_caption: null,
  hero_image_url: null,
  pull_quote: null,
  further_reading: null,
  ...over,
})

describe('bài trên template bitesize note', () => {
  it('đọc phần riêng từ body jsonb', () => {
    const d = toBitesizeData(
      post({ body: { text: 'thân bài', len: 'dài', portrait: true, mediaHint: 'ảnh — nồi trên bếp', sub: 'ảnh phụ' } }),
    )
    expect(d).toMatchObject({ text: 'thân bài', len: 'dài', portrait: true, mediaHint: 'ảnh — nồi trên bếp', sub: 'ảnh phụ' })
  })

  it('body trống thì lấy mặc định, không vỡ', () => {
    const d = toBitesizeData(post())
    expect(d.len).toBe('ngắn')
    expect(d.portrait).toBe(false)
    expect(d.text).toBe('mô tả ngắn')
    expect(d.mediaHint).toBe('ảnh — cận cảnh chủ thể')
  })

  it('dạng clip lấy câu gợi ý của clip, và khung dọc đổi câu ấy', () => {
    expect(toBitesizeData(post({ body: { media: 'vid' } })).mediaHint).toBe('video ngang — clip ngắn không tiếng')
    expect(toBitesizeData(post({ body: { media: 'vid', portrait: true } })).mediaHint).toBe('video dọc — clip quay dọc')
  })

  it('dạng clip mang bộ màu riêng, dạng ảnh vẫn theo tag', () => {
    // "vid thì đổi màu" — bộ màu `video` bên design đặt sẵn ở bản gốc.
    const clip = toBitesizeData(post({ kind: 'quan sát', body: { media: 'vid' } }))
    expect(clip.ink).toBe('#172124')
    expect(clip.wash).toBe('#8CBAB4')
    expect(toBitesizeData(post({ kind: 'quan sát' })).ink).toBe('#B65A3C')
  })

  it('không nói gì thì là dạng ảnh', () => {
    expect(toBitesizeData(post()).media).toBe('img')
  })

  it('màu đi theo tag chứ không theo module', () => {
    // Cả trang Ghi 01 phân biệt bài bằng mực của tag; `lib/notesFilter` là nơi
    // duy nhất quyết định tag nào ra màu nào.
    expect(toBitesizeData(post({ kind: 'quan sát' })).ink).toBe('#B65A3C')
    const tuDat = toBitesizeData(post({ kind: 'hạt' }))
    expect(tuDat.ink).toMatch(/^#[0-9A-F]{6}$/i)
    expect(tuDat.ink).toBe(toBitesizeData(post({ kind: 'hạt' })).ink)
  })

  it('dải màu module chỉ có khi biết module', () => {
    expect(toBitesizeData(post()).band).toBeUndefined()
    expect(
      toBitesizeData(post(), { mod: { title: 'Ghi 01', accent: '#6FA8C0', on_color: '#123456' } }).band,
    ).toEqual({ bg: '#6FA8C0', fg: '#123456' })
  })
})
