import { describe, expect, it } from 'vitest'
import { indentOf, normalizeBlocks, stepIndent } from './longformBlocks'
import { runsToText, textToRuns } from './longformText'
import type { LongformBlock } from './types'

/*
 * Bài đã xuất bản có 159 khối `cont`, và chúng nằm trong kho ở dạng cũ tới lần
 * chủ site sửa bài. Nên hai dạng phải cùng đọc ra một thứ, và đây là chỗ chứng
 * minh việc đó — không phải một lần chạy đổi dữ liệu rồi tin là xong.
 */
describe('normalizeBlocks', () => {
  it('cont thành đoạn văn lùi một bậc', () => {
    const out = normalizeBlocks([{ k: 'cont' as never, runs: [{ t: '— một điểm' }] }])
    expect(out).toEqual([{ k: 'p', ind: 1, runs: [{ t: '— một điểm' }] }])
  })

  it('cont đã lùi sâu thì giữ nguyên bậc của nó', () => {
    expect(normalizeBlocks([{ k: 'cont' as never, ind: 2 }])[0]).toMatchObject({ k: 'p', ind: 2 })
  })

  it('cờ đúng/sai cũ đọc thành bậc', () => {
    expect(normalizeBlocks([{ k: 'p', ind: true }])[0]).toMatchObject({ ind: 1 })
    // 344 khối trong bài mang `ind: false`; không lùi là mặc định, đừng ghi lại.
    expect(normalizeBlocks([{ k: 'p', ind: false }])[0]).not.toHaveProperty('ind')
  })

  it('khối lồng trong aside cũng được đổi', () => {
    const out = normalizeBlocks([{ k: 'aside', items: [{ k: 'cont' as never, runs: [{ t: 'x' }] }] }])
    expect(out[0].items).toEqual([{ k: 'p', ind: 1, runs: [{ t: 'x' }] }])
  })

  it('chạy lại lần nữa không đổi gì thêm', () => {
    const once = normalizeBlocks([{ k: 'cont' as never, ind: true }, { k: 'p' }])
    expect(normalizeBlocks(once)).toEqual(once)
  })
})

describe('stepIndent', () => {
  const p: LongformBlock = { k: 'p', runs: [{ t: 'x' }] }

  it('lùi vào rồi lùi ra thì về đúng chỗ cũ', () => {
    const inn = stepIndent(p, 1)
    expect(indentOf(inn)).toBe(1)
    const back = stepIndent(inn, -1)
    expect(back).not.toHaveProperty('ind')
    expect(indentOf(back)).toBe(0)
  })

  it('không lùi ra được nữa thì đứng yên', () => {
    expect(stepIndent(p, -1)).toBe(p)
  })

  it('sâu nhất là bậc ba', () => {
    let b = p
    for (let i = 0; i < 6; i++) b = stepIndent(b, 1)
    expect(indentOf(b)).toBe(3)
  })
})

/*
 * 572 span trong bài đều mang độ đậm và độ nghiêng, 77 span đậm và 171 nghiêng.
 * Sửa một dòng qua ô nhập thường mà mất chỗ đó là mất không kêu một tiếng.
 */
describe('chữ đi và về qua ô nhập', () => {
  it('giữ đậm và nghiêng', () => {
    const runs = [
      { t: 'thường ', w: '300', s: 'normal' },
      { t: 'đậm', w: '600', s: 'normal' },
      { t: ' và ', w: '300', s: 'normal' },
      { t: 'nghiêng', w: '300', s: 'italic' },
    ]
    const text = runsToText(runs)
    expect(text).toBe('thường *đậm* và _nghiêng_')
    expect(textToRuns(text)).toEqual(runs)
  })

  it('dấu lẻ vẫn là một ký tự trong câu', () => {
    // Bài đang có ba chỗ viết `FD*`.
    expect(textToRuns('độ pha loãng FD* tăng')).toEqual([{ t: 'độ pha loãng FD* tăng', w: '300', s: 'normal' }])
  })

  it('dòng trống ra một run trống chứ không ra mảng rỗng', () => {
    expect(textToRuns('')).toEqual([{ t: '', w: '300', s: 'normal' }])
  })
})
