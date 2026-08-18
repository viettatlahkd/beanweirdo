/**
 * System conventions — the rules the site is built to, as the design tool
 * exports them (`design/prototype/Coffee Study Blog v4.dc.html`, `LOGIC`).
 *
 * Three parts: visual rules, interaction rules, and per-template rules. Each
 * item carries a scope (`s`) saying how far it reaches, and copy may reference
 * a page by `[[key]]` so renaming a page rewrites every rule that mentions it
 * (see `interpolateNav`).
 */

/** How far a rule reaches. */
export type Scope = 'Toàn hệ thống' | 'Module' | 'Template'

export type LogicItem = {
  /** scope */
  s: Scope
  /** the rule */
  r: string
  /** worked example, or '' when the rule speaks for itself */
  e: string
}

export type LogicGroup = {
  /** two-digit rule number */
  n: string
  /** group heading */
  g: string
  items: LogicItem[]
}

export type LogicPart = {
  /** A / B / C */
  p: string
  part: string
  note: string
  groups: LogicGroup[]
}

export const SCOPE_COLOR: Record<Scope, string> = {
  'Toàn hệ thống': '#102F35',
  Module: '#3E7A4E',
  Template: '#2E6B7A',
}

export const SCOPE_KEY: { s: Scope; c: string; d: string }[] = [
  { s: 'Toàn hệ thống', c: SCOPE_COLOR['Toàn hệ thống'], d: 'mọi trang' },
  { s: 'Module', c: SCOPE_COLOR.Module, d: 'trang module' },
  { s: 'Template', c: SCOPE_COLOR.Template, d: 'chỉ template đó' },
]

export const LOGIC: LogicPart[] = [
  { p: 'A', part: 'Design system', note: 'Quy tắc về thị giác — màu, chữ, khoảng cách. Áp cho mọi trang.', groups: [
    { n: '01', g: 'Màu', items: [
      { s: 'Toàn hệ thống', r: 'Trên mọi trang: nền mặc định là kem, mực chính là than.', e: '#FDFBF2 · #23211A' },
      { s: 'Toàn hệ thống', r: 'Trên mọi nền màu: nền vừa-đậm thì chữ sáng, nền nhạt thì chữ mực đậm.', e: '' },
      { s: 'Module', r: 'Với ba module: hồng cho sensory, xanh lá cho biochemistry 101, vàng đất cho roasting — không dùng lẫn sang module khác.', e: '#F2A0A5 · #7FB87E · #F0B45C' },
      { s: 'Module', r: 'Với mỗi trang module: chỉ một khối màu lớn ở đầu trang, không lặp giữa các bài.', e: '' },
      { s: 'Template', r: 'Riêng [[cards]]: mỗi nhóm hương có hai màu — màu tươi cho chấm và vạch, màu mực đậm cho chữ.', e: '' },
      { s: 'Template', r: 'Riêng nhóm Practice: dùng xanh than với hồng mận, tách hẳn khỏi hệ màu module.', e: '#102F35 · #C25C7C' }
    ] },
    { n: '02', g: 'Chữ', items: [
      { s: 'Toàn hệ thống', r: 'Trên mọi trang: đúng hai họ chữ — serif cho tiêu đề, sans cho mọi thứ còn lại.', e: 'Playfair Display · Be Vietnam Pro' },
      { s: 'Toàn hệ thống', r: 'Trong thân bài: nét mảnh 300; nhãn in hoa dùng nét 500.', e: '' },
      { s: 'Toàn hệ thống', r: 'Với font thân bài: phải có đủ dấu tiếng Việt.', e: '' },
      { s: 'Toàn hệ thống', r: 'Với tên beӕn weirdo khi đặt bằng serif ở vị trí tên hoặc tiêu đề: chữ ӕ luôn phóng to hơn phần còn lại và tô màu hồng cánh hoa; các vị trí đặt bằng sans in hoa giữ nguyên một màu.', e: 'ӕ · scale 1.2–1.3 · #F2A0A5' },
      { s: 'Toàn hệ thống', r: 'Với mọi số liệu: dùng chữ số cùng bề rộng.', e: 'tabular-nums' }
    ] },
    { n: '03', g: 'Khoảng cách & lưới', items: [
      { s: 'Toàn hệ thống', r: 'Trên mọi trang: nhịp khoảng cách 8 / 20 / 40 / 64 / 96px.', e: '' },
      { s: 'Toàn hệ thống', r: 'Trên mọi trang: đệm 56px hai bên, căn lề trên xuống chứ không từ dưới lên.', e: '' },
      { s: 'Toàn hệ thống', r: 'Với thân bài: rộng tối đa 1140px, cột chữ khoảng 600px.', e: '' }
    ] }
  ] },

  { p: 'B', part: 'UX/UI Logic', note: 'Quy tắc về cách đặt tên, điều hướng và thao tác. Áp cho mọi trang.', groups: [
    { n: '04', g: 'Đặt tên trang', items: [
      { s: 'Toàn hệ thống', r: 'Với nhãn trang: gồm hai phần, ngăn bằng gạch ngang dài.', e: 'Sensory — Notes' },
      { s: 'Toàn hệ thống', r: 'Trong nhãn trang: phần trước gạch là module, phần sau gạch là dạng bài.', e: 'sensory · Notes' },
      { s: 'Toàn hệ thống', r: 'Trong nhãn trang: ngày tháng nếu có thì đứng sau cùng, ngăn bằng dấu chấm giữa.', e: 'Article · 2026.02' }
    ] },
    { n: '05', g: 'Điều hướng', items: [
      { s: 'Toàn hệ thống', r: 'Với mọi trang con: có dải đường dẫn phản ánh đúng hành trình người dùng.', e: '[[landing]] › [[home]] › sensory › Notes' },
      { s: 'Toàn hệ thống', r: 'Trên dải đường dẫn: mũi tên ← quay về trang liền trước, bấm từng chặng thì tới đúng trang đó.', e: '' },
      { s: 'Toàn hệ thống', r: 'Với sidebar: chia ba nhóm, mỗi nhóm có nhãn và đường kẻ ngăn.', e: '[[secPublic]] · [[secPractice]] · [[secAdmin]]' },
      { s: 'Toàn hệ thống', r: 'Với sidebar: chìm ở 64px, chỉ mở rộng khi rê chuột.', e: '268px khi mở' },
      { s: 'Module', r: 'Với sidebar: mỗi module một chấm tròn màu riêng; riêng [[notes]] dùng hình vuông để tách khỏi module.', e: '' }
    ] },
    { n: '06', g: 'Câu trích đầu trang Ghi', items: [
      { s: 'Template', r: 'Ở đầu trang Ghi: một câu trích thật về hiệu suất, thói quen hoặc thời gian, kèm tên tác giả — không tự nghĩ câu.', e: 'nguồn có thật, ghi đúng tên' },
      { s: 'Template', r: 'Với câu trích: đổi mỗi ngày một câu, chọn theo số ngày nên cùng một ngày luôn ra cùng một câu.', e: 'index = ngày % số câu' },
      { s: 'Template', r: 'Với danh sách câu trích: giữ trong một mảng cố định, thêm câu mới vào cuối; hết mảng thì quay lại câu đầu.', e: '' },
      { s: 'Template', r: 'Với cách trình bày: câu trích Playfair nghiêng 24px màu xanh lá, tên tác giả 12px xám kèm gạch ngắn phía trước.', e: '' }
    ] },
    { n: '07', g: 'Đọc — mở nội dung', items: [
      { s: 'Toàn hệ thống', r: 'Ở mọi danh sách bài ([[notes]], [[cards]], [[archive]]): bấm một mục thì nội dung xổ ra tại chỗ trong danh sách, không mở trang mới.', e: 'GET danh sách trả đủ nội dung' },
      { s: 'Toàn hệ thống', r: 'Ở mọi mục xổ ra: mục đang mở tự cuộn vào giữa khung nhìn.', e: '' },
      { s: 'Toàn hệ thống', r: 'Ở [[notes]] và [[archive]]: mỗi lần chỉ một mục mở, bấm lại để thu.', e: '' }
    ] },
    { n: '08', g: 'Ghi — sửa và lưu', items: [
      { s: 'Toàn hệ thống', r: 'Ở mọi dòng dữ liệu sửa được ([[hours]], bảng [[report]]): bấm thẳng vào giá trị cần sửa, không mở hộp thoại riêng.', e: 'PATCH từng field' },
      { s: 'Toàn hệ thống', r: 'Ở mọi ô đang sửa: Enter để lưu, Esc để bỏ, rời con trỏ cũng lưu.', e: '' },
      { s: 'Toàn hệ thống', r: 'Ở mọi thao tác sửa: lưu ngay từng thay đổi, không có nút lưu toàn trang.', e: 'không dùng PUT cả trang' },
      { s: 'Toàn hệ thống', r: 'Ở mọi mục tạo mới: tạo dòng trống trước rồi con trỏ nhảy vào; để trống mà rời đi thì dòng tự mất.', e: 'POST rồi PATCH, hoặc DELETE nếu rỗng' },
      { s: 'Toàn hệ thống', r: 'Ở mọi thao tác xoá: xoá thẳng, không hỏi lại — hoàn tác thay cho hộp xác nhận.', e: 'DELETE' },
      { s: 'Toàn hệ thống', r: 'Ở mọi thao tác ghi (sửa, tạo, xoá, kéo thả): Ctrl + Z hoàn tác thao tác gần nhất, Ctrl + Shift + Z làm lại.', e: 'undo / redo' },
      { s: 'Toàn hệ thống', r: 'Với bộ nhớ đệm hoàn tác: giữ tối đa 5 thao tác gần nhất, thao tác thứ 6 đẩy thao tác cũ nhất ra; rời trang là xoá sạch.', e: 'stack 5, không lưu server' }
    ] }
  ] },

  { p: 'C', part: 'Riêng theo template', note: 'Mỗi template có logic riêng, không áp dàn trải sang template khác.', groups: [
    { n: '09', g: 'Bài mẫu → bài chính thức', items: [
      { s: 'Toàn hệ thống', r: 'Với bài mẫu trong [[secAdmin]]: được tự do chọn màu, vì nó chỉ là khung để dựng.', e: 'Templates giữ màu riêng' },
      { s: 'Module', r: 'Khi clone bài mẫu sang module chính thức: bắt buộc đổi toàn bộ màu sang theme của module đó, không giữ màu của bản mẫu.', e: 'accent · tint · tint2 của module' },
      { s: 'Module', r: 'Khi một bài mẫu được nhân bản thành bài chính thức dưới module: khối màu đầu trang phải lấy đúng accent của module đó.', e: 'sensory → #F2A0A5' },
      { s: 'Toàn hệ thống', r: 'Với mỗi bài dùng chung template: chỉ đổi màu, nhãn, tiêu đề và đoạn dẫn theo lối vào — nội dung và thao tác giữ nguyên.', e: 'một template, hai vai' },
      { s: 'Toàn hệ thống', r: 'Với đường dẫn: bài chính thức đi từ [[landing]] › [[home]] › module, bài mẫu đi từ [[secAdmin]] › Notes › Templates.', e: '' }
    ] },
    { n: '10', g: '[[article]]', items: [
      { s: 'Template', r: 'Với [[article]]: hai cột — cột lớn thân bài, cột nhỏ mục lục hoặc ghi chú bên lề.', e: '' },
      { s: 'Template', r: 'Với [[article]]: ảnh phụ thả trôi trong thân bài, không dồn xuống chân bài.', e: '' },
      { s: 'Template', r: 'Với [[article]]: ảnh chính ít nhất 1.7 lần ảnh phụ, tối đa 3–4 ảnh mỗi cụm.', e: '' }
    ] },
    { n: '11', g: '[[report]]', items: [
      { s: 'Template', r: 'Với [[report]]: cột chính là số liệu và bảng, cột phụ chỉ chứa ghi chú.', e: '' },
      { s: 'Template', r: 'Với [[report]]: kéo được vạch giữa hai cột để đổi tỉ lệ.', e: '' },
      { s: 'Template', r: 'Riêng [[report]]: ghi chú có hai chế độ — Explorations xếp trên xuống, Memo notes rải theo vị trí trong bài.', e: '' },
      { s: 'Template', r: 'Với [[report]]: bảng thêm được cột và dòng, kéo được bề rộng cột.', e: '' }
    ] },
    { n: '12', g: '[[cards]]', items: [
      { s: 'Template', r: 'Riêng [[cards]]: mở được nhiều thẻ cùng lúc để đối chiếu — ngoại lệ của quy tắc 06.', e: 'có mở hết / gập hết' },
      { s: 'Template', r: 'Với [[cards]]: các thẻ cùng một cấp, gập mở độc lập, đổi được thứ tự.', e: '' },
      { s: 'Template', r: 'Riêng [[cards]]: bộ tag nhóm hương đặt cố định ở đầu trang, không rải theo từng thẻ.', e: '' },
      { s: 'Template', r: 'Với [[cards]]: màu thẻ lấy theo nhóm hương đầu tiên của thẻ đó.', e: '' }
    ] },
    { n: '13', g: '[[notes]]', items: [
      { s: 'Template', r: 'Với [[notes]]: lưới 12 cột lệch tầng, mỗi note một bề rộng và độ tụt khác nhau.', e: '' },
      { s: 'Template', r: 'Với [[notes]]: rê chuột thì các note khác mờ đi, bấm thì note đó giãn hết bề ngang.', e: '' },
      { s: 'Template', r: 'Với [[notes]]: khối màu đặc và câu trích chèn vào chỗ trống của lưới.', e: '' }
    ] },
    { n: '14', g: '[[hours]]', items: [
      { s: 'Template', r: 'Với [[hours]]: chuỗi ngày là phần chính, ô bấm giờ lệch sang phải.', e: '' },
      { s: 'Template', r: 'Riêng [[hours]]: sửa hoạt động chỉ hai nhánh — đổi thời gian, hoặc xoá. Sửa tên là thao tác phụ.', e: '' },
      { s: 'Template', r: 'Với [[hours]]: ngày trong 7 ngày gần nhất cho sửa, xoá, kéo thả; ngày cũ hơn chỉ hiện việc đã xong.', e: '' },
      { s: 'Template', r: 'Với [[hours]]: tháng cũ tự thu gọn, không tách khỏi danh mục.', e: '' }
    ] }
  ] }
]
