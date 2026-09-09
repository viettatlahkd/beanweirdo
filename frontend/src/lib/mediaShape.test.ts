import { afterEach, describe, expect, it, vi } from 'vitest'
import { frameOf, isPortrait, looksLikeVideo, probeMedia } from './mediaShape'

describe('nhận ra clip', () => {
  it('đọc kiểu tệp khi có tệp trong tay', () => {
    expect(looksLikeVideo(new File([], 'a.mp4', { type: 'video/mp4' }))).toBe(true)
    expect(looksLikeVideo(new File([], 'a.jpg', { type: 'image/jpeg' }))).toBe(false)
  })

  it('đọc đuôi khi chỉ có link, kể cả link có đuôi truy vấn', () => {
    expect(looksLikeVideo('https://x/y.mp4')).toBe(true)
    expect(looksLikeVideo('https://x/y.MOV?token=abc')).toBe(true)
    expect(looksLikeVideo('https://x/y.webm#t=2')).toBe(true)
    expect(looksLikeVideo('https://x/y.jpg')).toBe(false)
    // Không được ăn nhầm một cái tên có chữ mp4 ở giữa.
    expect(looksLikeVideo('https://x/mp4-guide.png')).toBe(false)
  })
})

describe('nằm ngang hay đứng dọc', () => {
  it('cao hơn rộng thì là dọc', () => {
    expect(isPortrait(1080, 1920)).toBe(true)
    expect(isPortrait(1920, 1080)).toBe(false)
  })

  it('vuông tính là ngang', () => {
    // Khung vuông đặt vào cột dọc hẹp thì chữ bên cạnh còn một dải hẹp mà
    // chẳng được gì.
    expect(isPortrait(1000, 1000)).toBe(false)
  })

  it('số vô lý thì không dám gọi là dọc', () => {
    expect(isPortrait(0, 0)).toBe(false)
    expect(isPortrait(Number.NaN, 500)).toBe(false)
  })
})

describe('chốt về base set, không đẻ khung mới', () => {
  it('clip 4:3 vẫn xếp vào khung ngang 16:9', () => {
    expect(frameOf({ kind: 'vid', portrait: false })).toBe('16/9')
    expect(frameOf({ kind: 'vid', portrait: true })).toBe('9/16')
    expect(frameOf({ kind: 'img', portrait: false })).toBe('4/3')
    expect(frameOf({ kind: 'img', portrait: true })).toBe('3/4')
  })
})

/*
 * jsdom không tải phương tiện, nên chỗ đo được thay bằng một phần tử giả mà
 * bài kiểm cầm được nút bấm: bắn `loadedmetadata` là "tải xong", bắn `error`
 * là "link hỏng", không bắn gì là "máy chủ treo".
 */
type Fake = { listeners: Record<string, (() => void)[]>; fire: (e: string) => void }
const fakes: Fake[] = []

function stub(size: { w: number; h: number }) {
  return vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    const listeners: Record<string, (() => void)[]> = {}
    const el = {
      preload: '',
      muted: false,
      src: '',
      videoWidth: size.w,
      videoHeight: size.h,
      naturalWidth: size.w,
      naturalHeight: size.h,
      addEventListener: (e: string, fn: () => void) => {
        ;(listeners[e] ??= []).push(fn)
      },
      tagName: tag.toUpperCase(),
    }
    fakes.push({ listeners, fire: (e) => (listeners[e] ?? []).forEach((fn) => fn()) })
    return el as unknown as HTMLElement
  }) as typeof document.createElement)
}

afterEach(() => {
  vi.restoreAllMocks()
  fakes.length = 0
})

describe('đo một tệp đã nằm trên mạng', () => {
  it('clip dọc đo ra dọc', async () => {
    stub({ w: 1080, h: 1920 })
    const p = probeMedia('https://x/clip.mp4')
    fakes[0].fire('loadedmetadata')
    expect(await p).toEqual({ kind: 'vid', portrait: true })
  })

  it('ảnh ngang đo ra ngang', async () => {
    stub({ w: 2000, h: 1200 })
    const p = probeMedia('https://x/anh.jpg')
    fakes[0].fire('load')
    expect(await p).toEqual({ kind: 'img', portrait: false })
  })

  it('link hỏng thì trả null chứ không ném', async () => {
    // Không đo được thì bài giữ nguyên dàn trang đang có — một link dở không
    // được phép làm hỏng thao tác lưu.
    stub({ w: 0, h: 0 })
    const p = probeMedia('https://x/clip.mp4')
    fakes[0].fire('error')
    expect(await p).toBeNull()
  })

  it('máy chủ treo thì hết giờ, cũng trả null', async () => {
    vi.useFakeTimers()
    stub({ w: 1080, h: 1920 })
    const p = probeMedia('https://x/clip.mp4', 500)
    await vi.advanceTimersByTimeAsync(600)
    vi.useRealTimers()
    expect(await p).toBeNull()
  })
})
