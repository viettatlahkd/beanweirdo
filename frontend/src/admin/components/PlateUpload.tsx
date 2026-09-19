/**
 * Các nút nằm ở góc một ô ảnh cố định của khuôn bài.
 *
 * Trước đây mọi ảnh của một bài đi qua một hàng chữ ở đầu khung sửa: "ảnh bìa:
 * tải ảnh lên – đặt link – đặt vào khung – xoá". Một hàng, cho một ô. Những ô
 * ảnh còn lại — cặp ô mở đầu của article, ô vuông ở cột phải, khung ảnh của
 * long-form — thì không có hàng nào cả, nên trên trang chúng đứng mãi ở chữ
 * "chưa có ảnh".
 *
 * Nút đi theo ô. Nhìn thấy ô nào thì bấm vào đúng góc ô ấy, không phải đối
 * chiếu một cái nhãn ở trên đầu với một mảng màu ở giữa trang. Hàng chữ ấy nay
 * bỏ hẳn, nên **cả bốn việc của nó phải có mặt ở đây**: tải tệp lên, đặt link,
 * đặt vào khung, và gỡ ra.
 *
 * Chỉ có mặt trong màn sửa: khuôn bài nhận nó qua `renderPlateAction`, và trang
 * công khai không truyền gì nên không vẽ gì.
 */
import { useRef, useState } from 'react'
import { IconButton } from '../../design/Button'
import { IconCrop, IconLink, IconTrash, IconUpload } from '../../design/icons'
import { radius } from '../../design/controls'
import { ink, paper } from '../../design/tokens'
import { uploadImage } from '../lib/apiClient'
import { useFraming } from './framing'

export type PlateUploadProps = {
  /** Đang có gì trong ô — quyết định nút gỡ và nút đặt khung có mặt hay không. */
  imageUrl: string | null
  /** `ratio` là hình dạng thật của ô, đo lúc bấm; vắng khi không đo được. */
  onPick: (file: File, ratio: number | null) => void | Promise<void>
  /** Dán một địa chỉ ảnh thay vì tải tệp lên. Vắng thì không có nút đặt link. */
  onLink?: (url: string, ratio: number | null) => void | Promise<void>
  /** Mở lại khung cắt cho tấm ảnh đang có. Vắng thì không có nút ấy. */
  onReframe?: (ratio: number | null) => void | Promise<void>
  /** Gỡ ảnh ra khỏi ô. Vắng thì ô này không gỡ được. */
  onClear?: () => void
  /** Ô ảnh của bitesize nhận cả clip; mọi ô khác chỉ nhận ảnh. */
  accept?: string
  label?: string
}

/**
 * Hình dạng thật của ô ảnh chứa nút này, đo từ trang chứ không tra bảng.
 *
 * Mỗi ô ảnh cố định là mốc toạ độ của chính nó (`plateHost`, hoặc sẵn
 * `absolute` như hero của article), nên `offsetParent` của cái góc chính là ô
 * ảnh. Đo như vậy thì thêm một template hay đổi dàn trang một template đã có
 * không kéo theo một bảng tỉ lệ phải giữ cho khớp — và khung cắt luôn đúng
 * bằng ô mà người dùng đang nhìn.
 */
function cellRatio(node: HTMLElement | null): number | null {
  const corner = node?.closest('[data-plate-corner]')
  /*
   * Ô trang bìa không phải một ô của khuôn bài nên nó không mang
   * `data-plate-corner` — dấu ấy là bản kiểm kê ô ảnh cố định, và đếm nhầm một
   * cái hộp của màn sửa vào đó là bài kiểm kiểm sai thứ. Nó tự mang dấu riêng
   * và CHÍNH NÓ là ô cần đo.
   */
  const cell =
    corner instanceof HTMLElement ? corner.offsetParent : node?.closest('[data-cover-band]')
  if (!(cell instanceof HTMLElement)) return null
  const box = cell.getBoundingClientRect()
  if (box.width < 1 || box.height < 1) return null
  return box.width / box.height
}

export function PlateUpload({
  imageUrl,
  onPick,
  onLink,
  onReframe,
  onClear,
  accept = 'image/*',
  label = 'tải ảnh lên',
}: PlateUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  /*
   * Ô dán link phải là `fixed`, và vì thế phải biết nó nằm ở đâu.
   *
   * Nhiều ô ảnh có `overflow: hidden` — ô phương tiện của bitesize chẳng hạn,
   * vì clip nằm phủ kín ô. Một ô nhập `absolute` bên trong ô ảnh ấy bị cắt mất
   * và người dùng chẳng thấy gì sau khi bấm nút. `fixed` thì không ai cắt
   * được, đổi lại phải tự đo chỗ neo.
   */
  const [linkAt, setLinkAt] = useState<{ top: number; right: number } | null>(null)

  /** Đo trước khi đợi mạng: lúc chờ xong dàn trang có thể đã đổi. */
  async function run(job: (ratio: number | null) => void | Promise<void>) {
    const ratio = cellRatio(wrapRef.current)
    setBusy(true)
    try {
      await job(ratio)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', gap: 6 }}>
      {/*
        `secondary` chứ không phải `ghost`: nút này nằm trên ảnh chứ không nằm
        trên giấy, nên nó cần nền đặc và viền đậm hơn mới đọc được trên một tấm
        ảnh sáng. Hình dạng vẫn là hình dạng chung — cùng bán kính bo, cùng độ
        dày viền, cùng bộ icon.
      */}
      <IconButton
        level="secondary"
        size="sm"
        label={busy ? 'đang tải…' : label}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <IconUpload size={14} />
      </IconButton>

      {onLink && (
        <IconButton
          level="secondary"
          size="sm"
          label="đặt link"
          disabled={busy}
          aria-expanded={linkAt !== null}
          onClick={() => {
            if (linkAt) return setLinkAt(null)
            const box = wrapRef.current?.getBoundingClientRect()
            if (box) setLinkAt({ top: box.bottom + 6, right: window.innerWidth - box.right })
          }}
        >
          <IconLink size={14} />
        </IconButton>
      )}

      {/*
        Đặt vào khung chỉ có nghĩa khi đã có ảnh — chưa có gì thì không có gì để
        căn, và khung cắt tự mở ngay sau khi tải lên hoặc đặt link.
      */}
      {imageUrl && onReframe && (
        <IconButton
          level="secondary"
          size="sm"
          label="đặt vào khung"
          disabled={busy}
          onClick={() => void run(onReframe)}
        >
          <IconCrop size={14} />
        </IconButton>
      )}

      {imageUrl && onClear && (
        <IconButton level="danger" size="sm" label="gỡ ảnh khỏi ô này" onClick={onClear}>
          <IconTrash size={14} />
        </IconButton>
      )}

      {linkAt && (
        /* Buông xuống ngay dưới hàng nút, neo cùng mép phải với nó. */
        <input
          autoFocus
          aria-label="dán link ảnh"
          placeholder="dán link ảnh rồi Enter"
          onKeyDown={(e) => {
            if (e.key === 'Escape') return setLinkAt(null)
            if (e.key !== 'Enter') return
            const v = (e.target as HTMLInputElement).value.trim()
            setLinkAt(null)
            if (v && onLink) void run((ratio) => onLink(v, ratio))
          }}
          onBlur={() => setLinkAt(null)}
          style={{
            position: 'fixed',
            top: linkAt.top,
            right: linkAt.right,
            zIndex: 30,
            width: 260,
            fontFamily: 'inherit',
            fontSize: 12,
            padding: '5px 8px',
            borderRadius: radius,
            border: `1px solid ${ink.border}`,
            background: paper.white,
            color: ink.base,
          }}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Xoá trước khi dùng: chọn lại đúng tệp vừa chọn thì `change` không
          // bắn nữa nếu giá trị cũ còn nguyên.
          e.target.value = ''
          if (file) void run((ratio) => onPick(file, ratio))
        }}
      />
    </div>
  )
}

/**
 * Bốn nút của một ô ảnh cố định, tự lo cả việc đẩy tệp lên lẫn việc mở khung
 * cắt — dùng cho mọi ô trừ ảnh bìa.
 *
 * Ảnh bìa đi đường riêng (`setHero` trong `Editor`) vì nó còn phải đo khung
 * hình và lấy poster cho clip; những ô còn lại chỉ cần một địa chỉ.
 */
export function PlateImageUpload({
  imageUrl,
  onUrl,
  onClear,
  name = 'ô ảnh của khuôn bài',
}: {
  imageUrl: string | null
  onUrl: (url: string) => void
  onClear?: () => void
  /** Ô nào — hiện trên đầu khung cắt để biết đang căn cho chỗ nào. */
  name?: string
}) {
  const frame = useFraming()

  /*
   * Không đo được ô thì vẫn phải mở khung cắt, chỉ là lấy tỉ lệ ô ảnh hay gặp
   * nhất làm khung: đặt ảnh ở chỗ nào cũng ra cùng một hộp thoại là điều chủ
   * site chốt, nên bỏ qua bước căn vì một phép đo hụt là đúng cái lệch ấy quay
   * lại.
   */
  const place = async (url: string, ratio: number | null) =>
    onUrl(await frame({ url, name, ratio: ratio ?? 1.5 }))

  return (
    <PlateUpload
      imageUrl={imageUrl}
      onPick={async (file, ratio) => {
        const { url } = await uploadImage(file)
        await place(url, ratio)
      }}
      onLink={place}
      onReframe={(ratio) => (imageUrl ? place(imageUrl, ratio) : undefined)}
      onClear={onClear}
    />
  )
}
