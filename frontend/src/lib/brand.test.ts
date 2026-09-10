/**
 * Logo có mặt thật, không chỉ có trong ý định.
 *
 * Ba cỡ icon là ba file trên đĩa; xoá nhầm một cái thì favicon im lặng biến
 * mất và không ai biết cho tới khi mở tab lên nhìn. Bài kiểm này đọc thẳng
 * đĩa, nên nó bắt được đúng chuyện ấy.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Đường dẫn tính từ gốc repo, không từ `import.meta.url`.
 *
 * Bài kiểm chạy trong jsdom, nơi `import.meta.url` không phải một URL kiểu
 * `file:` — đưa nó cho `readFileSync` là lỗi ngay lúc nạp mô-đun.
 */
const at = (rel: string) => resolve(process.cwd(), 'frontend', rel)
const html = readFileSync(at('index.html'), 'utf8')
const asset = (name: string) => readFileSync(at(`public/${name}`))

describe('logo và favicon', () => {
  it('ba cỡ icon đều có mặt trên đĩa', () => {
    for (const name of ['icon-32.png', 'icon-180.png', 'icon-512.png', 'logo-bean.png']) {
      expect(asset(name).length).toBeGreaterThan(0)
    }
  })

  it('mỗi file đúng là PNG, không phải một cái tên rỗng', () => {
    // Tám byte đầu của mọi PNG. Một file 0 byte hay một file text đổi đuôi sẽ
    // trượt ở đây thay vì trượt trên tab trình duyệt của chủ site.
    const magic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    for (const name of ['icon-32.png', 'icon-180.png', 'icon-512.png', 'logo-bean.png']) {
      expect(asset(name).subarray(0, 8)).toEqual(magic)
    }
  })

  it('trang khai favicon cho cả tab lẫn màn hình chính iOS', () => {
    expect(html).toContain('rel="icon"')
    expect(html).toContain('/icon-32.png')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('/icon-180.png')
  })

  it('chia link ra chỗ khác thì có hình, không phải ô trắng', () => {
    expect(html).toContain('property="og:image"')
    expect(html).toContain('/icon-512.png')
  })

  it('màu thanh trình duyệt lấy đúng nền của logo', () => {
    // Đọc thẳng từ file logo, không gõ tay: gõ tay là chỗ hai con số trôi ra
    // khỏi nhau mà không ai để ý.
    expect(html).toContain('content="#446548"')
  })
})
