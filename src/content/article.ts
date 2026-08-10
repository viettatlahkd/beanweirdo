import { garden } from '../design/tokens'

/**
 * A figure dropped into the body copy. The two that exist sit at deliberately
 * different widths and offsets so the column doesn't read as a single stack —
 * and each carries a marginal note in the space left over.
 */
export type Figure = {
  /** height of the tint block */
  h: string
  /** width of the tint block — px or % of the body column */
  w: string
  margin: string
  tint: string
  caption: string
  label: string
  note: string
}

export type Section = {
  h: string
  p: string
  fig?: Figure
}

export const articleMeta = {
  moduleId: 'biochem',
  moduleTitle: 'biochemistry 101',
  eyebrow: '03 — essay — 2026.02',
  title: 'Chlorogenic Acids ',
  titleItalic: '(CGA)',
  lead: 'Nguồn gốc của vị chát và phần lớn vị chua trong tách cà phê.',
  heroCaption: 'quả chín, chụp thẳng',
  pull: 'Rang càng sâu, CGA càng ít — nhưng vị đắng lại càng nhiều. Cái đắng đó đến từ sản phẩm phân huỷ của chính nó.',
  furtherReading: ['Farah & Donangelo 2006', 'Illy & Viani, Espresso Coffee'],
} as const

export const article: Section[] = [
  {
    h: 'Nó là gì',
    p: 'Chlorogenic acid không phải một chất, mà là một họ khoảng hơn hai mươi hợp chất phenolic. Trong hạt arabica nhân xanh, chúng chiếm khoảng 6–8% khối lượng khô; ở robusta con số này cao hơn, thường 8–11%. Đây là nhóm hợp chất phong phú thứ hai trong hạt, chỉ sau carbohydrate.',
  },
  {
    h: 'Vì sao ta quan tâm',
    p: 'CGA là lý do một tách cà phê có vị chát ở cuối lưỡi và cảm giác khô nhẹ ở vòm miệng. Chúng cũng là tiền chất của nhiều hợp chất đắng sinh ra trong lúc rang, nên phần lớn những gì ta gọi là “vị đắng cà phê” thực ra bắt đầu từ đây chứ không phải từ caffeine.',
    fig: {
      h: '190px',
      w: '300px',
      margin: '26px 0 36px',
      tint: garden.petalTint,
      caption: 'chi tiết — bề mặt nhân xanh',
      label: 'ghi chú bên lề',
      note: 'Vị chát của CGA không nằm ở lưỡi mà ở cảm giác se của niêm mạc — cùng cơ chế với tannin trong trà hay vang đỏ. Vì vậy nó không tăng giảm theo nồng độ pha như vị chua.',
    },
  },
  {
    h: 'Chuyện gì xảy ra khi rang',
    p: 'Nhiệt phá vỡ CGA khá nhanh. Từ nhân xanh đến mức rang vừa, khoảng một nửa lượng CGA biến mất; đến rang đậm có thể mất tới 90%. Nhưng chúng không biến đi đâu cả — chúng tách thành acid quinic và acid caffeic, rồi tiếp tục chuyển thành các lactone và phenylindane. Nhóm đầu cho vị đắng dịu, dễ chịu; nhóm sau cho vị đắng dai và khô, thứ vị đặc trưng của rang đậm.',
  },
  {
    h: 'Đọc điều này trong ly',
    p: 'Một mẻ rang nhạt giữ nhiều CGA hơn, nên chua và chát rõ hơn, nhưng cũng dễ bị coi là “xanh” nếu giai đoạn phát triển quá ngắn. Kéo dài thời gian sau first crack thêm ba mươi giây thường đủ để chuyển vị chát ấy thành vị ngọt hậu, mà chưa kịp sinh phenylindane.',
    fig: {
      h: '230px',
      w: '50%',
      margin: '30px 0 38px 0',
      tint: garden.honeyTint,
      caption: 'biểu đồ — CGA giảm dần theo mức rang',
      label: 'số liệu',
      note: 'Trục ngang là thời gian rang, trục dọc là phần trăm CGA còn lại. Điểm gãy nằm quanh first crack — sau mốc đó tốc độ phân huỷ tăng gần gấp đôi.',
    },
  },
  {
    h: 'Robusta và arabica',
    p: 'Robusta chứa nhiều CGA hơn arabica ở mọi mức rang, và đó là một phần lý do vì sao robusta bị cho là thô. Nhưng cùng lượng CGA ấy cũng cho robusta lớp bọt dày hơn khi pha espresso, vì các hợp chất phenolic góp phần giữ ổn định bề mặt bọt. Cái bị coi là khuyết ở tách filter lại thành ưu ở tách espresso.',
  },
  {
    h: 'Ảnh hưởng tới cách pha',
    p: 'CGA tan tương đối nhanh, nên chúng ra sớm trong quá trình chiết. Một mẻ pour over rút quá nhanh sẽ giữ tỉ lệ CGA cao so với đường và các chất tạo ngọt ra muộn hơn, và tách nước nghiêng về chua chát. Kéo dài thời gian tiếp xúc hoặc xay mịn hơn một bậc thường xử lý được, mà không cần đổi mức rang.',
  },
  {
    h: 'Ghi chú thí nghiệm',
    p: 'Rang cùng một lô Sơn La ở ba mức phát triển 15%, 20% và 25%, cupping mù ba mẫu. Mẫu 15% chua sắc và khô ở hậu vị; mẫu 20% cân bằng nhất; mẫu 25% ngọt hơn nhưng mất hết nét trái cây. Ranh giới hẹp hơn tôi tưởng — chỉ ba mươi giây phát triển đã đổi hẳn kết luận.',
  },
  {
    h: 'Còn chưa rõ',
    p: 'Con số 6–8% là tổng lượng CGA, nhưng tỉ lệ giữa các đồng phân trong đó thay đổi theo giống, độ cao và cách sơ chế — và chính tỉ lệ ấy mới quyết định vị chát nặng hay nhẹ. Chưa có cách nào đo được ở quy mô quán. Ghi lại đây để lần sau đọc tiếp.',
  },
]
