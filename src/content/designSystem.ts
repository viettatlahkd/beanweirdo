import { sans, serif } from '../design/tokens'

export const swatches = [
  { name: 'cream paper', hex: '#FDFBF2', fg: '#4B463A' },
  { name: 'blush', hex: '#F2A0A5', fg: '#3B2A2B' },
  { name: 'leaf', hex: '#7FB87E', fg: '#1F3323' },
  { name: 'apricot', hex: 'oklch(0.50 0.135 14)', fg: '#3B2E19' },
  { name: 'moss', hex: '#2B4B33', fg: '#E4F0DF' },
  { name: 'petal tint', hex: '#FBE7E5', fg: '#4B463A' },
  { name: 'leaf tint', hex: '#E4F0DF', fg: '#4B463A' },
  { name: 'honey tint', hex: '#F9EBD2', fg: '#4B463A' },
  { name: 'cinnamon', hex: '#8A5A33', fg: '#F6E2B0' },
  { name: 'ink', hex: '#23211A', fg: '#E4E0CE' },
]

/** Seven sizes, two families. The right column says which is which. */
export const typeScale = [
  { token: 'display', family: serif, size: '92px', sample: 'sensory', spec: 'Playfair Display 92–100 / lh .94 / ls -.04em — tiêu đề trang module' },
  { token: 'h1', family: serif, size: '72px', sample: 'Chlorogenic', spec: '72 / lh .96 / ls -.04em — tiêu đề bài viết' },
  { token: 'h2', family: serif, size: '44px', sample: 'biochemistry', spec: '44 / lh 1 — tên module ở trang index' },
  { token: 'h3', family: serif, size: '24px', sample: 'Bean Composition', spec: '21–25 / lh 1.15 — tên bài trong danh mục' },
  { token: 'lead', family: serif, size: '22px', sample: 'nghiêng, dẫn nhập', spec: 'italic 22–24 / lh 1.4 — sapo dưới tiêu đề' },
  { token: 'body', family: sans, size: '16px', sample: 'Thân bài tiếng Việt', spec: 'Be Vietnam Pro Light 300 · 16 / lh 1.5 — thân bài; 13.5 / lh 1.4 — mô tả' },
  { token: 'label', family: sans, size: '11px', sample: 'TREATMENT — 2026.02', spec: 'Be Vietnam Pro Light 300 · 9.5–11 / ls .14em / uppercase — nhãn, số, ngày' },
]

export const spaceScale = [
  { px: '8px', use: 'khe giữa các ô ảnh trong một dải' },
  { px: '20px', use: 'khoảng trong ô: ảnh ↔ tiêu đề bài' },
  { px: '40px', use: 'khe giữa các cột chữ' },
  { px: '64px', use: 'chữ ↔ dải ảnh trong cùng section' },
  { px: '96px', use: 'giữa hai section màu' },
]

export const gridRules = [
  { k: 'sidebar', v: '64px khi đóng, 268px khi rê chuột' },
  { k: 'padding', v: '56px hai bên, 44px trên / 72px dưới mỗi section' },
  { k: 'measure', v: 'thân bài tối đa 1140px, cột chữ ~600px' },
  { k: 'rail', v: 'cột phụ 200–260px, sticky top 44px' },
  { k: 'ảnh', v: 'dải cao 310px; ảnh chính ≥ 1.7× ảnh phụ' },
  { k: 'lệch', v: 'ô ảnh lệch khỏi lưới −40…+52px, không xoay' },
]

export const colorRules = [
  { n: '01', t: 'Nền kem là mặc định. Mỗi module có một khối màu lớn ở đầu trang, không lặp lại giữa bài.' },
  { n: '02', t: 'Ba hue chính đều ở độ bão hoà vừa — tươi nhưng không chói, đọc lâu không mỏi.' },
  { n: '03', t: 'Xanh rêu đậm là màu neo: sidebar, ô trích dẫn, thanh điều hướng.' },
  { n: '04', t: 'Xanh lá đậm dùng cho liên kết và trạng thái hover trên toàn site.' },
  { n: '05', t: 'Tint nhạt chỉ dùng làm nền khung ảnh và thumbnail, không dùng cho chữ.' },
  { n: '06', t: 'Module mới lấy một hue thiên nhiên khác cùng độ bão hoà: tím oải hương, xanh trời, nâu quế.' },
]

export const imageRules = [
  { n: '01', t: 'Một ảnh chủ đạo cho một màn. Ảnh nhỏ đi kèm phải nhỏ rõ rệt.' },
  { n: '02', t: 'Không chồng layer, không ảnh dưới chữ, không gradient phủ.' },
  { n: '03', t: 'Ảnh đặt trên nền kem hoặc tint của module, không viền, không đổ bóng.' },
  { n: '04', t: 'Vật thể đơn hoặc chuỗi vật thể lặp lại. Không bối cảnh, không đạo cụ.' },
  { n: '05', t: 'Ánh sáng ban ngày, tương phản dịu, màu vật thể phải nói chuyện được với hue module.' },
  { n: '06', t: 'Tỉ lệ dùng lại: 16:5 hero, 4:3 module, 1:1 tiêu bản, 3:4 chuỗi.' },
]
