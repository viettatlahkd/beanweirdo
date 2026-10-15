/**
 * Thu nhỏ ảnh ngay trong trình duyệt, trước khi tải lên.
 *
 * Kho ảnh từng nhận nguyên tệp chụp từ máy: có tấm 4,7MB, nhiều PNG chụp màn
 * hình 0,5–1,5MB. Người đăng chờ cả tệp ấy đi lên, rồi chính hộp cắt ảnh tải
 * nó về lại, rồi mỗi người đọc cũng tải nguyên tấm — trong khi khung rộng nhất
 * của trang chỉ 1320px. Cạnh dài 2400px vẫn nét trên màn hình mật độ gấp đôi.
 */
const LONG_EDGE = 2400
const QUALITY = 0.85
/** Tệp nhỏ hơn mức này mà không phải thu kích thước thì để nguyên: nén lại chỉ mất nét. */
const SMALL_ENOUGH = 300 * 1024

/*
 * GIF có thể là ảnh động, SVG là hình vector — vẽ qua canvas sẽ làm hỏng cả
 * hai. HEIC thì Chrome không giải mã được; `createImageBitmap` ném lỗi và tệp
 * đi nguyên như cũ.
 */
const RASTER = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'])

function fitWithin(width: number, height: number, max = LONG_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/**
 * Trả về tệp đã thu nhỏ, hoặc chính tệp đưa vào khi không có gì để lợi —
 * video, GIF, tệp đã đủ nhỏ, hay trình duyệt không giải mã được. Không bao giờ
 * ném lỗi: thu nhỏ hụt thì vẫn tải ảnh gốc lên, ảnh không được mất.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!RASTER.has(file.type) || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const size = fitWithin(bitmap.width, bitmap.height)
    if (size.width === bitmap.width && file.size <= SMALL_ENOUGH) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height)
    bitmap.close()

    /*
     * WebP giữ được nền trong suốt của PNG và nhỏ hơn JPEG cùng độ nét. Safari
     * cũ không mã hoá được WebP và lặng lẽ trả PNG; khi ấy ảnh chụp thành JPEG,
     * còn PNG giữ PNG để không mất nền trong suốt.
     */
    let blob = await encode(canvas, 'image/webp')
    if (blob?.type !== 'image/webp') blob = await encode(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg')
    if (!blob || blob.size >= file.size) return file

    const ext = blob.type.split('/')[1] === 'jpeg' ? 'jpg' : blob.type.split('/')[1]
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}
