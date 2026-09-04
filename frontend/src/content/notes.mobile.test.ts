import { describe, expect, it } from 'vitest'
import { featureCells, featureMobile, notePlacement, notePlacementMobile } from './notes'

/*
 * Ghi 01 chạy theo LÔ: tám vị trí bài, bảy ô trang trí xen vào, hết lô là lặp.
 * Bản hẹp có bảng vị trí riêng chứ không co từ lưới 12 cột — nên hai bảng phải
 * đi cùng nhau. Thêm một vị trí bài cho desktop mà quên bản hẹp thì bài thứ
 * chín rơi vào `undefined` và cả dải sau vỡ, mà không test nào khác thấy.
 */
describe('Ghi 01: bảng vị trí hẹp phải phủ trọn một dải', () => {
  it('đủ tám vị trí bài, khớp số với bản desktop', () => {
    expect(notePlacementMobile).toHaveLength(notePlacement.length)
  })

  it('đủ hình học cho cả bảy ô trang trí', () => {
    for (const cell of featureCells) {
      expect(featureMobile[cell.n], `thiếu hình học hẹp cho F${cell.n}`).toBeDefined()
    }
    expect(Object.keys(featureMobile)).toHaveLength(featureCells.length)
  })

  it('ô ảnh có tỉ lệ, ô chữ thì không', () => {
    for (const cell of featureCells) {
      const fm = featureMobile[cell.n]
      // `h` cố định đo cho ô rộng `span 3`; ô hẹp đổi bề rộng nên phải đi bằng
      // tỉ lệ. Ô chữ (trích dẫn, đếm) không có ảnh nên không cần.
      if (cell.kind === 'slot') expect(fm.ar, `F${cell.n} là ô ảnh mà thiếu ar`).toBeTruthy()
      else expect(fm.ar).toBeUndefined()
    }
  })

  it('bề rộng không cái nào lặp lại cái nào', () => {
    // Nhịp của trang nằm ở chỗ này. Hai ô cùng bề rộng đứng gần nhau là trang
    // bắt đầu đọc ra như một cột đều tăm tắp — đúng thứ đã phải vẽ lại một lần.
    const widths = notePlacementMobile.map((p) => p.w)
    expect(new Set(widths).size).toBe(widths.length)
  })

  it('bài đổi bên chứ không dồn hết một phía', () => {
    const right = notePlacementMobile.filter((p) => p.side === 'right').length
    expect(right).toBeGreaterThan(1)
    expect(right).toBeLessThan(notePlacementMobile.length - 1)
  })
})
