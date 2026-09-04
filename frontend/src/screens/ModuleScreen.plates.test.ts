import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { layout, wrapTitle } from '../design/tokens'
import { PLATE_HEIGHT, PLATE_WIDTH } from './ModuleScreen'

/*
 * The CMS preview draws `ModulePlates`, the same component the page draws, at
 * these measurements. A hand-redrawn preview was wrong within a day: it showed
 * the specimen cells at 1.06:1 and 5.30:1 where the page draws 0.73:1 and
 * 1.66:1, and a 6:1 hero where the page draws 5:1.
 *
 * These numbers are what makes the two agree, so they are worth a test — the
 * shapes they imply are checked, not just the numbers themselves.
 */
describe('module plate measurements', () => {
  it('giữ ảnh đầu trang module ở tỉ lệ cắt được', () => {
    // Từng là 5,05:1 — bẹt tới mức hầu như không ảnh nào cắt cho vừa mà còn ra
    // hình, và chủ site gặp đúng chuyện đó khi tự đặt ảnh. Nay ~3,75:1.
    expect(PLATE_WIDTH.band / PLATE_HEIGHT.band).toBeCloseTo(3.75, 1)
  })

  it('trang, trang module và ô xem trước cùng đọc một con số', () => {
    // Ba nơi từng giữ ba bản sao của cùng một chiều cao, và hai trong ba đã
    // lệch nhau 100px. Sửa trang mà ô xem trước đứng yên thì ô ấy nói dối.
    expect(PLATE_HEIGHT.band).toBe(layout.moduleHero)
    expect(layout.band).toBeGreaterThan(layout.moduleHero)
  })

  it('giữ cả bốn ô specimen ở tỉ lệ cắt được', () => {
    /*
     * Hai hàng, 1,3fr trên 1fr, trong lưới hai cột bằng nhau.
     *
     * Hàng dưới từng là 0,75fr trên chiều cao 373 — 114px trên bề ngang 200,
     * tức 1,66:1, và chủ site gặp đúng chuyện "ảnh ngang bẹt rất khó căn".
     * Nay ~0,91:1, gần vuông. Con số này là chỗ trang và ô xem trước trong CMS
     * gặp nhau, nên hình mà nó suy ra mới là thứ được kiểm.
     */
    const col = PLATE_WIDTH.specimen / 2
    const top = (PLATE_HEIGHT.specimen * 1.3) / 2.3
    const bottom = (PLATE_HEIGHT.specimen * 1) / 2.3
    expect(col / top).toBeCloseTo(0.7, 1)
    expect(col / bottom).toBeCloseTo(0.91, 1)
    // Không ô nào bẹt hơn 1,2:1 — quá đó là cắt mất chủ thể.
    expect(Math.max(col / top, col / bottom)).toBeLessThan(1.2)
  })

  it('keeps the roast strip on 3:4 cells', () => {
    const cell = PLATE_WIDTH.sequence / 4
    expect(cell / (cell * (4 / 3))).toBeCloseTo(0.75, 2)
  })

  it('gives the sequence strip no fixed height — its cells decide it', () => {
    expect(PLATE_HEIGHT.sequence).toBeUndefined()
  })
})

/*
 * Tiêu đề module ở trang module.
 *
 * `lang="en"` là phần dễ rơi: trang khai `lang="vi"`, mà tiếng Việt không ngắt
 * âm tiết giữa từ — bỏ nó đi thì luật ngắt không chạy, "biochemistry 101" lại
 * tràn ra như cũ, trong khi nhìn CSS vẫn thấy đủ. Nên kiểm cả hai nửa.
 */
describe('tiêu đề module dài', () => {
  it('khai tiếng Anh và bật luật ngắt âm tiết', () => {
    expect(wrapTitle.hyphens).toBe('auto')
    // Chỉ cắt từ dài từ 8 chữ trở lên, mỗi bên gạch nối còn ít nhất 4 chữ —
    // để không ra "bi-ochemistry".
    expect(wrapTitle.hyphenateLimitChars).toBe('8 4 4')
    // Đọc thẳng mã nguồn: dựng được ba dạng trang module trong test cần cả
    // context điều hướng lẫn dữ liệu module, mà thứ dễ rơi ở đây chỉ là một
    // thuộc tính trên thẻ. Đếm nó là đủ và không nợ ai cái gì.
    const src = readFileSync('frontend/src/screens/ModuleScreen.tsx', 'utf8')
    // Ba dạng trang module đều có tiêu đề riêng, cả ba phải khai tiếng Anh.
    expect(src.match(/\.\.\.wrapTitle/g)?.length).toBe(3)
    expect(src.match(/lang="en"/g)?.length).toBe(3)
  })
})

/*
 * Chú thích ảnh: giữ hay bỏ là việc của chủ site.
 *
 * Dải bốn giai đoạn rang từng rơi về nhãn thiết kế khi ô chú thích trống — chủ
 * site xoá sạch ô trong CMS mà chữ vẫn nằm trên ảnh, không có cách nào bỏ. Ba
 * dạng trang module còn lại đã theo luật "trống thì không vẽ" từ trước; đây là
 * chỗ cuối cùng chưa theo.
 */
describe('chú thích ảnh trên trang module', () => {
  it('không chỗ nào rơi về nhãn thiết kế khi ô trống', () => {
    const src = readFileSync('frontend/src/screens/ModuleScreen.tsx', 'utf8')
    // `pageCaption(...) || nhãn` là đúng cái làm chú thích không xoá được.
    expect(src).not.toMatch(/pageCaption\([^)]*\)\s*\|\|/)
    // Và cả ba dạng đều hỏi "có chú thích không" trước khi vẽ.
    expect(src.match(/pageCaption\(m, ?\w+\)\s*(&&|\?)/g)?.length).toBe(3)
  })
})
