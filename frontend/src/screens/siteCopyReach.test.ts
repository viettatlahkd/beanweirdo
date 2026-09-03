import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SITE_DEFAULTS } from '../content/site'

/*
 * Mỗi ô chữ khai trong SiteCopy đều phải có chỗ sửa trong CMS.
 *
 * `archiveTitle` và `archiveNote` có trong dữ liệu từ lâu, trang Lưu trữ vẽ ra
 * đàng hoàng, mà không đâu có ô để gõ — khai ra rồi bỏ đó cũng là không sửa
 * được, chỉ khó thấy hơn. Năm dòng của trang Ghi chép thì còn tệ hơn: chúng
 * nằm cứng trong mã, nên chủ site mở khung sửa Ghi 01 chỉ thấy tên, màu và ảnh.
 *
 * Thêm một ô chữ mới mà quên nối vào CMS thì test này đỏ, chứ không đợi tới lúc
 * chủ site đi tìm cái ô ấy.
 */

/** Ô có khung sửa riêng, không nằm trong biểu mẫu chữ. */
const ELSEWHERE = new Set([
  // Sơ đồ trang đổi tên mục ngay tại chỗ.
  'sections',
  // Ba tấm mở đầu Mục lục: chữ và ảnh đi cùng nhau trong khung ảnh riêng.
  'plate1', 'plate2', 'plate3', 'plateImg1', 'plateImg2', 'plateImg3',
])

describe('mọi ô chữ của trang đều sửa được', () => {
  const src = readFileSync('frontend/src/screens/Cms.tsx', 'utf8')
  const wired = new Set([...src.matchAll(/field\('([A-Za-z0-9]+)'\)/g)].map((m) => m[1]))

  for (const key of Object.keys(SITE_DEFAULTS)) {
    if (ELSEWHERE.has(key)) continue
    it(`${key} có ô sửa`, () => {
      expect(wired.has(key), `${key} khai trong SiteCopy nhưng CMS không có ô nào`).toBe(true)
    })
  }
})
