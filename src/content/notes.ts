export type NoteKind = 'quan sát' | 'video' | 'cảm nhận' | 'liên ngành'

/** Content length drives the title size — a long note gets a bigger headline. */
export type NoteLength = 'dài' | 'vừa' | 'ngắn' | 'media'

export type Note = {
  d: string
  k: NoteKind
  t: string
  b: string
  len: NoteLength
}

export const notes: Note[] = [
  {
    d: '2026.02.14',
    k: 'quan sát',
    t: 'Vì sao cháo đun quá lâu thì vữa',
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
    b: 'Việc quan sát cảm thọ mà không dán nhãn ngay hoá ra là kỹ thuật cupping: ghi nhận vị trước, gọi tên sau. Khi gọi tên quá sớm, mọi thứ đến sau đều bị bẻ cong để khớp với cái tên đã gọi.',
    len: 'vừa',
  },
  {
    d: '2026.02.06',
    k: 'quan sát',
    t: 'Nước cứng và lớp crema',
    b: 'Cùng máy, cùng hạt, đổi từ nước RO sang nước khoáng nhẹ: crema dày hơn thấy rõ. Ion canxi và magie tham gia chiết, nhiều quá thì đắng, ít quá thì loãng và chua.',
    len: 'ngắn',
  },
  {
    d: '2026.02.02',
    k: 'cảm nhận',
    t: 'Học chậm không phải là học kém',
    b: 'Ba tuần chỉ để phân biệt được hai loại chua. Nếu tính theo số bài đọc thì đây là ba tuần lãng phí; tính theo cái còn lại trong lưỡi thì không.',
    len: 'ngắn',
  },
  {
    d: '2026.01.28',
    k: 'liên ngành',
    t: 'Nấu ăn dạy gì cho việc rang',
    b: 'Cả hai đều là bài toán truyền nhiệt: bề mặt chín trước lõi, và mọi tranh cãi về "nhiệt cao hay thấp" thực chất là tranh cãi về khoảng chênh giữa hai chỗ đó.',
    len: 'vừa',
  },
  {
    d: '2026.01.24',
    k: 'video',
    t: 'Đổ nước vòng tròn — 20 giây',
    b: 'Ba kiểu rót cạnh nhau, cùng một góc máy. Không giải thích gì thêm.',
    len: 'media',
  },
  {
    d: '2026.01.19',
    k: 'quan sát',
    t: 'Bọt trên mặt nồi luộc',
    b: 'Bọt protein nổi lên rồi tự vỡ khi nhiệt vượt ngưỡng ổn định của màng. Cùng nguyên lý với việc crema tan nhanh trên tách nóng quá.',
    len: 'ngắn',
  },
]

export const noteKinds: NoteKind[] = ['quan sát', 'video', 'cảm nhận', 'liên ngành']

/** One ink per kind — the only place colour is allowed to carry meaning here. */
export const noteColor: Record<NoteKind, string> = {
  'quan sát': '#C0143C',
  video: '#12120F',
  'cảm nhận': '#8E2A66',
  'liên ngành': '#6B7A11',
}

/** The block that wipes in behind a hovered title, and backs a media tile. */
export const noteBlock: Record<NoteKind, string> = {
  'quan sát': '#F3D9DE',
  video: '#D9E27A',
  'cảm nhận': '#EDD4E2',
  'liên ngành': '#CFE04A',
}

/**
 * Twelve-column placements, cycled down the list. Each note takes a different
 * span and drops by a different amount, so nothing lines up into rows.
 */
export const notePlacement: { col: string; mt: string }[] = [
  { col: '1 / span 7', mt: '0px' },
  { col: '9 / span 4', mt: '116px' },
  { col: '2 / span 5', mt: '72px' },
  { col: '8 / span 5', mt: '10px' },
  { col: '1 / span 4', mt: '54px' },
  { col: '6 / span 6', mt: '96px' },
  { col: '2 / span 4', mt: '40px' },
  { col: '7 / span 5', mt: '0px' },
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
