/**
 * System conventions — the rules the site is built to, as the design tool
 * exports them (`design/prototype/Coffee Study Blog v4.dc.html`, `LOGIC`).
 *
 * Three parts: visual rules, interaction rules, and per-template rules. Each
 * item carries a scope (`s`) saying how far it reaches, and copy may reference
 * a page by `[[key]]` so renaming a page rewrites every rule that mentions it
 * (see `interpolateNav`).
 */

/** How far a rule reaches.  *
 * Số nhóm là mã định danh, không phải thứ tự đọc.
 */
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
      { s: 'Toàn hệ thống', r: 'Trong nhãn trang: ngày tháng nếu có thì đứng sau cùng, ngăn bằng dấu chấm giữa.', e: 'Article · 2026.02' },
      { s: 'Toàn hệ thống', r: 'Với tiêu đề bài: khai báo đúng một chỗ. Tên hiện trong danh mục module và tên trên trang bài luôn là cùng một trường — không chép thành hai bản.', e: 'một tên, mọi nơi' },
      { s: 'Toàn hệ thống', r: 'Với phần mô tả bài trong danh mục: nếu bài có sapo thì lấy thẳng sapo ra; nếu không có thì tóm nội dung bài thành một cụm từ khoá ngắn.', e: 'sapo → mô tả, hoặc key phrase' },
      { s: 'Toàn hệ thống', r: 'Với mô tả rút từ sapo: sửa sapo thì mọi danh mục tự đổi theo, không phải sửa lại từng chỗ; cụm từ khoá viết tay chỉ dùng khi bài chưa có sapo.', e: 'sapo tự động ← → sửa tay' }
    ] },
    { n: '05', g: 'Điều hướng', items: [
      { s: 'Toàn hệ thống', r: 'Với mọi trang con: có dải đường dẫn phản ánh đúng hành trình người dùng.', e: '[[landing]] › [[home]] › sensory › Notes' },
      { s: 'Toàn hệ thống', r: 'Trên dải đường dẫn: mũi tên ← quay về trang liền trước, bấm từng chặng thì tới đúng trang đó.', e: '' },
      { s: 'Toàn hệ thống', r: 'Với sidebar: chia ba nhóm, mỗi nhóm có nhãn và đường kẻ ngăn.', e: '[[secPublic]] · [[secPractice]] · [[secAdmin]]' },
      { s: 'Toàn hệ thống', r: 'Với sidebar: chìm ở 64px, chỉ mở rộng khi rê chuột.', e: '268px khi mở' },
      { s: 'Module', r: 'Với sidebar: module thường một chấm tròn màu riêng; module đặc biệt dùng hình vuông — khác hình để nhận ra ngay đây là loại module khác, trước cả khi đọc tên.', e: '' },
        { s: 'Module', r: 'Với mọi module đã tạo và công khai: luôn hiện, kể cả khi chưa có bài nào — số bài hiển thị 0, không tự ẩn đi.', e: 'chưa có bài ≠ chưa tồn tại' },
        { s: 'Module', r: 'Module phân loại theo hai trục độc lập: kind nói nó là gì (thường hay đặc biệt), visibility nói nó có được liệt kê không. Không bao giờ lọc một bề mặt chỉ bằng kind.', e: 'Ghi 01 là module đặc biệt nhưng công khai, nên vẫn có mặt ở [[home]] và sidebar.' },
        { s: 'Module', r: 'Trang chủ chỉ trưng module thường — vì nó là phòng trưng bày module đọc, không phải vì module đặc biệt bị ẩn. [[home]] và sidebar liệt kê mọi module công khai.', e: '' },
        { s: 'Module', r: 'Sidebar xếp module thường trước, module đặc biệt sau; trong mỗi nhóm theo thứ tự đặt ở Content management.', e: 'Đánh số lại một module thường không đẩy nó xuống dưới nhật ký được.' },
        { s: 'Toàn hệ thống', r: 'Số hiện cạnh một bài là vị trí của nó trong danh sách người đọc đang nhìn, đếm từ 01. Không bao giờ in thẳng thứ tự lúc soạn bài.', e: 'Bài duy nhất còn đăng của một module hiện 01, dù lúc soạn nó là bài thứ năm.' },
        { s: 'Toàn hệ thống', r: 'Khi chưa biết bài nằm ở đâu trong danh sách thì bỏ số đi, đừng đoán.', e: '' }
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
    { n: '15', g: 'Ảnh và ô màu', items: [
      { s: 'Toàn hệ thống', r: 'Ô ảnh không có ảnh thì là hộp màu, không tính là ảnh. Dàn trang giữ nguyên hình, ô chỉ đổi giữa ảnh và màu.', e: '' },
      { s: 'Toàn hệ thống', r: 'Chú thích ảnh không bắt buộc. Chú thích rỗng thì không chiếm chỗ và không vẽ nền.', e: '' },
      { s: 'Toàn hệ thống', r: 'Ảnh tải lên luôn phủ kín ô và cắt phần thừa, không bao giờ kéo méo. Mặc định căn giữa; người dùng có thể co kéo đặt lại điểm neo.', e: '' },
      { s: 'Toàn hệ thống', r: 'Tải ảnh lên xong thì mở ngay màn đặt ảnh vào khung, với khung đúng hình dạng ô trên trang công khai.', e: '' },
      { s: 'Module', r: 'Module thường có tối đa 3 ảnh — bản design chỉ vẽ 3 ô. Muốn hơn phải vẽ kiểu dàn trang mới.', e: '' },
      { s: 'Module', r: 'Ô sửa nội dung của một module chỉ hiện những ô mà chính module đó dùng đến, không vẽ chung một form cho mọi module.', e: '' },
      { s: 'Toàn hệ thống', r: 'Khung xem trước phải vẽ bằng đúng thành phần dàn trang của trang công khai, không vẽ lại — ô ảnh co giãn theo bề rộng nên không có tỉ lệ cố định.', e: '' }
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
      { s: 'Toàn hệ thống', r: 'Với từ "template": là nội dung được lưu lại để dùng lại, không phải khung rỗng. Một mẫu thường được dựng từ một bài thật, nên nó có sẵn nội dung. Tạo bài từ mẫu là sao chép nội dung đó sang một bài mới, đặt dưới một module.', e: 'template = mẫu' },
      { s: 'Toàn hệ thống', r: 'Với bài mẫu trong [[secAdmin]]: được tự do chọn màu, vì nó chỉ là khung để dựng.', e: 'Templates giữ màu riêng' },
      { s: 'Module', r: 'Khi clone bài mẫu sang module chính thức: bắt buộc đổi toàn bộ màu sang theme của module đó, không giữ màu của bản mẫu.', e: 'accent · tint · tint2 của module' },
      { s: 'Module', r: 'Khi một bài mẫu được nhân bản thành bài chính thức dưới module: khối màu đầu trang phải lấy đúng accent của module đó.', e: 'sensory → #F2A0A5' },
      { s: 'Toàn hệ thống', r: 'Bài tạo từ mẫu sở hữu nội dung của nó kể từ lúc tạo: sửa bài không đụng đến mẫu, sửa mẫu không với tới bài đã tạo. Một mẫu được clone nhiều lần thành nhiều bài khác nhau — khác tiêu đề, và khác cả nội dung.', e: 'một template, hai vai' },
      { s: 'Toàn hệ thống', r: 'Với đường dẫn: bài chính thức đi từ [[landing]] › [[home]] › module, bài mẫu đi từ [[secAdmin]] › Templates.', e: '' },
      { s: 'Toàn hệ thống', r: 'Hai điều không template nào được từ chối, kể cả template viết sau này: đường dẫn quay lại ở đầu trang, và khối màu lấy từ module chứa bài. Ngoài hai điều đó, một template được trình bày khác hẳn mọi template còn lại — đó là lý do có nhiều template.', e: 'Bài dài và bài ghi chú dùng dải màu mỏng hơn bài thường, nhưng vẫn là màu của module.' },
      { s: 'Toàn hệ thống', r: 'Với đường dẫn của một bài: đoạn cuối là tên bài, không phải một chữ chung như "Bài viết".', e: 'Trang chủ › Mục lục › sensory › Sensory Lexicon' },
      { s: 'Toàn hệ thống', r: 'Hệ thống không đổi chữ hoa/thường của tiêu đề bài ở bất kỳ vị trí nào — lưu sao hiện vậy. Viết hoa hay viết thường là quyết định của người soạn bài.', e: '' },
      { s: 'Toàn hệ thống', r: 'Thêm một template mới là phải sửa đủ ba nơi: ràng buộc trong cơ sở dữ liệu, danh sách ở backend, và bộ điều phối ở frontend. Ba nơi này không nhìn thấy nhau nên có một kiểm tra tự động so chúng với nhau.', e: 'Đã từng lệch: cơ sở dữ liệu nhận longform và memo, backend thì không, nên tạo hai loại đó qua trang quản trị trả về lỗi 400.' }
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
      { s: 'Template', r: 'Riêng [[cards]]: mở được nhiều thẻ cùng lúc để đối chiếu — ngoại lệ của nhóm 07 luật 3.', e: 'có mở hết / gập hết' },
      { s: 'Template', r: 'Với [[cards]]: các thẻ cùng một cấp, gập mở độc lập, đổi được thứ tự.', e: '' },
      { s: 'Template', r: 'Riêng [[cards]]: bộ tag nhóm hương đặt cố định ở đầu trang, không rải theo từng thẻ.', e: '' },
      { s: 'Template', r: 'Với [[cards]]: màu thẻ lấy theo nhóm hương đầu tiên của thẻ đó.', e: '' },
        { s: 'Template', r: 'Mười bốn nhóm của bánh xe hương là từ vựng cố định, không phải dữ liệu bài. Mỗi nhóm một bộ ba màu dùng chung toàn hệ thống, để cùng một nhóm luôn hiện cùng một màu ở mọi bài.', e: 'Berry luôn đỏ, dù bài nào nhắc tới nó.' },
        { s: 'Template', r: 'Thanh lọc nhóm hương xếp theo thứ tự bánh xe, không theo thứ tự bài viết nhắc tới.', e: 'Người đọc gặp Berry trước Chemical, bất kể bài viết thế nào.' }
    ] },
    { n: '13', g: '[[notes]]', items: [
      { s: 'Template', r: 'Với [[notes]]: lưới 12 cột lệch tầng, mỗi note một bề rộng và độ tụt khác nhau.', e: '' },
      { s: 'Template', r: 'Với [[notes]]: rê chuột thì các note khác mờ đi, bấm thì note đó giãn hết bề ngang.', e: '' },
      { s: 'Template', r: 'Với [[notes]]: khối màu đặc và câu trích chèn vào chỗ trống của lưới.', e: '' }
    ] },
    { n: '14', g: '[[hours]] — ngày', items: [
      { s: 'Template', r: 'Với [[hours]]: chuỗi ngày là phần chính, ô bấm giờ lệch sang phải.', e: '' },
      { s: 'Template', r: 'Với [[hours]]: ngày trong 7 ngày gần nhất cho sửa, xoá, kéo thả; ngày cũ hơn chỉ hiện việc đã xong.', e: '' },
      { s: 'Template', r: 'Nhật ký có ngày mở sổ cố định 20/08/2026. Không màn hình nào dựng ra ngày trước đó — kể cả một hàng trống hay một ô heatmap.', e: '' },
      { s: 'Template', r: 'Ngày từ ngày mở sổ tới hôm nay mà không có hoạt động là ngày bỏ lỡ; ngày ngoài khoảng đó không thuộc về nhật ký. Hai thứ không được vẽ giống nhau.', e: '' },
      { s: 'Template', r: 'Mọi tỉ lệ "x/y ngày" lấy y là số ngày nhật ký thật sự có, không phải hằng số.', e: '' },
      { s: 'Template', r: 'Danh sách ngày đọc theo ba tầng: tháng → tuần → ngày.', e: '' },
      { s: 'Template', r: 'Tuần tính từ thứ Hai tới Chủ nhật; tuần vắt qua hai tháng được đọc tách theo từng tháng, nhãn ghi đúng khoảng ngày thuộc nhóm.', e: '' },
      { s: 'Template', r: 'Từ hai tuần trở lên trong một tháng: tuần mới nhất mở, tuần cũ gom. Một tuần thì không hiện heading tuần.', e: '' },
      { s: 'Template', r: 'Từ hai tháng trở lên: tháng hiện tại mở, tháng cũ gom.', e: '' },
      { s: 'Template', r: 'Nhóm đang gom vẫn hiện khoảng thời gian, số ngày có ghi và tổng thời lượng.', e: '' },
      { s: 'Template', r: 'Màn hình đọc "hôm nay" theo đồng hồ tại thời điểm hỏi, không phải lúc mở trang. Tab để qua đêm phải tự sang ngày mới.', e: '' }
    ] },
    { n: '16', g: '[[hours]] — một hoạt động', items: [
      { s: 'Template', r: 'Hàng mới bắt đầu tại thời điểm bấm "thêm hoạt động".', e: '' },
      { s: 'Template', r: 'Hàng mới không có ngữ cảnh nào khác thì mang loại khác.', e: '' },
      { s: 'Template', r: 'khác là lựa chọn luôn có mặt trong hệ tag task, đồng thời là chỗ rơi mặc định. Không đổi tên và không xoá được.', e: '' },
      { s: 'Template', r: 'Giờ bắt đầu, giờ kết thúc, thời lượng: hai ô sửa gần nhất giữ nguyên, ô còn lại được tính ra. Mới sửa một ô thì giờ bắt đầu được giữ yên.', e: '' },
      { s: 'Template', r: 'Tab đi dọc ba ô theo thứ tự bắt đầu → kết thúc → thời lượng.', e: '' },
      { s: 'Template', r: 'Một hoạt động có thể mang một ghi chú; không có thì không hiện gì.', e: '' },
      { s: 'Template', r: 'Ghi chú nhập cùng lần với tên, không phải thao tác riêng.', e: '' },
      { s: 'Template', r: 'Ghi chú là địa chỉ web thì hiển thị bằng tên miền, kèm dấu hiệu cho biết nó trỏ vào trong site. Không bao giờ hiện địa chỉ đầy đủ.', e: '' },
      { s: 'Template', r: 'Nhân đôi giữ tên, cả hai tag và thời lượng; bản sao luôn chưa tick.', e: '' },
      { s: 'Template', r: 'Giờ của bản sao: hàng hôm nay lấy giờ lúc bấm; hàng ngày cũ giữ giờ bản gốc và nằm ngay dưới nó.', e: '' },
      { s: 'Template', r: 'Một phiên đồng hồ có hai hành động kết thúc khác nhau: làm lại từ đầu (về 0, giữ tên và cả hai tag) và đặt lại (kết thúc phiên, xoá tên, giữ tag).', e: '' },
      { s: 'Template', r: 'Làm lại một phiên hẹn giờ đã báo hết giờ thì lần hết giờ sau vẫn được báo.', e: '' },
      { s: 'Template', r: 'Một phiên bấm giờ được ghi vào ngày nó bắt đầu, không phải ngày bấm hoàn thành. Phiên chạy qua nửa đêm thuộc về buổi tối trước.', e: '' }
    ] },
    { n: '17', g: '[[hours]] — nhiều lần', items: [
      { s: 'Template', r: 'Tên và hai tag nằm ở hoạt động; giờ, thời lượng và trạng thái xong nằm ở từng lần.', e: '' },
      { s: 'Template', r: 'Thời lượng của hoạt động nhiều lần là tổng thời lượng các lần, không phải hiệu giữa giờ cuối và giờ đầu. Hoạt động không hiển thị cặp giờ.', e: '' },
      { s: 'Template', r: 'Ô tick của hoạt động nhiều lần là xong khi mọi lần đều xong; bấm vào thì đóng hoặc mở tất cả.', e: '' },
      { s: 'Template', r: 'Mọi phép cộng thời lượng đếm các lần và bỏ qua hoạt động chứa chúng.', e: '' },
      { s: 'Template', r: 'Xoá một hoạt động thì xoá cả các lần của nó, và đó là một hành động — một lần Ctrl+Z đưa cả cụm trở lại.', e: '' },
      { s: 'Template', r: 'Hoạt động nhiều lần xếp lên đầu ngày, trước mọi hoạt động thường; giữa chúng thì theo lần sớm nhất. Hệ quả có chủ ý: cột giờ không còn tăng dần từ trên xuống.', e: '' },
      { s: 'Template', r: 'Nút gộp chỉ xuất hiện khi hàng phía trên cùng ngày trùng cả tên, tag project và tag task.', e: '' },
      { s: 'Template', r: 'Gộp vào một hàng thường thì phần việc hàng đó đang giữ trở thành lần thứ nhất.', e: '' },
      { s: 'Template', r: 'Một lần vừa được tạo mở sẵn ô giờ bắt đầu.', e: '' }
    ] },
    { n: '18', g: '[[hours]] — thống kê', items: [
      { s: 'Template', r: 'Ba mốc thời gian là Tháng này · Tuần này · 7 ngày qua. Tuần bắt đầu từ thứ Hai. Không dùng cửa sổ lấy theo số ngày mà giao diện tình cờ tải về.', e: '' },
      { s: 'Template', r: 'Tỉ lệ Hữu ích / Thực tế = tổng thời lượng việc đã xong ÷ độ dài khoảng thời gian thật đã trôi qua, trong đó khoảng chồng nhau chỉ tính một lần. Mẫu số chỉ gồm ngày có ghi.', e: '' },
      { s: 'Template', r: 'Bảng đọc theo hai băng: bảng theo project trải hết bề ngang ở trên, heatmap đứng cạnh danh sách theo loại việc ở dưới.', e: '' },
      { s: 'Template', r: 'Heatmap hiển thị 15 tuần, ô rộng tối đa 24px, neo vào ngày mở sổ.', e: '' },
      { s: 'Template', r: 'Ô heatmap có ba trạng thái: có hoạt động (bốn mức đậm) · trong khoảng ghi nhưng không hoạt động · ngoài khoảng nhật ký từng tồn tại. Trạng thái thứ ba không dùng chung màu với thứ hai.', e: '' },
      { s: 'Template', r: 'Danh sách theo loại việc hiện 7 dòng đầu; phần còn lại mở bằng một cú bấm.', e: '' },
      { s: 'Template', r: 'Project từng dùng mà không có hoạt động nào trong 7 ngày trở lại được xếp vào "lâu chưa đụng tới".', e: '' },
      { s: 'Template', r: 'Bảng thống kê dùng thang khoảng cách của hệ thiết kế (8 / 20 / 40 / 64), không dùng số riêng.', e: '' }
    ] }
  ] }
]
