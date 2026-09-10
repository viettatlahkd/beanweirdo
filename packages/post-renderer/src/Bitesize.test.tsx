import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Bitesize, BitesizeCard, frameOf, titleSize, type BitesizePostData } from './Bitesize'

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
  subImage: null,
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
      c.querySelectorAll<HTMLElement>('h1, div[style*="aspect-ratio"], p'),
    )
    return nodes.map((n) =>
      n.tagName === 'H1' ? 'tiêu đề' : n.style.aspectRatio ? `ảnh ${n.style.aspectRatio}` : 'thân bài',
    )
  }

  it('dạng ảnh: tiêu đề dẫn đầu, rồi ảnh và chữ, ô phụ xuống chân', () => {
    const { container } = render(<Bitesize post={post({ sub: 'ảnh phụ' })} />)
    expect(orderOf(container)).toEqual(['tiêu đề', 'ảnh 4/3', 'thân bài', 'ảnh 4/5'])
  })

  it('dạng clip: clip dẫn đầu, tiêu đề dưới nó, ô phụ vẫn ở chân', () => {
    const { container } = render(<Bitesize post={post({ media: 'vid', sub: 'ảnh phụ' })} />)
    expect(orderOf(container)).toEqual(['ảnh 16/9', 'tiêu đề', 'thân bài', 'ảnh 4/5'])
  })

  it('lề phải của thân bài giữ nguyên một đường, chừa đúng chỗ ô phụ', () => {
    /*
     * Trước đây ô ảnh phụ thả trôi bên phải, nên mấy đoạn đầu bị ép hẹp còn
     * đoạn sau — đã qua khỏi ô ấy — lại chạy rộng hết khổ: mép phải gãy làm
     * hai. Nay khoảng lề ấy chừa sẵn cho cả khối chữ.
     */
    const { container } = render(<Bitesize post={post({ sub: 'ảnh phụ' })} />)
    const flow = container.querySelector<HTMLElement>('div[style*="flow-root"][style*="position: relative"]')!
    expect(flow.style.paddingRight).toBe('200px')
    expect(container.querySelector('div[style*="float: right"]')).toBeNull()
  })

  it('ô ảnh phụ chạy dọc bài, mép dưới nằm trên lằn hai phần ba', () => {
    /*
     * Một lằn chứ không phải hai chỗ: dưới cùng của một phần ba giữa CHÍNH LÀ
     * trên cùng của một phần ba cuối. Bài dài ra thì lằn ấy tụt xuống theo, nên
     * ô đi theo mà không phải đo chữ.
     */
    const { container } = render(<Bitesize post={post({ sub: 'ảnh phụ' })} />)
    const holder = container.querySelector<HTMLElement>('div[style*="position: absolute"]')!
    expect(holder.style.bottom).toBe('33.33%')
    // Kéo ra khỏi khối chữ đúng bằng khoảng lề đã chừa, nên nó đứng trong lề.
    expect(holder.style.right).toBe('-200px')
    // Nằm trong khoảng lề đã chừa, nên nó không đẩy chữ.
    const flow = container.querySelector<HTMLElement>('div[style*="flow-root"][style*="position: relative"]')!
    expect(flow.style.paddingRight).toBe('200px')
    expect(flow.style.position).toBe('relative')
  })

  it('khối chữ có chiều cao tối thiểu để ô ấy còn chỗ đứng', () => {
    // Bài hai dòng mà đặt ô cao 212 ở mốc hai phần ba thì nó trồi lên khỏi khối.
    const { container } = render(<Bitesize post={post({ sub: 'ảnh phụ' })} />)
    expect(container.querySelector<HTMLElement>('div[style*="flow-root"][style*="position: relative"]')!.style.minHeight).toBe('330px')
  })

  it('trên điện thoại thì không chừa lề, ô ảnh phụ xuống dưới chữ', () => {
    const { container } = render(<Bitesize post={post({ sub: 'ảnh phụ' })} mobile />)
    const flow = container.querySelector<HTMLElement>('div[style*="flow-root"][style*="position: relative"]')!
    expect(flow.style.paddingRight).toBe('0px')
    expect(container.querySelector('div[style*="position: absolute"]')).toBeNull()
  })
})

describe('clip thì phát, ảnh thì phủ', () => {
  it('có clip thì dựng thẻ video, câm và lặp, không thanh điều khiển', () => {
    // Bản design gốc gọi nó là "clip ngắn không tiếng" — một hình động, không
    // phải một cái máy phát.
    const { container } = render(<Bitesize post={post({ media: 'vid', image: 'https://x/c.mp4' })} />)
    const v = container.querySelector('video')!
    expect(v.getAttribute('src')).toBe('https://x/c.mp4')
    expect(v.muted).toBe(true)
    expect(v.loop).toBe(true)
    expect(v.controls).toBe(false)
    expect(v.style.objectFit).toBe('cover')
  })

  it('ảnh thì vẫn là nền phủ kín, không có thẻ video nào', () => {
    const { container } = render(<Bitesize post={post({ image: 'https://x/a.jpg' })} />)
    expect(container.querySelector('video')).toBeNull()
    expect(media(container).style.backgroundImage).toBe('url("https://x/a.jpg")')
  })

  it('chưa đính gì thì không dựng thẻ video, chỉ mảng màu và chữ gợi ý', () => {
    const { container } = render(<Bitesize post={post({ media: 'vid' })} />)
    expect(container.querySelector('video')).toBeNull()
    expect(media(container).style.backgroundColor).toBe('rgb(233, 183, 156)')
  })
})

describe('khung hình chốt về base set', () => {
  it('bốn khung, không có khung thứ năm', () => {
    expect(frameOf({ media: 'vid', portrait: false })).toBe('16/9')
    expect(frameOf({ media: 'vid', portrait: true })).toBe('9/16')
    expect(frameOf({ media: 'img', portrait: false })).toBe('4/3')
    expect(frameOf({ media: 'img', portrait: true })).toBe('3/4')
  })

  it('clip dọc đổi cả khung lẫn bề ngang cột trái', () => {
    const { container } = render(<Bitesize post={post({ media: 'vid', portrait: true })} />)
    expect(media(container).style.aspectRatio).toBe('9/16')
    expect(media(container).style.width).toBe('250px')
  })
})

describe('ô ảnh phụ', () => {
  it('có ảnh thì phủ ảnh, và chú thích ở lại trên nền tối để còn đọc được', () => {
    // Khác ô chính: chữ ở ô chính là một câu GỢI Ý nên đặt ảnh vào là nó xong
    // việc; chữ ở ô phụ là CHÚ THÍCH nên nó ở lại.
    const { container } = render(
      <Bitesize post={post({ sub: 'vệt crema', subImage: 'https://x/p.jpg' })} />,
    )
    const box = container.querySelector<HTMLElement>('div[style*="aspect-ratio: 4/5"]')!
    expect(box.style.backgroundImage).toBe('url("https://x/p.jpg")')
    expect(screen.getByText('vệt crema')).toBeInTheDocument()
    expect(screen.getByText('vệt crema').style.background).toContain('rgba(24, 22, 17, 0.55)')
  })

  it('chưa có ảnh thì là mảng màu, chú thích không cần nền', () => {
    const { container } = render(<Bitesize post={post({ sub: 'vệt crema' })} />)
    const box = container.querySelector<HTMLElement>('div[style*="aspect-ratio: 4/5"]')!
    expect(box.style.backgroundImage).toBe('')
    expect(screen.getByText('vệt crema').style.background).toBe('')
  })
})

describe('ba dàn trang của dạng mở', () => {
  const order = (c: HTMLElement) =>
    Array.from(
      c.querySelectorAll<HTMLElement>('h1, div[style*="aspect-ratio"], p'),
    ).map((n) => (n.tagName === 'H1' ? 'tiêu đề' : n.style.aspectRatio ? `ảnh ${n.style.aspectRatio}` : 'thân bài'))

  it('clip ngang: clip chiếm trọn bề ngang, tiêu đề nằm DƯỚI nó', () => {
    // "hình ảnh hiển thị hơi nhỏ (...) text heading nên ở dưới phần visual".
    const { container } = render(<Bitesize post={post({ media: 'vid', sub: 'phụ' })} />)
    const clip = container.querySelector<HTMLElement>('div[style*="aspect-ratio: 16/9"]')!
    expect(clip.style.width).toBe('100%')
    expect(clip.style.float).toBe('')
    expect(order(container)[0]).toBe('ảnh 16/9')
    expect(order(container)[1]).toBe('tiêu đề')
  })

  it('clip dọc: hai cột, chữ tụt xuống, ô phụ vẫn neo vào khối chữ', () => {
    const { container } = render(<Bitesize post={post({ media: 'vid', portrait: true, sub: 'phụ' })} />)
    const grid = container.querySelector<HTMLElement>('div[style*="grid-template-columns"]')!
    expect(grid.style.gridTemplateColumns).toBe('250px minmax(0, 1fr)')
    const col = grid.children[1] as HTMLElement
    expect(col.style.paddingTop).toBe('96px')
    // Ô ảnh phụ đi theo mốc hai phần ba của khối chữ, như mọi dàn trang khác —
    // không còn dính đáy cột nữa.
    expect(container.querySelector<HTMLElement>('div[style*="position: absolute"]')!.style.bottom).toBe('33.33%')
  })

  it('ảnh dọc cũng thành hai cột, để cả bài chỉ có một mép trái', () => {
    // "ảnh dọc thì lề trái thẳng với lề chữ cạnh ảnh".
    const { container } = render(<Bitesize post={post({ portrait: true })} />)
    const grid = container.querySelector<HTMLElement>('div[style*="grid-template-columns"]')!
    expect(grid.style.gridTemplateColumns).toBe('300px minmax(0, 1fr)')
    // Tiêu đề vẫn dẫn đầu cả bề ngang, nên cột phải không tụt xuống.
    expect((grid.children[1] as HTMLElement).style.paddingTop).toBe('0px')
  })

  it('thẻ có ảnh đứng: ảnh chiếm 40% thẻ, không lấy bề ngang lưới đưa xuống', () => {
    // Lưới đưa 78%; ảnh đứng chiếm 78% thì cột chữ còn 22% và tiêu đề bị cắt.
    const { container } = render(<BitesizeCard post={post({ portrait: true })} mediaWidth="78%" />)
    expect(media(container).style.width).toBe('40%')
  })

  it('ảnh tĩnh: tiêu đề dẫn đầu, chữ chảy quanh ảnh, ô phụ ở chân', () => {
    const { container } = render(<Bitesize post={post({ sub: 'phụ' })} />)
    expect(order(container)).toEqual(['tiêu đề', 'ảnh 4/3', 'thân bài', 'ảnh 4/5'])
  })
})

describe('chữ và khối nội dung', () => {
  it('đoạn văn theo đúng hệ chữ của kho element, và căn đều hai bên', () => {
    // 15.5 / 1.55, weight 300, hai mươi pixel giữa hai đoạn — `elements/text.tsx`.
    // Trước đây khối này tự đặt 200/1.62 và không chừa khoảng nào: "khá xít".
    const { container } = render(<Bitesize post={post({ text: 'đoạn một\nđoạn hai' })} />)
    const paras = Array.from(container.querySelectorAll('p'))
    expect(paras).toHaveLength(2)
    expect(paras[0].style.marginBottom).toBe('20px')
    expect(paras[0].style.fontWeight).toBe('300')
    expect(paras[0].style.lineHeight).toBe('1.55')
    expect(paras[0].style.textAlign).toBe('justify')
  })

  it('dựng được khối thêm vào, qua đúng kho element chung', () => {
    // Một cái heading ở đây và một cái heading ở memo là cùng một thứ.
    const { container } = render(
      <Bitesize post={post({ elements: [{ type: 'heading', text: 'Một tiêu đề nhỏ', level: 2 }] as never })} />,
    )
    expect(container.textContent).toContain('Một tiêu đề nhỏ')
  })

  it('màn sửa được bọc từng khối và có chỗ đặt nút thêm', () => {
    const wrapped: number[] = []
    render(
      <Bitesize
        post={post({ elements: [{ type: 'paragraph', text: 'a' }] as never })}
        wrapElement={(el, i) => {
          wrapped.push(i)
          return el
        }}
        renderAfterElements={() => <div>THÊM KHỐI</div>}
      />,
    )
    expect(wrapped).toEqual([0])
    expect(screen.getByText('THÊM KHỐI')).toBeInTheDocument()
  })

  it('ô ảnh phụ neo vào khối chữ, không neo vào khối có ảnh trong đó', () => {
    /*
     * "tính chia phần 3 từ phần body text chứ đừng tính từ title nhé" — và
     * cũng đừng tính từ ảnh: ảnh chính thả trôi bên trái, một tấm ảnh dọc cao
     * hơn chữ sẽ kéo khối bao ngoài dài ra và cái mốc trượt theo ảnh.
     */
    const { container } = render(<Bitesize post={post({ sub: 'ảnh phụ' })} />)
    const holder = container.querySelector<HTMLElement>('div[style*="position: absolute"]')!
    const textBlock = holder.parentElement!
    expect(textBlock.querySelector('p')).not.toBeNull()
    expect(textBlock.querySelector('div[style*="aspect-ratio: 4/3"]')).toBeNull()
  })
})
