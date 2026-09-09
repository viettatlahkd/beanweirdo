import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { getElement, type StoredElement } from './elements'
import { paletteFrom } from './palette'
import { paper, sans, serif, wrapTitle } from './tokens'

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

/*
 * Ba độ dài, không phải bốn. Bản gốc có thêm 'media' nghĩa là "bài này là một
 * clip" — nhưng đó là một trục khác, và nay nó là `media` bên dưới. Một giá trị
 * đứng trong danh sách độ dài mà thật ra nói về loại nội dung là chỗ chọn nhầm
 * chờ sẵn.
 */
export type BitesizeLength = 'dài' | 'vừa' | 'ngắn'

/**
 * Hai dàn trang, một bộ vẽ.
 *
 * `img` — tiêu đề dẫn đầu, chiếm hết bề ngang; ảnh và ô ảnh phụ nằm dưới nó,
 * chữ chảy quanh cả hai. Ảnh tĩnh cao 225px nên tiêu đề đứng cạnh nó thì thừa
 * chỗ; cho tiêu đề đi trước là hết thừa.
 *
 * `vid` — clip dẫn đầu bên trái, tiêu đề và chữ đứng cạnh. Clip xổ dài xuống
 * dưới nên nó cần cả chiều cao, và chữ có chỗ mà chạy dọc theo.
 */
export type BitesizeMedia = 'img' | 'vid'

/** Mực và mảng màu của dạng clip — bên design đặt từ bản gốc, dạng `video`. */
export const CLIP_INK = '#172124'
export const CLIP_WASH = '#8CBAB4'

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
  /**
   * Chữ trong ô ảnh phụ.
   *
   * Khác chữ ở ô chính: ô chính mang một câu GỢI Ý, đặt ảnh vào là nó biến mất
   * vì việc của nó đã xong. Ô phụ mang một CHÚ THÍCH, nên nó ở lại trên ảnh —
   * cùng cách trang chủ chú thích ảnh (`captionOnPhoto`).
   */
  sub: string
  /** Ảnh của ô phụ. Chưa có thì ô là mảng màu mang chú thích. */
  subImage: string | null
  /** Khung hình đắp vào clip lúc chưa chạy — không có thì trình duyệt vẽ ô đen. */
  poster?: string | null
  /**
   * Khối nội dung thêm vào sau đoạn dẫn — tiêu đề, danh sách, bảng, ảnh…
   *
   * Cùng kho element với các template khác, nên một cái heading ở đây và một
   * cái heading ở memo là CÙNG một thứ, không phải hai bản sao. Đoạn dẫn
   * (`text`) vẫn đứng riêng ở trên: nó là cái làm nên dạng ghi ngắn, có hay
   * không có khối nào theo sau.
   */
  elements?: StoredElement[]
  /** Ảnh tĩnh hay clip — quyết định cả dàn trang lẫn màu. */
  media: BitesizeMedia
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
  /** Bọc một khối, để màn sửa treo tay nắm của nó lên. */
  wrapElement?: (element: ReactNode, index: number, attributes: { type: string }) => ReactNode
  /** Chỗ màn sửa đặt nút "thêm khối", dưới khối cuối cùng. */
  renderAfterElements?: () => ReactNode
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

/**
 * Khung hình, chốt về base set.
 *
 * Hai hình cho clip và hai hình cho ảnh, không sinh hình thứ ba: một clip 4:3
 * vẫn xếp vào khung ngang 16:9. Cùng luật với `frontend/src/lib/mediaShape.ts`
 * — gói này không phụ thuộc được vào `frontend/`, nên bốn dòng ấy nằm hai nơi;
 * đổi bên nào thì đổi cả bên kia.
 */
export function frameOf(post: Pick<BitesizePostData, 'media' | 'portrait'>): string {
  if (post.media === 'img') return post.portrait ? '3/4' : '4/3'
  return post.portrait ? '9/16' : '16/9'
}

/** Bề ngang ô ảnh phụ, và khoảng lề phải nó chừa lại cho thân bài. */
const SUB_W = 170
const SUB_GUTTER = SUB_W + 30
/** 170 ở khung 4:5 cao 212; khối chữ phải đủ cao để ô ấy có chỗ đứng. */
const SUB_MIN_H = 330

/** Cỡ tiêu đề đi theo độ dài bài — bài dài đội tiêu đề lớn hơn. */
export function titleSize(len: BitesizeLength, portrait: boolean, open: boolean): number {
  if (open) return 52
  if (portrait) return 23
  return len === 'dài' ? 40 : len === 'vừa' ? 34 : 27
}

/** Đoạn văn, đúng hệ chữ của kho element — xem `elements/text.tsx`. */
const paraStyle: CSSProperties = {
  fontFamily: sans,
  fontWeight: 300,
  fontSize: 15.5,
  lineHeight: 1.55,
  color: '#4A4A42',
  margin: '0 0 20px',
  textAlign: 'justify',
  hyphens: 'auto',
}

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 9.5,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
}

const stillPreferred = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * Ô phương tiện: clip thì phát, ảnh thì phủ kín, chưa có gì thì mảng màu mang
 * chữ gợi ý.
 *
 * Clip chạy câm và lặp, không có thanh điều khiển — bản design gốc gọi nó là
 * "clip ngắn không tiếng", tức một hình động chứ không phải một cái máy phát.
 * Ai bật `prefers-reduced-motion` thì ngược lại: đứng yên, và có thanh điều
 * khiển để tự bấm.
 */
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
        // Clip nằm phủ kín ô, nên ô phải là mốc toạ độ của nó.
        position: 'relative',
        overflow: 'hidden',
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
      {post.image && post.media === 'vid' ? (
        <video
          src={post.image}
          muted
          loop
          playsInline
          poster={post.poster ?? undefined}
          autoPlay={!stillPreferred()}
          controls={stillPreferred()}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}
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
  const ar = aspect ?? frameOf(post)
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
/**
 * Bài mở hết — trang riêng của nó, và cũng là dạng xổ tại chỗ trong Ghi 01.
 *
 * Hai dàn trang, chọn theo `post.media`. Cả hai đều để chữ chảy quanh ảnh
 * (`float`) thay vì xếp chồng: chữ đứng dưới một tấm ảnh cao 225px thì nửa
 * trang bên phải trống trơn — đúng "khúc trắng tinh trống nguyên" chủ site chỉ
 * ra. Muốn chảy được thì ảnh phải đứng TRƯỚC chữ trong tài liệu, kể cả ô ảnh
 * phụ bên phải; đó là lý do thứ tự dưới đây trông ngược với thứ tự nhìn thấy.
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
  wrapElement,
  renderAfterElements,
}: BitesizeProps) {
  const clip = post.media === 'vid'
  /*
   * Ba dàn trang, không phải hai. Chủ site xem thật rồi tách clip ra làm đôi:
   *
   * clip DỌC — "vẫn chật chội (...) dàn layout cho chữ thấp xuống xíu để cân,
   *   ảnh phụ thì phải thấp, xuống mé 1/3 dưới cùng". Cột phải hẹp lại còn cao
   *   ngồng, nên `float` không kê được gì: dùng lưới hai cột, chữ tụt xuống một
   *   quãng, ô ảnh phụ đẩy hẳn xuống đáy cột.
   *
   * clip NGANG — "hình ảnh hiển thị hơi nhỏ (...) text heading nên ở dưới phần
   *   visual". Nên clip nằm trọn bề ngang ở trên, tiêu đề xuống dưới nó.
   */
  const clipDoc = clip && post.portrait && !mobile
  const clipNgang = clip && !post.portrait && !mobile
  const title = (
    <Title
      post={post}
      size={mobile ? 34 : titleSize(post.len, post.portrait, true)}
      lit
      heading
      render={renderTitle}
    />
  )
  /*
   * Ô ảnh phụ nhỏ hơn ở dạng clip. Clip đã chiếm cột trái cao ngồng, thêm một
   * ô 190px bên phải nữa thì hai mảng màu ép cột chữ ở giữa còn một dải hẹp.
   */
  /*
   * Trang thật không dựng ô ảnh phụ rỗng — một mảng màu không nói gì là rác.
   * Nhưng màn sửa thì phải dựng, nếu không chủ site không có chỗ nào để gõ vào
   * mà tạo ra nó. `renderSub` chỉ có mặt ở màn sửa, nên nó là dấu hiệu đủ.
   */
  const subBox = post.sub || renderSub ? (
    <div style={{ width: clipDoc ? 130 : SUB_W, flex: 'none' }}>
      <div
        style={{
          aspectRatio: '4/5',
          backgroundColor: post.subImage ? undefined : post.wash,
          backgroundImage: post.subImage ? `url(${post.subImage})` : undefined,
          backgroundSize: post.subImage ? 'cover' : undefined,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'flex-end',
          padding: 12,
          ...label,
          fontSize: 9,
          letterSpacing: '.18em',
          color: post.subImage ? paper.cream : '#1F3A38',
          lineHeight: 1.5,
        }}
      >
        <span style={post.subImage ? { background: 'rgba(24,22,17,.55)', padding: '3px 7px' } : undefined}>
          {renderSub ? renderSub(post.sub) : post.sub}
        </span>
      </div>
    </div>
  ) : null

  const media = (
    <Media
      post={post}
      aspect={frameOf(post)}
      /*
       * Clip ngang chiếm trọn bề ngang: ở 340px nó chỉ là một ô nhỏ trên một
       * trang rộng, mà một cái clip thì đáng nhìn hơn thế.
       */
      width={mobile || clipNgang ? '100%' : clipDoc ? '250px' : '300px'}
      hint={renderMediaHint?.(post.mediaHint)}
      style={
        mobile || clipNgang
          ? { marginBottom: clipNgang ? 26 : 22 }
          : clipDoc
            ? { marginBottom: 0 }
            : { float: 'left', marginRight: 34, marginBottom: 22 }
      }
    />
  )

  /*
   * Chữ theo đúng hệ chữ của kho element: 15.5 / 1.55, weight 300, và HAI MƯƠI
   * pixel giữa hai đoạn — xem `elements/text.tsx`. Trước đây khối này tự đặt
   * lấy 200/1.62 và không chừa khoảng nào giữa các đoạn, nên chủ site đọc ra
   * ngay là "khá xít".
   */
  const lead = post.text ? (
    renderText ? (
      <div style={{ ...paraStyle, whiteSpace: 'pre-line' }}>{renderText(post.text)}</div>
    ) : (
      <>
        {post.text.split('\n').map((para, i) => (
          <p key={i} style={paraStyle}>
            {para}
          </p>
        ))}
      </>
    )
  ) : null

  const palette = paletteFrom(post.band?.bg ?? post.ink)
  const elements = post.elements ?? []
  const body = (
    <div style={{ position: 'relative' }}>
      {lead}
      {elements.map((el, i) => {
        const element = getElement(el.type)
        const drawn = element ? (
          <element.View attributes={el} palette={palette} index={i} mobile={mobile} />
        ) : null
        return <Fragment key={i}>{wrapElement ? wrapElement(drawn, i, el) : drawn}</Fragment>
      })}
      {renderAfterElements?.()}
      {/*
        * Ô ảnh phụ neo vào KHỐI CHỮ, không neo vào cả khối có ảnh trong đó.
        *
        * Chủ site: "tính chia phần 3 từ phần body text chứ đừng tính từ title
        * nhé". Ảnh chính thả trôi bên trái, nên neo vào khối bao ngoài thì một
        * tấm ảnh dọc cao hơn chữ sẽ kéo khối ấy dài ra, và cái mốc hai phần ba
        * trượt theo ẢNH chứ không theo chữ.
        */}
      {subBox && !mobile ? (
        <div style={{ position: 'absolute', right: -SUB_GUTTER, bottom: '33.33%' }}>{subBox}</div>
      ) : null}
    </div>
  )

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
      {/*
        * Lề phải của thân bài giữ nguyên một đường từ trên xuống dưới.
        *
        * Trước đây ô ảnh phụ thả trôi bên phải, nên mấy đoạn đầu bị ép hẹp còn
        * đoạn sau — đã qua khỏi ô ấy — lại chạy rộng hết khổ. Mép phải gãy làm
        * hai. Chủ site: "lề phải của nội dung nên đúng bằng 2 đoạn đầu tiên
        * đang có thui (...) cái ảnh phụ thì nên kéo xuống dưới kiểu dạng footer
        * lề phải í."
        *
        * Nên: chừa sẵn một khoảng lề phải đúng bằng chỗ ô ảnh phụ từng chiếm,
        * và ô ấy xuống hẳn dưới cùng, canh phải như một dòng chân trang.
        */}
      {clipDoc ? (
        <div style={{ display: 'grid', gridTemplateColumns: '250px minmax(0, 1fr)', gap: 34 }}>
          {media}
          {/*
            * Cột chữ tụt xuống một quãng và ô ảnh phụ rơi xuống đáy.
            *
            * Chữ dính mép trên trong khi clip cao 444px thì nửa dưới cột phải
            * trống trơn — đúng chỗ chủ site gọi là chật chội. `margin-top: auto`
            * đẩy ô ảnh phụ xuống đáy cột, tức mé một phần ba dưới của clip.
            */}
          <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 96 }}>
            {title}
            {body}
            {subBox ? <div style={{ marginTop: 'auto', paddingTop: 28, alignSelf: 'flex-end' }}>{subBox}</div> : null}
          </div>
        </div>
      ) : (
        <>
          {clipNgang ? media : null}
          {title}
          <div
            style={{
              display: 'flow-root',
              position: 'relative',
              paddingRight: mobile ? 0 : SUB_GUTTER,
              minHeight: mobile || !subBox ? undefined : SUB_MIN_H,
            }}
          >
            {clipNgang ? null : media}
            {body}
          </div>
          {subBox && mobile ? <div style={{ marginTop: 22 }}>{subBox}</div> : null}
        </>
      )}
    </div>
  )
}
