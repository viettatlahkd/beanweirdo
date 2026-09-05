import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

/*
 * Chủ site: "kéo xuống thì hiệu ứng ảnh apply, nhưng kéo ngược lên thì scroll
 * hoàn toàn tĩnh". Nên bài kiểm này diễn lại đúng đường cuộn ấy: xuống, ra khỏi
 * màn, rồi ngược lên — và đòi ô ảnh diễn lại ở lượt sau.
 *
 * jsdom không có IntersectionObserver, nên ở đây dựng một cái giả mà mình cầm
 * được nút bấm: gọi `enter()` / `leave()` chính là cuộn.
 */
type Entry = { target: Element; isIntersecting: boolean; intersectionRatio: number }
type Cb = (entries: Entry[]) => void

let fire: Cb | null = null
let threshold: unknown = null
const watching = new Set<Element>()

class FakeObserver {
  constructor(cb: Cb, options?: IntersectionObserverInit) {
    fire = cb
    threshold = options?.threshold
  }
  observe(el: Element) {
    watching.add(el)
  }
  unobserve(el: Element) {
    watching.delete(el)
  }
  disconnect() {
    watching.clear()
  }
}
// @ts-expect-error test-only stub, not a full IntersectionObserver
global.IntersectionObserver = FakeObserver

const { Rise } = await import('./Rise')

function mount() {
  const { container } = render(<Rise from={['-34px', '0px']} />)
  return container.firstElementChild as HTMLElement
}

const at = (el: HTMLElement, ratio: number) =>
  act(() => {
    fire?.([{ target: el, isIntersecting: ratio > 0, intersectionRatio: ratio }])
  })

describe('Rise', () => {
  beforeEach(() => {
    watching.clear()
  })

  it('ẩn cho tới khi lộ ra đủ, rồi trôi vào chỗ', () => {
    const el = mount()
    expect(el.style.opacity).toBe('0')
    expect(el.style.transform).toBe('translate(-34px, 0px)')

    at(el, 1)
    expect(el.style.opacity).toBe('1')
    expect(el.style.transform).toBe('none')
  })

  it('diễn lại khi cuộn ngược lên', () => {
    const el = mount()
    at(el, 1)
    at(el, 0) // ra hẳn khỏi màn — người đọc cuộn qua khỏi dải
    expect(el.style.opacity).toBe('0')
    expect(el.style.transform).toBe('translate(-34px, 0px)')

    at(el, 1) // cuộn ngược lên, dải vào lại tầm mắt
    expect(el.style.opacity).toBe('1')
  })

  it('không nhấp nháy khi ô nằm vắt ngang mép màn', () => {
    // Hiện ở 12%, chỉ ẩn khi ra hẳn. Giữa hai mốc thì giữ nguyên trạng thái —
    // nếu hiện và ẩn chung một mốc thì mỗi pixel cuộn là một lần bật tắt.
    const el = mount()
    at(el, 1)
    at(el, 0.05)
    expect(el.style.opacity).toBe('1')

    at(el, 0)
    at(el, 0.05)
    expect(el.style.opacity).toBe('0')
  })

  it('vẫn theo dõi tiếp sau lượt đầu', () => {
    // Bản cũ `unobserve` ngay khi hiện xong; còn theo dõi mới còn diễn lại được.
    const el = mount()
    at(el, 1)
    expect(watching.has(el)).toBe(true)
    expect(threshold).toEqual([0, 0.12])
  })
})
