/**
 * Một hình cho mỗi loại khối trong menu `+`.
 *
 * Trước đây chỗ này là một bảng ký tự Unicode mượn tạm — `▊` cho khối nhấn,
 * `⋮` cho số liệu, `▣` cho ảnh. Mượn ký tự thì mỗi máy vẽ một kiểu: nó là
 * **chữ**, nên nó theo font của hệ điều hành, đậm nhạt và cao thấp không ai
 * giống ai, và mấy ký tự hiếm thì Windows vẽ ra ô vuông rỗng.
 *
 * Nên nay là SVG viết tay: cùng một nét 1.5px, cùng một khung 16×16, ăn màu
 * của chữ quanh nó. Nét liền, không nét đứt — đúng luật hình của trang.
 */

const SIZE = 16

/** Nét vẽ chung, để mười ba cái hình không ai dày mỏng khác ai. */
const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/*
 * Mỗi hình nói **thứ nó tạo ra**, không nói tên loại.
 *
 * Tiêu đề là một dòng dày trên hai dòng mảnh, vì đó đúng là cái người viết sẽ
 * thấy sau khi bấm. Biểu đồ là ba cột cao dần; bảng là lưới; ảnh là khung có
 * mặt trời và ngọn núi. Đọc bằng mắt trong một nhịp, như chủ site chỉ sang
 * Lark.
 */
const SHAPES: Record<string, React.ReactNode> = {
  heading: (
    <>
      <path d="M3 4h10" strokeWidth={2.2} />
      <path d="M3 8.5h8M3 12h6" />
    </>
  ),
  paragraph: <path d="M3 4h10M3 8h10M3 12h6" />,
  meta: (
    <>
      <path d="M3 5.5h4" strokeWidth={2.2} />
      <path d="M3 10.5h10" />
    </>
  ),
  quote: (
    <>
      <path d="M3 4.5v7" strokeWidth={2.2} />
      <path d="M6.5 6h6.5M6.5 10h4" />
    </>
  ),
  callout: (
    <>
      <rect x={2.5} y={3.5} width={11} height={9} rx={2} />
      <path d="M5.5 3.8v8.4" strokeWidth={2.2} />
    </>
  ),
  aside: (
    <>
      <rect x={2.5} y={3.5} width={11} height={9} rx={2} />
      <path d="M5.5 7h5M5.5 9.8h3" />
    </>
  ),
  formula: (
    <>
      {/* Dấu chia rồi dấu bằng: ở 16px thì đó là thứ đọc ra "công thức"
          nhanh nhất, và không lẫn với ba gạch của đoạn văn. */}
      <path d="M2.5 8h5" />
      <path d="M5 5.2h.01M5 10.8h.01" strokeWidth={2.4} />
      <path d="M10 6.4h3.5M10 9.6h3.5" />
    </>
  ),
  list: (
    <>
      <path d="M3.2 4.5h.01M3.2 8h.01M3.2 11.5h.01" strokeWidth={2.4} />
      <path d="M6.5 4.5h6.5M6.5 8h6.5M6.5 11.5h6.5" />
    </>
  ),
  'list-ordered': (
    <>
      <path d="M2.6 3.4l1-.4v3M2.4 13h2M2.4 13c1.4-1.2 2-1.9 2-2.5 0-.5-.4-.9-1-.9-.5 0-.9.3-1 .8" />
      <path d="M6.8 4.5h6.4M6.8 8h6.4M6.8 11.5h6.4" />
    </>
  ),
  table: (
    <>
      <rect x={2.5} y={3.5} width={11} height={9} rx={1.6} />
      <path d="M2.5 6.8h11M8 6.8v5.7" />
    </>
  ),
  metrics: (
    <>
      <path d="M3 4.5h3M3 7.4h2" strokeWidth={2.2} />
      <path d="M3 11.6h4" />
      <path d="M10 4.5h3M10 7.4h2" strokeWidth={2.2} />
      <path d="M10 11.6h4" />
    </>
  ),
  chart: (
    <>
      <path d="M3 13h10" />
      <path d="M5 13V9.5M8 13V5.5M11 13V7.5" strokeWidth={2.2} />
    </>
  ),
  image: (
    <>
      <rect x={2.5} y={3.5} width={11} height={9} rx={1.6} />
      <circle cx={6} cy={6.8} r={1.1} />
      <path d="M3.2 11.4l2.9-2.6 3 2.3 1.6-1.3 2.4 2" />
    </>
  ),
}

/** Hình mặc định cho loại chưa ai vẽ: một khung rỗng, không phải ô vuông lạ. */
const FALLBACK = <rect x={3} y={3.5} width={10} height={9} rx={2} />

export function BlockIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 16 16" width={SIZE} height={SIZE} aria-hidden focusable="false" {...STROKE}>
      {SHAPES[name] ?? FALLBACK}
    </svg>
  )
}
