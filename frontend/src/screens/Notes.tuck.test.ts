import { describe, expect, it } from 'vitest'
import { canTuck } from './Notes'

/*
 * Luật chủ site: chỗ chồng lớp chỉ được rơi vào ẢNH của bài, không bao giờ
 * rơi vào CHỮ.
 *
 * Margin âm cố định không giữ nổi luật ấy. Chiều cao một bài đổi theo độ dài
 * tiêu đề, và ô nào đứng liền trước ô nào thì phụ thuộc module đang có mấy
 * bài. Đã xảy ra thật khi mở trình duyệt ở 390px: Ghi 01 mới có một bài nên
 * F1 lẽ ra kê cạnh P2 lại hoá ra kê cạnh P1 — cả hai cùng dạt trái, 72% + 42%
 * = 114%, và ảnh chui thẳng xuống dưới tiêu đề bài.
 *
 * `canTuck` là chỗ chặn: chỉ kéo lên khi hai ô khác bên VÀ tổng bề rộng còn
 * nằm trong một hàng. Không thoả thì rơi về khoảng cách dương, và khi ấy hai
 * ô không chồng nhau theo chiều ngang nên chữ không thể có ảnh ở dưới.
 */
describe('canTuck: khi nào một ô được kê lên ngang tầm ô trước', () => {
  it('không có ô nào trước thì không kê', () => {
    expect(canTuck(null, { w: '42%', side: 'left' })).toBe(false)
  })

  it('cùng bên thì không kê, dù có đủ chỗ', () => {
    expect(canTuck({ w: '30%', side: 'left' }, { w: '30%', side: 'left' })).toBe(false)
  })

  it('khác bên mà tổng quá một hàng thì không kê', () => {
    // Đúng ca đã vỡ trên máy thật: bài 72% và ô trang trí 42%.
    expect(canTuck({ w: '72%', side: 'left' }, { w: '42%', side: 'right' })).toBe(false)
  })

  it('khác bên và vừa một hàng thì kê', () => {
    expect(canTuck({ w: '64%', side: 'right' }, { w: '32%', side: 'left' })).toBe(true)
  })

  it('vừa khít 100% vẫn kê', () => {
    expect(canTuck({ w: '70%', side: 'left' }, { w: '30%', side: 'right' })).toBe(true)
  })

  it('bề rộng không đo được (tràn viền, co theo nội dung) thì không kê', () => {
    expect(canTuck({ w: '64%', side: 'right' }, { w: 'full', side: 'left' })).toBe(false)
    expect(canTuck({ w: 'auto', side: 'left' }, { w: '32%', side: 'right' })).toBe(false)
  })
})
