// @vitest-environment jsdom
/**
 * Luật bàn phím trong một khối đứng giữa các dải chữ (`thingKeyDown`).
 *
 * Chủ site: *"viết trong khối xong enter không thoát ra khỏi khối"*. Phần
 * vẽ và đo dòng chỉ kiểm được trong Chrome thật; ở đây kiểm luật: phím nào
 * đưa con trỏ đi đâu.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FLOW_EXIT, thingKeyDown } from './flowFocus'

function mount(values: string[]) {
  document.body.innerHTML = `<div data-flow-root><div data-flow="thing" data-flow-at="0">${values
    .map((v) => `<input value="${v}" />`)
    .join('')}</div></div>`
  const stop = document.querySelector<HTMLElement>('[data-flow=thing]')!
  const inputs = Array.from(stop.querySelectorAll('input'))
  return { stop, inputs }
}

function press(stop: HTMLElement, target: HTMLElement, key: string, remove = vi.fn()) {
  target.focus()
  if (target instanceof HTMLInputElement) target.setSelectionRange(target.value.length, target.value.length)
  const native = new KeyboardEvent('keydown', { key })
  let prevented = false
  thingKeyDown(
    {
      key,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target,
      currentTarget: stop,
      defaultPrevented: false,
      nativeEvent: native,
      preventDefault: () => {
        prevented = true
      },
    },
    remove,
  )
  return { prevented, remove }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('thingKeyDown', () => {
  it('Enter ở ô có chữ sang ô kế tiếp của cùng khối (nhãn → giá trị)', () => {
    const { stop, inputs } = mount(['nhãn', ''])
    const { prevented } = press(stop, inputs[0], 'Enter')
    expect(prevented).toBe(true)
    expect(document.activeElement).toBe(inputs[1])
  })

  it('Enter ở ô trống thì xin thoát khối', () => {
    const { stop, inputs } = mount(['nhãn', ''])
    const exit = vi.fn()
    stop.addEventListener(FLOW_EXIT, exit)
    press(stop, inputs[1], 'Enter')
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('Enter ở ô cuối của khối cũng thoát, dù ô có chữ', () => {
    const { stop, inputs } = mount(['a', 'b'])
    const exit = vi.fn()
    stop.addEventListener(FLOW_EXIT, exit)
    press(stop, inputs[1], 'Enter')
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('Backspace trong một khối trống trơn thì bỏ khối', () => {
    const { stop, inputs } = mount(['', ''])
    const { remove, prevented } = press(stop, inputs[0], 'Backspace')
    expect(prevented).toBe(true)
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('Backspace không bỏ khối còn chữ ở ô khác', () => {
    const { stop, inputs } = mount(['', 'còn chữ'])
    const { remove } = press(stop, inputs[0], 'Backspace')
    expect(remove).not.toHaveBeenCalled()
  })

  /** Khối ảnh như màn sửa vẽ: tay nắm ở máng, ô chọn tệp, nút, ô chú thích. */
  function image(withPicture: boolean) {
    document.body.innerHTML = `<div data-flow-root><div data-flow="thing" data-flow-at="0">
      <div class="awc-gutter"><button class="awc-grip">⠿</button></div>
      ${withPicture ? '<div data-has-image="true"></div>' : ''}
      <input type="file" /><button>tải ảnh lên</button><input value="" placeholder="chú thích ảnh" />
    </div></div>`
    const stop = document.querySelector<HTMLElement>('[data-flow=thing]')!
    return {
      stop,
      grip: stop.querySelector<HTMLElement>('.awc-grip')!,
      upload: stop.querySelectorAll<HTMLElement>('button')[1],
      caption: stop.querySelector<HTMLInputElement>('input[placeholder]')!,
    }
  }

  it('Esc chọn cả khối: con trỏ lên tay nắm', () => {
    const { stop, caption, grip } = image(true)
    const { prevented } = press(stop, caption, 'Escape')
    expect(prevented).toBe(true)
    expect(document.activeElement).toBe(grip)
  })

  it('Delete khi con trỏ đứng trên nút của khối thì xoá khối', () => {
    const { stop, upload } = image(true)
    const { remove } = press(stop, upload, 'Delete')
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('khối ảnh chưa có ảnh, chú thích trống: Backspace bỏ khối (ô chọn tệp không tính là chữ)', () => {
    const { stop, caption } = image(false)
    const { remove } = press(stop, caption, 'Backspace')
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('khối ảnh đã có ảnh, chú thích trống: Backspace lần đầu chọn khối, chưa xoá', () => {
    const { stop, caption, grip } = image(true)
    const { remove, prevented } = press(stop, caption, 'Backspace')
    expect(remove).not.toHaveBeenCalled()
    expect(prevented).toBe(true)
    expect(document.activeElement).toBe(grip)
  })

  it('khối ảnh có chú thích: Backspace chỉ xoá chữ', () => {
    const { stop, caption, grip } = image(true)
    caption.value = 'chú thích'
    const { remove, prevented } = press(stop, caption, 'Backspace')
    expect(remove).not.toHaveBeenCalled()
    expect(prevented).toBe(false)
    expect(document.activeElement).not.toBe(grip)
  })

  it('Delete trong ô chữ còn chữ là xoá chữ, không đụng tới khối', () => {
    const { stop, inputs } = mount(['còn chữ'])
    const { remove, prevented } = press(stop, inputs[0], 'Delete')
    expect(remove).not.toHaveBeenCalled()
    expect(prevented).toBe(false)
  })
})
