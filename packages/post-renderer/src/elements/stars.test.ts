import { describe, expect, it } from 'vitest'
import { parseStars, writeStars, type Starred } from './stars'

const S = (t: string, b = false, i = false): Starred => ({ t, b, i })

describe('parseStars', () => {
  it('một, hai, ba sao', () => {
    expect(parseStars('a *n* b **đ** c ***h***')).toEqual([
      S('a '),
      S('n', false, true),
      S(' b '),
      S('đ', true),
      S(' c '),
      S('h', true, true),
    ])
  })

  // Đúng thứ Lexical ghi ra khi một chữ giữa câu đậm được nghiêng thêm.
  it('nghiêng lồng trong đậm', () => {
    expect(parseStars('**đậm *cả hai* đậm**')).toEqual([S('đậm ', true), S('cả hai', true, true), S(' đậm', true)])
  })

  it('đậm lồng trong nghiêng', () => {
    expect(parseStars('*ng **cả hai** ng*')).toEqual([S('ng ', false, true), S('cả hai', true, true), S(' ng', false, true)])
  })

  it('đậm sát nghiêng, không khoảng trắng', () => {
    expect(parseStars('**a***b*')).toEqual([S('a', true), S('b', false, true)])
    expect(parseStars('*a***b**')).toEqual([S('a', false, true), S('b', true)])
  })

  it('dấu lẻ vẫn là chữ', () => {
    expect(parseStars('độ pha loãng FD* tăng')).toEqual([S('độ pha loãng FD* tăng')])
    expect(parseStars('a * b')).toEqual([S('a * b')])
    expect(parseStars('**đang gõ')).toEqual([S('**đang gõ')])
  })

  it('không có sao nào thì một đoạn thường, chữ rỗng thì không đoạn nào', () => {
    expect(parseStars('chữ')).toEqual([S('chữ')])
    expect(parseStars('')).toEqual([])
  })
})

describe('writeStars', () => {
  const cases: Starred[][] = [
    [S('thường '), S('đậm', true), S(' và '), S('nghiêng', false, true)],
    [S('đậm ', true), S('cả hai', true, true), S(' đậm', true)],
    [S('ng ', false, true), S('cả hai', true, true), S(' ng', false, true)],
    [S('a', true), S('b', false, true)],
    [S('a', true, true), S('b', true), S('c')],
    [S('x', true, true)],
  ]
  for (const segs of cases) {
    const text = writeStars(segs)
    it(`đọc lại đúng: ${text}`, () => expect(parseStars(text)).toEqual(segs))
  }

  it('mở một lần cho cả dải, không ra năm sao liền', () => {
    expect(writeStars([S('đậm ', true), S('cả hai', true, true), S(' đậm', true)])).toBe('**đậm *cả hai* đậm**')
  })

  // Khoảng trắng đậm hay thường trông như nhau, nên đổi phía là vô hại.
  it('khoảng trắng ở mép đứng ngoài dấu', () => {
    const text = writeStars([S('đậm ', true), S('thường')])
    expect(text).toBe('**đậm** thường')
    expect(parseStars(text)).toEqual([S('đậm', true), S(' thường')])
  })

  it('ba ký hiệu cũ viết ra như cũ', () => {
    expect(writeStars([S('x', false, true)])).toBe('*x*')
    expect(writeStars([S('x', true)])).toBe('**x**')
    expect(writeStars([S('x', true, true)])).toBe('***x***')
  })
})
