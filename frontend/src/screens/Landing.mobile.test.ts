import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { layout } from '../design/tokens'

/*
 * Trang chủ trên điện thoại — hai điều chủ site chỉ ra khi xem thật.
 *
 * Đo trong trình duyệt ở 375px, không suy từ artboard: "#viettatlahkd" rộng
 * khoảng 5,4 lần cỡ chữ, nên cùng cỡ 80px với hai dòng trên thì nó ra 449px
 * trên một màn 375 — tràn hẳn ra ngoài. Đó là lý do dòng ấy có cỡ riêng.
 */
const src = readFileSync('frontend/src/screens/Landing.tsx', 'utf8')
const css = readFileSync('frontend/src/global.css', 'utf8')

describe('tên trang trên điện thoại', () => {
  it('to hơn hẳn bản một dòng cũ', () => {
    expect(src).toContain('fontSize: mob ? 80 : 104')
  })

  it('dòng hashtag co theo bề ngang màn, không phải một số cứng', () => {
    // Số cứng thì vừa ở 375 mà tràn ở 320. `vw` là cách nói "vừa bề ngang trang".
    expect(src).toMatch(/min\(58px, 15\.5vw\)/)
  })

  it('ngắt tên thành hai dòng bằng thành phần riêng, không sửa splitAesc', () => {
    // `splitAesc` chia theo con chữ `ӕ` cho cả trang dùng; chỗ xuống dòng là
    // quyết định của riêng bố cục này.
    expect(src).toContain('PostSplit')
    expect(src).toContain('const at = text.indexOf(\' \')')
  })
})

describe('dải ảnh module trên điện thoại', () => {
  it('tràn ra hai mép, kéo âm đúng bằng lề', () => {
    expect(src).toContain('marginLeft: -layout.padMobile')
    expect(src).toContain('marginRight: -layout.padMobile')
    // Kéo âm phải khớp lề thật của khối, nếu không dải lệch một bên.
    expect(layout.padMobile).toBe(20)
    expect(src).toContain("padding: mob ? '34px 20px 52px'")
  })

  it('hở dưới phần chữ hẹp lại ở màn nhỏ, giữ nguyên ở màn rộng', () => {
    // 64px viết cho mọi bề ngang là một mảng trống bằng một phần năm màn 375.
    expect(css).toMatch(/\.bw-modhead \{\n  margin-bottom: 28px;\n\}/)
    // Ngưỡng của `global.css` là 900, khớp `mobileMax` — lane design đã gộp
    // hai ngưỡng lại; đừng viết 1240 ở đây nữa.
    expect(css).toMatch(/min-width: 900px[\s\S]*?margin-bottom: 64px;/)
  })
})

/*
 * Nhãn trên cùng: ngắt sau dấu gạch ngang.
 *
 * Để tự xuống dòng thì ở 375px nó ngắt sau "sourdough", tách "& open quests"
 * ra một mình — đọc như một mẩu thừa.
 */
describe('nhãn trên cùng trang chủ', () => {
  it('ngắt theo dấu gạch, không theo một từ cụ thể', () => {
    // Chủ site sửa được dòng này trong CMS, nên một chỗ ngắt buộc vào chữ
    // "coffee" sẽ sai ngay lần sửa đầu tiên.
    expect(src).toContain('BreakAtDash')
    expect(src).toContain("text.indexOf('—')")
    expect(src).not.toMatch(/indexOf\('coffee'\)/i)
  })

  it('không có gạch ngang thì để nguyên, không vỡ', () => {
    expect(src).toMatch(/if \(at < 0\) return <>\{text\}<\/>/)
  })
})
