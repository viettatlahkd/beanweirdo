import type { CSSProperties, ReactNode } from 'react'
import { sans, serif, wrapTitle } from './tokens'

/**
 * Bitesize note — dạng ghi ngắn của Ghi 01.
 *
 * Đây là dàn trang chủ site chỉ đích danh: "t thích format của bài Quan sát
 * trên Ghi 01". Nó từng không phải một template mà là một loại thực thể riêng
 * (bảng `notes`) với bộ vẽ nằm thẳng trong màn Ghi 01. Gộp ghi chép vào bài
 * đăng thì bộ vẽ ấy mất theo, nên dựng lại ở đây — lần này là một template như
 * bốn cái kia, dùng được dưới bất kỳ module nào.
 *
 * Số đo lấy từ bản design gốc (`frontend/design/prototype/Coffee Study Blog
 * v4.dc.html`, khối `isNotes`), không phải vẽ lại theo trí nhớ: vệt sáng sau
 * tiêu đề nở từ 0% sang 100%, gạch đầu thẻ dài 34px nở ra hết bề ngang, thân
 * bài cắt hai dòng và mờ .5 cho tới khi rê chuột vào.
 */

export type BitesizeLength = 'dài' | 'vừa' | 'ngắn' | 'media'

export type BitesizePostData = {
  title: string
  /** Tag của bài — chữ nhỏ in hoa ở hàng đầu, mang mực riêng của nó. */
  tag: string
  date: string
  /** Số đếm ngược trong danh sách, dạng hai chữ số. Rỗng thì không vẽ. */
  num: string
  pinned: boolean
  /** Ảnh chính. Không có thì ô ảnh là mảng màu mang chữ gợi ý. */
  image: string | null
  /** Mực của tag — số thứ tự và tên tag đeo màu này. */
  ink: string
  /** Mảng màu của tag: nền ô ảnh trống, và vệt sáng sau tiêu đề. */
  wash: string
  /** Quyết định cỡ tiêu đề. `media` là bài chỉ có clip, chữ ít nhất. */
  len: BitesizeLength
  /** Khung ảnh dọc — ảnh đứng cạnh chữ chứ không nằm trên. */
  portrait: boolean
  /** Chữ trong ô ảnh khi chưa đặt ảnh. */
  mediaHint: string
  /** Chữ trong ô ảnh phụ, chỉ hiện khi bài mở hết. */
  sub: string
  text: string
  /**
   * Màu của module bài được xếp vào.
   *
   * Thẻ trong danh sách mang màu của TAG, không mang màu module — cả trang Ghi
   * 01 phân biệt bài bằng mực của tag. Nhưng bài mở ra là một trang, và luật
   * chung của hệ (`everyTemplate.test.tsx`) là trang nào cũng phải cho người
   * đọc thấy nó được xếp ở đâu. Nên dải màu module chỉ có ở dạng mở.
   */
  band?: { bg: string; fg?: string }
}

export type BitesizeOverrides = {
  renderTitle?: (title: string) => ReactNode
  renderText?: (text: string) => ReactNode
  renderTag?: (tag: string) => ReactNode
  renderDate?: (date: string) => ReactNode
  /** Chữ trong ô ảnh — chủ site đặt, không phải câu hệ thống áp xuống. */
  renderMediaHint?: (hint: string) => ReactNode
  renderSub?: (sub: string) => ReactNode
}

export type BitesizeProps = BitesizeOverrides & {
  post: BitesizePostData
  breadcrumb?: ReactNode
  mobile?: boolean
}

export type BitesizeCardProps = BitesizeOverrides & {
  post: BitesizePostData
  /** Con trỏ đang ở trên thẻ: vệt sáng nở ra, thân bài rõ lên. */
  hovered?: boolean
  /** Tỉ lệ ô ảnh — trang xếp lưới quyết định, không phải thẻ. */
  aspect?: string
  /** Bề ngang ô ảnh trong ô lưới. */
  mediaWidth?: string
  mobile?: boolean
}

/** Cỡ tiêu đề đi theo độ dài bài — bài dài đội tiêu đề lớn hơn. */
export function titleSize(len: BitesizeLength, portrait: boolean, open: boolean): number {
  if (open) return 52
  if (portrait) return 23
  return len === 'dài' ? 40 : len === 'vừa' ? 34 : 27
}

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 9.5,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
}

/** Ô ảnh: ảnh thật thì phủ kín, chưa có thì mảng màu mang chữ gợi ý. */
function Media({
  post,
  aspect,
  width,
  hint,
  style,
}: {
  post: BitesizePostData
  aspect: string
  width: string
  hint?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        flex: 'none',
        aspectRatio: aspect,
        width,
        /*
         * Viết tách từng thuộc tính chứ không dùng lối rút gọn `background`.
         * Lối rút gọn kèm `url(...) center/cover` bị jsdom bỏ im lặng, nên bài
         * kiểm không nhìn thấy ảnh nào cả — và một ô ảnh mất nền thì trên
         * trình duyệt cũng chẳng có gì báo.
         */
        backgroundColor: post.image ? undefined : post.wash,
        backgroundImage: post.image ? `url(${post.image})` : undefined,
        backgroundSize: post.image ? 'cover' : undefined,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 14,
        ...label,
        fontWeight: 500,
        color: '#1F3A38',
        transition: 'aspect-ratio .6s cubic-bezier(.16,.84,.32,1)',
        ...style,
      }}
    >
      {post.image ? null : (hint ?? post.mediaHint)}
    </div>
  )
}

/**
 * Gạch mở đầu, rồi hàng số — ghim — tag — ngày.
 *
 * Gạch dài 34px lúc nghỉ và kéo hết bề ngang khi thẻ thức dậy; đó là chuyển
 * động duy nhất của hàng này, nên nó phải chạy chậm hơn mọi thứ khác (.7s).
 */
function Meta({
  post,
  wide,
  renderTag,
  renderDate,
}: {
  post: BitesizePostData
  wide: boolean
  renderTag?: (tag: string) => ReactNode
  renderDate?: (date: string) => ReactNode
}) {
  return (
    <>
      <div
        style={{
          height: 1,
          background: '#12120F',
          width: wide ? '100%' : 34,
          transition: 'width .7s cubic-bezier(.16,.84,.32,1)',
          marginBottom: 14,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16, fontFamily: sans }}>
        {post.num ? (
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color: post.ink }}>{post.num}</div>
        ) : null}
        {post.pinned ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...label, fontSize: 9.5, letterSpacing: '.22em', color: '#C25C7C' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50% 50% 50% 0', background: '#C25C7C' }} />
            <div>ghim</div>
          </div>
        ) : null}
        <div style={{ ...label, letterSpacing: '.26em', color: post.ink }}>{renderTag ? renderTag(post.tag) : post.tag}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: '.16em', color: '#B0B0A6', fontVariantNumeric: 'tabular-nums' }}>
          {renderDate ? renderDate(post.date) : post.date}
        </div>
      </div>
    </>
  )
}

/**
 * Tiêu đề trên vệt sáng.
 *
 * Vệt là một `linear-gradient` nở theo `background-size`, không phải một khối
 * nền bật tắt: chữ nhiều dòng thì vệt ôm từng dòng một
 * (`box-decoration-break: clone`) và chạy từ trái sang như người ta tô bút dạ.
 */
function Title({
  post,
  size,
  lit,
  heading,
  render,
}: {
  post: BitesizePostData
  size: number
  lit: boolean
  /** Trang riêng của bài dựng `h1`; thẻ trong danh sách thì không. */
  heading?: boolean
  render?: (title: string) => ReactNode
}) {
  const Tag = heading ? 'h1' : 'div'
  return (
    <Tag
      lang={heading ? 'en' : undefined}
      style={{
        fontFamily: serif,
        fontSize: size,
        lineHeight: 1.14,
        letterSpacing: '-.035em',
        marginBottom: 16,
        fontWeight: 400,
        marginTop: 0,
        ...(heading ? wrapTitle : null),
      }}
    >
      <span
        style={{
          display: 'inline',
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          padding: '.04em .14em',
          marginLeft: '-.14em',
          color: '#12120F',
          backgroundImage: `linear-gradient(${post.wash}, ${post.wash})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: lit ? '100% 100%' : '0% 100%',
          backgroundPosition: 'left center',
          transition: 'background-size .6s cubic-bezier(.16,.84,.32,1)',
        }}
      >
        {render ? render(post.title) : post.title}
      </span>
    </Tag>
  )
}

/**
 * Thẻ thu — dạng bài nằm trong danh sách Ghi 01.
 *
 * Thân bài cắt đúng hai dòng và mờ đi cho tới khi con trỏ chạm vào. Đó là điều
 * làm cả trang đọc được: tám thẻ mở hết thân bài thì không còn là một trang
 * lướt, mà là tám bài chồng lên nhau.
 */
export function BitesizeCard({
  post,
  hovered = false,
  aspect,
  mediaWidth,
  mobile = false,
  renderTitle,
  renderText,
  renderTag,
  renderDate,
  renderMediaHint,
}: BitesizeCardProps) {
  const ar = aspect ?? (post.portrait ? '3/4' : '4/3')
  const width = mediaWidth ?? (post.portrait ? '40%' : '100%')
  return (
    <div style={{ display: 'flow-root' }}>
      <Meta post={post} wide={hovered} renderTag={renderTag} renderDate={renderDate} />
      <div
        style={{
          display: 'flex',
          flexDirection: post.portrait && !mobile ? 'row' : 'column',
          gap: post.portrait ? 30 : 20,
          alignItems: 'flex-start',
          marginBottom: 18,
        }}
      >
        <Media post={post} aspect={ar} width={mobile ? '100%' : width} hint={renderMediaHint?.(post.mediaHint)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title post={post} size={titleSize(post.len, post.portrait, false)} lit={hovered} render={renderTitle} />
          <div
            style={{
              fontFamily: sans,
              fontWeight: 200,
              fontSize: 14,
              lineHeight: 1.62,
              color: '#4A4A42',
              opacity: hovered ? 1 : 0.5,
              transition: 'opacity .5s ease',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {renderText ? renderText(post.text) : post.text}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Bài mở hết — trang riêng của nó, và cũng là dạng xổ tại chỗ trong Ghi 01.
 *
 * Khác thẻ thu ở ba chỗ: nền trắng nổi lên khỏi trang, tiêu đề 52px, và thân
 * bài chảy quanh ảnh (`float`) thay vì đứng dưới ảnh — nên bài dài không đẩy
 * ảnh lên tít trên đầu.
 */
export function Bitesize({
  post,
  breadcrumb,
  mobile = false,
  renderTitle,
  renderText,
  renderTag,
  renderDate,
  renderMediaHint,
  renderSub,
}: BitesizeProps) {
  return (
    <div
      style={{
        display: 'flow-root',
        backgroundColor: '#FFFFFF',
        padding: mobile ? '24px 20px 28px' : '36px 40px 40px',
        boxShadow: '0 40px 80px -50px rgba(18,18,15,.55), 0 2px 0 rgba(18,18,15,.06)',
      }}
    >
      {breadcrumb}
      {post.band ? (
        <div
          style={{
            backgroundColor: post.band.bg,
            color: post.band.fg ?? '#FFFFFF',
            height: 8,
            margin: mobile ? '-24px -20px 22px' : '-36px -40px 26px',
          }}
        />
      ) : null}
      <Meta post={post} wide renderTag={renderTag} renderDate={renderDate} />
      <Media
        post={post}
        aspect={post.portrait ? '9/16' : '4/3'}
        width={mobile ? '100%' : post.portrait ? '250px' : '300px'}
        hint={renderMediaHint?.(post.mediaHint)}
        style={
          mobile
            ? { marginBottom: 22 }
            : { float: 'left', marginRight: 34, marginBottom: 22 }
        }
      />
      <Title post={post} size={mobile ? 34 : titleSize(post.len, post.portrait, true)} lit heading render={renderTitle} />
      {post.sub && !mobile ? (
        <div style={{ float: 'right', clear: 'left', width: 190, margin: '6px 0 18px 30px' }}>
          <div
            style={{
              aspectRatio: '4/5',
              backgroundColor: post.wash,
              display: 'flex',
              alignItems: 'flex-end',
              padding: 12,
              ...label,
              fontSize: 9,
              letterSpacing: '.18em',
              color: '#1F3A38',
              lineHeight: 1.5,
            }}
          >
            {renderSub ? renderSub(post.sub) : post.sub}
          </div>
        </div>
      ) : null}
      <div style={{ fontFamily: sans, fontWeight: 200, fontSize: 15.5, lineHeight: 1.62, color: '#4A4A42', whiteSpace: 'pre-line' }}>
        {renderText ? renderText(post.text) : post.text}
      </div>
    </div>
  )
}
