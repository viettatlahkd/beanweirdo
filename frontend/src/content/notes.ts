export type NoteKind = 'quan sát' | 'video' | 'cảm nhận' | 'liên ngành'

/** Content length drives the title size — a long note gets a bigger headline. */
export type NoteLength = 'dài' | 'vừa' | 'ngắn' | 'media'

export type Note = {
  d: string
  k: NoteKind
  t: string
  b: string
  len: NoteLength
  /** custom caption for the media placeholder — falls back to a generic hint */
  mediaHint?: string
  /** vertical clip format — narrower media block, taller aspect ratio */
  portrait?: boolean
}

export const notes: Note[] = [
  {
    d: '2026.02.14',
    k: 'quan sát',
    t: 'Vì sao cháo đun quá lâu thì vữa',
    mediaHint: 'ảnh — nồi trên bếp, hơi nước, mặt cháo',
    b: 'Hạt tinh bột hút nước rồi nở đến lúc vỡ hẳn thành tế bào, amylose thoát ra ngoài và làm cả nồi sánh đều. Đun tiếp thì chuỗi amylose bị cắt ngắn, độ sánh sụp xuống và nước tách khỏi hạt. Đúng cái ngưỡng ấy, cấu trúc chuyển từ "sánh" sang "vữa" — cùng một cơ chế với việc khuấy espresso quá tay.',
    len: 'dài',
  },
  {
    d: '2026.02.11',
    k: 'video',
    t: 'Một ngày không lời — 47 giây',
    b: 'Quay lại toàn bộ lịch trình sáng bằng một cú máy tĩnh đặt trên bàn: cân, nước, phin, sổ. Không tiếng, không nhạc. Xem lại thấy rõ ba khoảng chết mình không nhớ là mình có.',
    len: 'media',
  },
  {
    d: '2026.02.09',
    k: 'liên ngành',
    t: 'Từ tứ niệm xứ tới việc nếm',
    mediaHint: 'ảnh — bàn cupping, thìa và bát nếm',
    b: 'Việc quan sát cảm thọ mà không dán nhãn ngay hoá ra là kỹ thuật cupping: ghi nhận vị trước, gọi tên sau. Khi gọi tên quá sớm, mọi thứ đến sau đều bị bẻ cong để khớp với cái tên đã gọi.',
    len: 'vừa',
  },
  {
    d: '2026.02.06',
    k: 'quan sát',
    t: 'Nước cứng và lớp crema',
    mediaHint: 'ảnh — cận cảnh lớp crema trên tách',
    b: 'Cùng máy, cùng hạt, đổi từ nước RO sang nước khoáng nhẹ: crema dày hơn thấy rõ. Ion canxi và magie tham gia chiết, nhiều quá thì đắng, ít quá thì loãng và chua.',
    len: 'ngắn',
  },
  {
    d: '2026.02.02',
    k: 'cảm nhận',
    t: 'Học chậm không phải là học kém',
    mediaHint: 'ảnh — sổ tay đang viết dở, chữ tay',
    b: 'Ba tuần chỉ để phân biệt được hai loại chua. Nếu tính theo số bài đọc thì đây là ba tuần lãng phí; tính theo cái còn lại trong lưỡi thì không.',
    len: 'ngắn',
  },
  {
    d: '2026.01.28',
    k: 'liên ngành',
    t: 'Nấu ăn dạy gì cho việc rang',
    mediaHint: 'ảnh — chảo/máy rang, hạt đang đảo',
    b: 'Cả hai đều là bài toán truyền nhiệt: bề mặt chín trước lõi, và mọi tranh cãi về "nhiệt cao hay thấp" thực chất là tranh cãi về khoảng chênh giữa hai chỗ đó.',
    len: 'vừa',
  },
  {
    d: '2026.01.24',
    k: 'video',
    portrait: true,
    t: 'Đổ nước vòng tròn — 20 giây',
    b: 'Ba kiểu rót cạnh nhau, cùng một góc máy. Không giải thích gì thêm.',
    len: 'media',
  },
  {
    d: '2026.01.19',
    k: 'quan sát',
    t: 'Bọt trên mặt nồi luộc',
    mediaHint: 'ảnh — mặt nước sôi, bọt nổi',
    b: 'Bọt protein nổi lên rồi tự vỡ khi nhiệt vượt ngưỡng ổn định của màng. Cùng nguyên lý với việc crema tan nhanh trên tách nóng quá.',
    len: 'ngắn',
  },
]

export const noteKinds: NoteKind[] = ['quan sát', 'video', 'cảm nhận', 'liên ngành']

/** One ink per kind — the only place colour is allowed to carry meaning here. */
export const noteColor: Record<NoteKind, string> = {
  'quan sát': '#B65A3C',
  video: '#172124',
  'cảm nhận': '#285E5B',
  'liên ngành': '#163F42',
}

/** The wash that reveals behind a hovered title, and backs a media tile. */
export const noteBlock: Record<NoteKind, string> = {
  'quan sát': '#E9B79C',
  video: '#8CBAB4',
  'cảm nhận': '#AFC8BC',
  'liên ngành': '#9DBBD4',
}

export type Placement = { col: string; mt: string; ar: string; mw: string }

/**
 * Twelve-column placements, cycled down the filtered list. Each note takes a
 * different span, drop and image ratio, so nothing lines up into rows.
 */
export const notePlacement: Placement[] = [
  { col: 'span 5', mt: '0px', ar: '4/3', mw: '78%' },
  { col: 'span 4', mt: '104px', ar: '5/4', mw: '86%' },
  { col: 'span 4', mt: '18px', ar: '4/3', mw: '92%' },
  { col: 'span 5', mt: '132px', ar: '3/2', mw: '72%' },
  { col: 'span 5', mt: '34px', ar: '5/4', mw: '80%' },
  { col: 'span 4', mt: '150px', ar: '4/3', mw: '88%' },
  { col: 'span 4', mt: '26px', ar: '5/4', mw: '94%' },
  { col: 'span 4', mt: '116px', ar: '4/3', mw: '84%' },
]

export type Filler = {
  /** insert right after this index in the (filtered) note stream */
  after: number
  col: string
  mt: string
  kind: 'slot' | 'quote' | 'count'
  bg: string
  h: string
  t: string
  ml: string
  pl: string
}

/** Non-note grid cells woven between the cards — colour slots, a quote, a tally. */
export const fillers: Filler[] = [
  { after: 1, col: 'span 3', mt: '250px', kind: 'slot', bg: '#9DBBD4', h: '330px', t: 'ảnh dọc — bàn làm việc, dụng cụ bày ra', ml: '-52px', pl: '80px' },
  { after: 2, col: 'span 3', mt: '54px', kind: 'quote', bg: '', h: '', t: 'Ghi lại thì mới thấy mình đã nghĩ gì.', ml: '0px', pl: '14px' },
  { after: 4, col: 'span 3', mt: '86px', kind: 'slot', bg: '#E9B79C', h: '210px', t: 'ảnh vụn — mảnh cắt nhỏ, chèn đè lên bài bên cạnh', ml: '-64px', pl: '92px' },
  { after: 5, col: 'span 3', mt: '190px', kind: 'count', bg: '', h: '', t: '', ml: '0px', pl: '14px' },
  { after: 6, col: 'span 4', mt: '68px', kind: 'slot', bg: '#AFC8BC', h: '268px', t: 'ảnh cận cảnh — kết cấu, bề mặt, chất liệu', ml: '0px', pl: '14px' },
  { after: 5, col: 'span 3', mt: '46px', kind: 'slot', bg: '#9DBBD4', h: '242px', t: 'ảnh dọc hẹp — một vật thể đơn lẻ', ml: '0px', pl: '14px' },
  { after: 7, col: 'span 3', mt: '200px', kind: 'slot', bg: '#E9B79C', h: '176px', t: 'ảnh vụn — chi tiết nhỏ lặp lại', ml: '0px', pl: '14px' },
]

export const noteTitleSize = (len: NoteLength) =>
  len === 'dài' ? '62px' : len === 'vừa' ? '46px' : len === 'media' ? '40px' : '36px'

/** Split the body into reading paragraphs — two sentences apiece. */
export function paragraphs(body: string): string[] {
  return body.split('. ').reduce<string[]>((acc, sentence, i, arr) => {
    const t = sentence + (i < arr.length - 1 ? '.' : '')
    if (i % 2 === 0) acc.push(t)
    else acc[acc.length - 1] += ' ' + t
    return acc
  }, [])
}
