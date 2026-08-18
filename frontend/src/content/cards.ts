/**
 * Info-cards content — the flavour-group palette and the sample deck.
 *
 * Lifted from the prototype (`design/prototype/Coffee Study Blog v4.dc.html`,
 * `FLAVOR_GROUPS` / `state.cards`). The groups follow the SCA Flavor Wheel's
 * top level; each carries three colours — a bright one for the dot and rule,
 * a dark ink for text on paper, and a wash for the selected-chip background.
 */

export type FlavorGroup = {
  g: string
  /** dot + rule */
  c: string
  /** text on paper */
  ink: string
  /** selected-chip wash */
  w: string
}

/** One scored line inside a `detail` part. */
export type CardRow = { l: string; s: string; n: string }

export type CardPart = {
  k: 'method' | 'detail' | 'callout'
  h: string
  v?: string
  rows?: CardRow[]
}

export type Card = {
  id: number
  /** two-digit card number */
  n: string
  title: string
  sub: string
  /** flavour groups this card belongs to — the first one colours the card */
  groups: string[]
  /** the compounds behind the note */
  tag: string
  parts: CardPart[]
}

export const FLAVOR_GROUPS: FlavorGroup[] = [
  { g: 'Berry', c: '#D93A6A', ink: '#8E1E42', w: '#FBE4EC' },
  { g: 'Dried Fruit', c: '#C4603F', ink: '#7A3520', w: '#FAE7DE' },
  { g: 'Other Fruit', c: '#F2703A', ink: '#8F3A14', w: '#FDE8DC' },
  { g: 'Citrus Fruit', c: '#F0C020', ink: '#7A5A04', w: '#FCF3D4' },
  { g: 'Floral', c: '#C361C9', ink: '#753A7A', w: '#F8E6FA' },
  { g: 'Sweet', c: '#F0A93C', ink: '#8A5510', w: '#FDEED6' },
  { g: 'Nutty/Cocoa', c: '#A87B4C', ink: '#5C3D1E', w: '#F4E9DB' },
  { g: 'Spices', c: '#E14B2A', ink: '#8A2A13', w: '#FBE3DC' },
  { g: 'Roasted', c: '#8A6248', ink: '#4A2E1D', w: '#EFE5DB' },
  { g: 'Green/Vegetative', c: '#4FAE63', ink: '#256B37', w: '#E4F4E6' },
  { g: 'Sour', c: '#B9D62B', ink: '#5A6B0C', w: '#F2F8D8' },
  { g: 'Fermented', c: '#8B74D9', ink: '#4C3A8E', w: '#EDE9FB' },
  { g: 'Papery/Musty', c: '#9C9684', ink: '#585345', w: '#F0EEE6' },
  { g: 'Chemical', c: '#3D9AB0', ink: '#1E5A69', w: '#E0F1F5' }
]


/**
 * Colours for a group. Groups the reader adds from the tag bar aren't in the
 * wheel, so they cycle through a spare palette instead of failing to render.
 */
const EXTRA_PALETTE: [string, string][] = [
  ['#6FBF5C', '#3B6B2E'],
  ['#F0C020', '#7A5A04'],
  ['#E8628C', '#8E1E42'],
  ['#3D9AB0', '#1E5A69'],
  ['#8B74D9', '#4C3A8E'],
]

export function groupMeta(g: string, extras: string[] = []): FlavorGroup {
  const known = FLAVOR_GROUPS.find((x) => x.g === g)
  if (known) return known
  const i = extras.indexOf(g)
  const [c, ink] = EXTRA_PALETTE[(i < 0 ? 0 : i) % EXTRA_PALETTE.length]
  return { g, c, ink, w: '#F1EFE6' }
}

export const SAMPLE_CARDS: Card[] = [
  { id: 1, n: '01', title: 'Apple', sub: 'crisp sweet, green skin, thin sour tail', groups: ['Other Fruit', 'Green/Vegetative', 'Sour'],
    tag: 'ethyl 2-methylbutyrate · hexanal',
    parts: [
      { k: 'method', h: 'Phương pháp', v: 'Nếm ba dạng cạnh nhau trong một buổi: nguyên quả cắt lát, nước ép tươi không lọc, và nước ép đóng chai. Mỗi dạng 30ml, nhiệt độ phòng, nghỉ 90 giây giữa các mẫu.' },
      { k: 'detail', h: 'Ghi chi tiết', rows: [
        { l: 'ngọt giòn (crisp sweet)', s: '6', n: 'ngọt sáng, không dày; tan nhanh ở đầu lưỡi' },
        { l: 'vỏ xanh, hơi hăng', s: '4', n: '~ hexanal, cảm giác lá tươi bị bấm dập' },
        { l: 'chua đọng cuối vị', s: '5', n: 'mảnh và ngắn, không rít lưỡi' }
      ] },
      { k: 'callout', h: 'Đối chiếu', v: 'Nước ép đóng chai mất hẳn phần vỏ hăng, đổi lại ngọt dày hơn — nghi do quá trình gia nhiệt phá vỡ các aldehyde nhẹ.' }
    ] },
  { id: 2, n: '02', title: 'Pear', sub: 'sweet floral, nectar (ripe-fruit) sweet, green crisp (sour) nuance', groups: ['Other Fruit', 'Floral', 'Sweet'],
    tag: 'ethyl (2E,4Z)-2,4-decadienoate',
    parts: [
      { k: 'method', h: 'Phương pháp', v: 'Hai mẫu: 1oz nước lê Rauch đóng chai, và lê nguyên quả gọt vỏ. Nếm mù, ghi trước khi gọi tên hương.' },
      { k: 'detail', h: '#1 — 1oz Rauch pear nectar', rows: [
        { l: 'ngọt mật (ngọt thỉu, ripe fruit)', s: '5', n: '' },
        { l: 'mùi mát gardenia (fresh herbs, fresh cut-grass)', s: '6', n: '' },
        { l: 'chua đọng cuối vị, nồng, crisp', s: '6', n: '~ citric acid — chua sắc, sâu, nổi, kèm cảm giác mát' }
      ] },
      { k: 'detail', h: '#2 — nguyên quả', rows: [
        { l: 'sweet floral ~ soft, warm-to-hot (white flower)', s: '5', n: '~ benzyl propionate · hậu vị nồng, gần giống note mùi hậu vị của chuối' },
        { l: 'green crisp notes ~ juicy, tangy cider', s: '4', n: '~ manzanate aka ethyl 2-methylpentanoate' },
        { l: 'watery nectar sweet', s: '6', n: 'ngọt mật (rỉ) của cây thân gỗ, hơi xanh mát; citric acid chua rít hàm lượng nhỏ, chỉ đọng ít ở cuối vị' }
      ] },
      { k: 'callout', h: 'east × west', v: '— lê châu Á: subtle về mùi và vị hơn, watery, subtle gardenia với warm-to-hot floral (hoa trắng nhưng có note nồng/nóng) và herb-fresh-cut.\n— lê châu Âu (đóng chai): ngọt đậm của mật rỉ (nectar), gợi nhắc một vài quả stone-fruit như đào, mơ, kèm mùi mát nhẹ không quá nổi.' }
    ] },
  { id: 3, n: '03', title: 'Lemon', sub: 'bright citric sour, herbal-sweet peel, watery finish', groups: ['Citrus Fruit', 'Sour', 'Floral'],
    tag: 'citral · limonene · citric acid',
    parts: [
      { k: 'method', h: 'Phương pháp', v: 'Tách hai phần: vỏ (chà nhẹ để dầu bật ra, ngửi trực tiếp) và nước cốt (5ml không pha loãng). Ghi riêng từng phần rồi mới đối chiếu.' },
      { k: 'detail', h: 'vỏ — ngọt hoa cỏ', rows: [
        { l: 'mùi ngọt nhẹ nhưng dày', s: '5', n: 'đanh và nét như tinh dầu cây cỏ hoặc cây thân gỗ; trong mùi ngọt có note mát ~ hoa cỏ sân vườn (herbaneous, gardenia)' },
        { l: 'vỏ và tinh dầu có mùi sả', s: '4', n: 'hơi cay nhẹ, mùi nét, có chút se sắt' },
        { l: 'hậu mùi ngọt của tinh dầu cây', s: '4', n: '' }
      ] },
      { k: 'detail', h: 'juice', rows: [
        { l: 'mùi ngọt hoa cỏ mát, thanh và nhẹ', s: '6', n: 'kèm note chua mát rất sáng (màu vàng trắng, trong nhẹ ~ nắng hè dịu, gió nhẹ)' },
        { l: 'vị chua gắt của citric', s: '7', n: 'se sắt lưỡi, chua nhăn mặt và hơi tiết nước bọt; đọng chút chát, rít ở cuống họng và lưỡi' },
        { l: 'hậu vị mùi ngọt hoa cỏ floral', s: '5', n: 'tươi và thanh mát, khiến cảm nhận tổng quan có buffer của cảm giác ngọt' }
      ] },
      { k: 'callout', h: 'Giả thuyết', v: 'Hơi có cảm giác mọng nước khi nếm lượng lớn ~ gợi nhắc tới các quả có độ mọng tự nhiên, đặc biệt là quả vải.\n— cảm giác mọng lý giải do cơ chế tiết nước bọt làm water volume tăng.\n— vị giống quả vải: giả thuyết do tổng hoà giữa mùi floral và mouthfeel mọng nước khiến trigger crossmodal association.' }
    ] },
  { id: 4, n: '04', title: 'Stone fruit — đào', sub: 'warm floral sweet, fuzzy skin, low acid', groups: ['Other Fruit', 'Sweet', 'Floral'],
    tag: 'γ-decalactone',
    parts: [
      { k: 'method', h: 'Phương pháp', v: 'Đào chín mềm, nếm cả vỏ và thịt. So sánh với mẫu đào đóng hộp trong siro để tách phần hương do nhiệt sinh ra.' },
      { k: 'detail', h: 'Ghi chi tiết', rows: [
        { l: 'ngọt ấm, dày, gần như có mùi kem sữa', s: '7', n: '~ γ-decalactone, chất tạo nên cảm giác “đào” điển hình' },
        { l: 'floral ấm, không sắc', s: '5', n: 'khác hẳn hoa trắng mát của lê' },
        { l: 'chua rất thấp', s: '2', n: 'nên hậu vị trôi nhanh, thiếu điểm neo' }
      ] },
      { k: 'callout', h: 'Ghi chú', v: 'Đào đóng hộp đẩy lactone lên rất mạnh và xoá hết phần vỏ. Nếu mô tả một mẻ cà phê là “đào”, cần nói rõ đào tươi hay đào siro — hai thứ này gần như không cùng một hương.' }
    ] }
]
