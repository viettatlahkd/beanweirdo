/**
 * Phím đặt định dạng, kiểm trên chuỗi.
 *
 * Chỗ dễ sai là bỏ dấu: người viết có thể bôi đen đúng chữ, hoặc bôi đen cả
 * dấu lẫn chữ, và cả hai đều phải hiểu là "bỏ dấu đi".
 */
import { describe, expect, it } from 'vitest'
import { textToRuns } from 'post-renderer'
import { applyMark, markFor } from './marks'

describe('nhấn', () => {
  it('bọc vùng chọn, và vùng chọn vẫn ôm đúng chữ ấy', () => {
    const out = applyMark('có chữ đây', 3, 6, 'bold')
    expect(out.text).toBe('có **chữ** đây')
    expect(out.text.slice(out.start, out.end)).toBe('chữ')
  })

  it('không bôi đen thì con trỏ nằm giữa hai dấu, gõ tiếp là nằm trong', () => {
    const out = applyMark('có  đây', 3, 3, 'bold')
    expect(out.text).toBe('có **** đây')
    expect(out.start).toBe(5)
    expect(out.end).toBe(5)
  })

  it('bấm lại thì bỏ dấu — bôi đen đúng chữ', () => {
    const out = applyMark('có **chữ** đây', 5, 8, 'bold')
    expect(out.text).toBe('có chữ đây')
    expect(out.text.slice(out.start, out.end)).toBe('chữ')
  })

  it('bấm lại thì bỏ dấu — bôi đen cả dấu lẫn chữ', () => {
    const out = applyMark('có **chữ** đây', 3, 10, 'bold')
    expect(out.text).toBe('có chữ đây')
    expect(out.text.slice(out.start, out.end)).toBe('chữ')
  })

  it('cái đặt ra đọc lại đúng thành chữ đậm', () => {
    const out = applyMark('có chữ đây', 3, 6, 'bold')
    expect(textToRuns(out.text)).toContainEqual({ t: 'chữ', b: true })
  })
})

describe('nghiêng', () => {
  it('bọc bằng một dấu sao, không phải hai', () => {
    expect(applyMark('có chữ đây', 3, 6, 'italic').text).toBe('có *chữ* đây')
  })

  it('cái đặt ra đọc lại đúng thành chữ nghiêng', () => {
    const out = applyMark('có chữ đây', 3, 6, 'italic')
    expect(textToRuns(out.text)).toContainEqual({ t: 'chữ', em: true })
  })

  it('đậm rồi nghiêng thì chồng lên nhau thành cả hai', () => {
    // Chủ site hỏi cả hai cùng lúc thì là phím gì: không có phím thứ ba, bấm
    // cả `Cmd+B` lẫn `Cmd+I` — và markdown viết ra là `***x***`.
    const bold = applyMark('có chữ đây', 3, 6, 'bold')
    const both = applyMark(bold.text, bold.start, bold.end, 'italic')
    expect(both.text).toBe('có ***chữ*** đây')
    expect(textToRuns(both.text)).toContainEqual({ t: 'chữ', em: true, b: true })
  })
})

describe('số đo', () => {
  it('bọc bằng một gạch dưới', () => {
    expect(applyMark('nhiệt 92°C rồi', 6, 10, 'reading').text).toBe('nhiệt _92°C_ rồi')
  })

  it('bấm lại thì bỏ', () => {
    expect(applyMark('nhiệt _92°C_ rồi', 7, 11, 'reading').text).toBe('nhiệt 92°C rồi')
  })
})

describe('link', () => {
  it('bọc chữ và để con trỏ vào chỗ điền địa chỉ', () => {
    const out = applyMark('xem đây nhé', 4, 7, 'link')
    expect(out.text).toBe('xem [đây]() nhé')
    expect(out.start).toBe(out.end)
    expect(out.text.slice(0, out.start)).toBe('xem [đây](')
  })

  it('link chưa có địa chỉ thì chưa đọc thành link — vỏ đang chờ trông ra vỏ', () => {
    const out = applyMark('xem đây', 4, 7, 'link')
    expect(textToRuns(out.text).some((r) => r.href)).toBe(false)
  })

  it('điền địa chỉ vào là thành link thật', () => {
    const out = applyMark('xem đây', 4, 7, 'link')
    const filled = out.text.slice(0, out.start) + 'https://a.com' + out.text.slice(out.end)
    expect(textToRuns(filled)).toContainEqual({ t: 'đây', href: 'https://a.com' })
  })
})

describe('chọn phím', () => {
  const key = (over: Partial<Parameters<typeof markFor>[0]>) => ({
    key: 'b',
    metaKey: true,
    ctrlKey: false,
    altKey: false,
    ...over,
  })

  it('B, U, K', () => {
    expect(markFor(key({}))).toBe('bold')
    expect(markFor(key({ key: 'u' }))).toBe('reading')
    expect(markFor(key({ key: 'k' }))).toBe('link')
  })

  it('Ctrl cũng được, cho bàn phím không có Cmd', () => {
    expect(markFor(key({ metaKey: false, ctrlKey: true }))).toBe('bold')
  })

  it('không có Cmd hay Ctrl thì chỉ là gõ chữ', () => {
    expect(markFor(key({ metaKey: false }))).toBeNull()
  })

  it('có Alt thì để cho trình duyệt và hệ điều hành', () => {
    expect(markFor(key({ altKey: true }))).toBeNull()
  })
})
