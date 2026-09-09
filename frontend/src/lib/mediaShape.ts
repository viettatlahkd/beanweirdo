/**
 * Ảnh hay clip, nằm ngang hay đứng dọc — đọc ra từ chính tệp.
 *
 * Chủ site: "giả định là t không báo cho m biết trước đâu, input của user chỉ
 * là 1 video m phải tự nhận diện và reformat trên base set m đã có". Nên không
 * có ô nào bắt khai loại nội dung: đính tệp vào là hệ tự đo và tự chọn một
 * trong hai dàn trang đã dựng sẵn.
 *
 * "Trên base set đã có" nghĩa là chốt về hai hình, không sinh hình thứ ba:
 * ngang thì 16:9, dọc thì 9:16. Một clip 4:3 vẫn xếp vào ngang chứ không đẻ ra
 * một khung 4:3 mới.
 */

export type MediaKind = 'img' | 'vid'
export type MediaShape = { kind: MediaKind; portrait: boolean }

/** Đuôi tệp của những định dạng clip trình duyệt mở được. */
const VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv)(?:[?#]|$)/i

export function looksLikeVideo(source: string | File): boolean {
  if (typeof source !== 'string') return source.type.startsWith('video/')
  return VIDEO_EXT.test(source)
}

/**
 * Vuông thì tính là ngang.
 *
 * Dàn trang dọc dành cột trái hẹp và cao cho clip; một khung vuông đặt vào đó
 * thì chữ bên cạnh còn một dải hẹp mà chẳng được gì. Chỉ khi cao hơn rộng thật
 * sự thì mới đáng đổi dàn trang.
 */
export function isPortrait(width: number, height: number): boolean {
  if (!(width > 0) || !(height > 0)) return false
  return height > width
}

/** Khung hình sẽ dùng, sau khi đã chốt về base set. */
export function frameOf(shape: MediaShape): string {
  if (shape.kind === 'img') return shape.portrait ? '3/4' : '4/3'
  return shape.portrait ? '9/16' : '16/9'
}

type Probe = {
  el: HTMLVideoElement | HTMLImageElement
  event: string
  size: () => [number, number]
}

function probeFor(kind: MediaKind): Probe {
  if (kind === 'vid') {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.muted = true
    return { el, event: 'loadedmetadata', size: () => [el.videoWidth, el.videoHeight] }
  }
  const el = document.createElement('img')
  return { el, event: 'load', size: () => [el.naturalWidth, el.naturalHeight] }
}

/**
 * Đo một tệp đã nằm trên mạng.
 *
 * Trả `null` khi không đo được — hết giờ, link hỏng, hoặc máy chủ chặn. Không
 * đo được thì KHÔNG chặn việc lưu bài: bài giữ nguyên dàn trang đang có, chủ
 * site vẫn sửa tay được. Một cái link dở không được phép làm hỏng thao tác lưu.
 */
export function probeMedia(url: string, timeoutMs = 8000): Promise<MediaShape | null> {
  const kind: MediaKind = looksLikeVideo(url) ? 'vid' : 'img'
  return new Promise((resolve) => {
    let done = false
    const finish = (shape: MediaShape | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(shape)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    let probe: Probe
    try {
      probe = probeFor(kind)
    } catch {
      finish(null)
      return
    }
    probe.el.addEventListener(probe.event, () => {
      const [w, h] = probe.size()
      finish(w > 0 && h > 0 ? { kind, portrait: isPortrait(w, h) } : null)
    })
    probe.el.addEventListener('error', () => finish(null))
    probe.el.src = url
  })
}
