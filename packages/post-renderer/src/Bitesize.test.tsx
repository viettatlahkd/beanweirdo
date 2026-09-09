import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Bitesize, BitesizeCard, titleSize, type BitesizePostData } from './Bitesize'

/*
 * Số đo ở đây lấy từ bản design gốc (`frontend/design/prototype/Coffee Study
 * Blog v4.dc.html`, khối `isNotes`), không phải vẽ lại theo trí nhớ. Chủ site
 * chỉ đích danh dàn trang này — "t thích format của bài Quan sát trên Ghi 01" —
 * nên ba chuyển động của nó là hợp đồng, không phải trang trí.
 */
const post = (over: Partial<BitesizePostData> = {}): BitesizePostData => ({
  title: 'Nước cứng và lớp crema',
  tag: 'quan sát',
  date: '2026.02.06',
  num: '04',
  pinned: false,
  image: null,
  ink: '#B65A3C',
  wash: '#E9B79C',
  len: 'ngắn',
  portrait: false,
  mediaHint: 'ảnh — cận cảnh lớp crema trên tách',
  sub: '',
  media: 'img',
  text: 'Cùng máy, cùng hạt, đổi từ nước RO sang nước khoáng nhẹ.',
  ...over,
})

const wash = (c: HTMLElement) => c.querySelector<HTMLElement>('span[style*="background-image"]')
const media = (c: HTMLElement) => c.querySelector<HTMLElement>('div[style*="aspect-ratio"]')!
const rule = (c: HTMLElement) => c.querySelector<HTMLElement>('div[style*="background: rgb(18, 18, 15)"]')

describe('cỡ tiêu đề đi theo độ dài', () => {
  it('bài dài đội tiêu đề lớn hơn', () => {
    expect(titleSize('dài', false, false)).toBe(40)
    expect(titleSize('vừa', false, false)).toBe(34)
    expect(titleSize('ngắn', false, false)).toBe(27)
  })

  it('khung dọc thì tiêu đề nhỏ lại, còn mở hết thì lớn hẳn', () => {
    // Ảnh dọc đứng cạnh chữ nên cột chữ hẹp đi — tiêu đề 40px ở đó vỡ dòng.
    expect(titleSize('dài', true, false)).toBe(23)
    expect(titleSize('ngắn', false, true)).toBe(52)
  })
})

describe('thẻ thu trong danh sách', () => {
  it('vệt sáng sau tiêu đề nở ra khi rê chuột, không phải bật tắt', () => {
    // `background-size` chạy từ 0% sang 100% — đó là cách tô bút dạ, khác hẳn
    // một khối nền hiện ra nguyên hình.
    const nghi = render(<BitesizeCard post={post()} />)
    expect(wash(nghi.container)!.style.backgroundSize).toBe('0% 100%')
    nghi.unmount()

    const { container } = render(<BitesizeCard post={post()} hovered />)
    expect(wash(container)!.style.backgroundSize).toBe('100% 100%')
  })

  it('gạch đầu thẻ dài 34px lúc nghỉ, kéo hết bề ngang khi thức', () => {
    const nghi = render(<BitesizeCard post={post()} />)
    expect(rule(nghi.container)!.style.width).toBe('34px')
    nghi.unmount()

    const { container } = render(<BitesizeCard post={post()} hovered />)
    expect(rule(container)!.style.width).toBe('100%')
  })

  it('thân bài cắt hai dòng và mờ đi cho tới khi chạm vào', () => {
    // Tám thẻ mở hết thân bài thì trang không còn lướt được — đó là lý do có
    // chỗ cắt này, chứ không phải để cho đẹp.
    const { container, rerender } = render(<BitesizeCard post={post()} />)
    const body = screen.getByText(/Cùng máy, cùng hạt/)
    expect(body.style.webkitLineClamp || body.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
    expect(body.style.opacity).toBe('0.5')
    void container

    rerender(<BitesizeCard post={post()} hovered />)
    expect(screen.getByText(/Cùng máy, cùng hạt/).style.opacity).toBe('1')
  })

  it('chưa có ảnh thì ô ảnh là mảng màu mang chữ gợi ý; có ảnh thì thôi', () => {
    const trong = render(<BitesizeCard post={post()} />)
    expect(screen.getByText('ảnh — cận cảnh lớp crema trên tách')).toBeInTheDocument()
    expect(media(trong.container).style.backgroundColor).toBe('rgb(233, 183, 156)')
    trong.unmount()

    const { container } = render(<BitesizeCard post={post({ image: 'https://x/y.jpg' })} />)
    expect(media(container).style.backgroundImage).toBe('url("https://x/y.jpg")')
    expect(media(container).style.backgroundSize).toBe('cover')
    expect(screen.queryByText('ảnh — cận cảnh lớp crema trên tách')).toBeNull()
  })

  it('bài ghim đeo nhãn ghim, bài thường thì không', () => {
    const thuong = render(<BitesizeCard post={post()} />)
    expect(screen.queryByText('ghim')).toBeNull()
    thuong.unmount()

    render(<BitesizeCard post={post({ pinned: true })} />)
    expect(screen.getByText('ghim')).toBeInTheDocument()
  })
})

describe('bài mở hết', () => {
  it('thân bài không còn bị cắt, và vệt sáng sáng sẵn', () => {
    const { container } = render(<Bitesize post={post()} />)
    const body = screen.getByText(/Cùng máy, cùng hạt/)
    expect(body.style.webkitLineClamp || body.style.getPropertyValue('-webkit-line-clamp')).toBe('')
    expect(wash(container)!.style.backgroundSize).toBe('100% 100%')
  })

  it('ô ảnh phụ chỉ dựng khi có chữ cho nó', () => {
    const trong = render(<Bitesize post={post()} />)
    expect(screen.queryByText('ảnh phụ — chi tiết bổ trợ')).toBeNull()
    trong.unmount()

    render(<Bitesize post={post({ sub: 'ảnh phụ — chi tiết bổ trợ' })} />)
    expect(screen.getByText('ảnh phụ — chi tiết bổ trợ')).toBeInTheDocument()
  })

  it('trên điện thoại ảnh không thả trôi bên trái', () => {
    // `float` với ảnh 300px trên màn 375 thì cột chữ còn 75px.
    const { container } = render(<Bitesize post={post()} mobile />)
    const media = container.querySelector<HTMLElement>('div[style*="aspect-ratio"]')!
    expect(media.style.float).toBe('')
    expect(media.style.width).toBe('100%')
  })
})

/*
 * Hai dàn trang của dạng mở. Thứ tự trong tài liệu là thứ quyết định chữ có
 * chảy quanh ảnh được hay không — `float` chỉ đẩy được thứ đứng SAU nó — nên
 * bài kiểm này kiểm đúng thứ tự ấy, không kiểm pixel.
 */
describe('hai dàn trang', () => {
  const orderOf = (c: HTMLElement) => {
    const nodes = Array.from(
      c.querySelectorAll<HTMLElement>('h1, div[style*="aspect-ratio"], div[style*="pre-line"]'),
    )
    return nodes.map((n) =>
      n.tagName === 'H1' ? 'tiêu đề' : n.style.aspectRatio ? `ảnh ${n.style.aspectRatio}` : 'thân bài',
    )
  }

  it('dạng ảnh: tiêu đề dẫn đầu, ảnh và ô phụ đứng trước chữ', () => {
    const { container } = render(<Bitesize post={post({ sub: 'ảnh phụ' })} />)
    expect(orderOf(container)).toEqual(['tiêu đề', 'ảnh 4/3', 'ảnh 4/5', 'thân bài'])
  })

  it('dạng clip: clip dẫn đầu, tiêu đề và chữ đứng cạnh nó', () => {
    const { container } = render(<Bitesize post={post({ media: 'vid', sub: 'ảnh phụ' })} />)
    expect(orderOf(container)).toEqual(['ảnh 16/9', 'tiêu đề', 'ảnh 4/5', 'thân bài'])
  })

  it('ô ảnh phụ nhỏ lại ở dạng clip', () => {
    // Clip đã chiếm cột trái cao ngồng; thêm một ô 170px bên phải nữa thì cột
    // chữ ở giữa còn một dải hẹp.
    const anh = render(<Bitesize post={post({ sub: 'ảnh phụ' })} />)
    const wrap = (c: HTMLElement) => c.querySelector<HTMLElement>('div[style*="float: right"]')!
    expect(wrap(anh.container).style.width).toBe('170px')
    anh.unmount()

    const { container } = render(<Bitesize post={post({ media: 'vid', sub: 'ảnh phụ' })} />)
    expect(wrap(container).style.width).toBe('130px')
  })

  it('trên điện thoại ô ảnh phụ xuống dưới chữ, không thả trôi', () => {
    // Thả trôi một ô 130px trên màn 375 thì cột chữ còn 200px.
    const { container } = render(<Bitesize post={post({ media: 'vid', sub: 'ảnh phụ' })} mobile />)
    const order = orderOf(container)
    expect(order.indexOf('thân bài')).toBeLessThan(order.indexOf('ảnh 4/5'))
  })
})
