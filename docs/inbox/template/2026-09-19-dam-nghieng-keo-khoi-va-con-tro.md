# Đậm/nghiêng tách đôi, khối thả được vào dải chữ, `+` bám con trỏ

Nhánh: `claude/project-thread-ey2sz1`, cắt lại từ `origin/main` @ `8da83fd`.
PR: chưa mở lúc viết.

Chạm `packages/post-renderer/` — tệp lane Kiến trúc. Lane ấy đã đóng luồng nên
không còn ai giữ; ghi ra đây thay cho bàn giao.

---

## [ĐỔI HÀNH VI] Đậm và nghiêng thành hai mức rời nhau

**Trước:** site có **một** mức nhấn. `Run.em` trong `elements/runs.ts` vẽ ra
`fontWeight: 600` **và** `fontStyle: italic` **và** màu nhấn, cùng một lúc. Cả
`*x*`, `**x**` lẫn `__x__` đều đọc về nó. Trong khung soạn, `OneEmphasis` của
`LiveText.tsx` đổi mọi format `italic` thành `bold` ngay tại gốc, và
`THEME.text` trỏ cả `bold` lẫn `italic` về chung lớp `awc-live-bold`. Nên
`Ctrl+B` với `Ctrl+I` ra cùng một thứ.

**Sau:** `Run` có thêm `b`. `em` chỉ còn nghĩa nghiêng.

| Viết | Đọc ra |
|---|---|
| `*x*` | nghiêng |
| `**x**`, `__x__` | đậm |
| `***x***`, `___x___` | cả hai |

Chủ site: *"ctrl B là in đậm thôi không in nghiêng, ctrl I là in nghiêng không
in đậm. còn in ngang và đậm cùng lúc thì là nút gì nhỉ đề xuất nhé theo
markdown ấy"* — đề xuất đã gửi và được gật: **không có phím thứ ba**, bấm cả
hai, ký hiệu là `***x***`.

**Đây là chỗ bản này đổi hình dạng bài đã đăng, và là chỗ duy nhất.** Bật cả
hai cờ cho ra đúng mức nhấn cũ, nên `***x***` trông y như trước. Bài cũ viết
`**x**` nay **mất phần nghiêng**; viết `*x*` nay **mất phần đậm**. Không đếm
được bao nhiêu bài dính: phiên không đọc được database.

Đã đụng, theo thứ tự dòng chảy của một ký tự:

- `elements/runs.ts` — `Run.b`; `MARKED` thêm `***`/`___` **đứng trước** `**`,
  vì `[^*\n]+` của nhánh hai sao không nuốt được dấu sao thứ ba nên `***x***`
  vốn vỡ thành một sao lẻ cộng `**x**`; `textToRuns` đọc theo bảng trên;
  `runsToText` ghi ba-hai-một theo thứ tự ấy; `pushPlain` thêm `!last.b` vào
  điều kiện gộp, không thì chữ thường nuốt mất một run đậm.
- `elements/inline.tsx` — `mark()` vẽ `fontWeight` theo `b`, `fontStyle` theo
  `em`, màu nhấn cho cả hai.
- `elements/html.ts` — `STRONG`/`B` ra `**`, `EM`/`I` ra `*`. Trước cả bốn thẻ
  về chung `**`.
- `types.ts` — `MemoRun` thêm `b`, cùng ký hiệu nên cùng cờ.
- `admin/lib/liveMarkdown.ts` — thêm `EM_TRIPLE_STAR` (`format: ['bold',
  'italic']`) đứng đầu; `EM_STAR` đổi từ `bold` sang `italic`.
- `admin/components/LiveText.tsx` — bỏ `OneEmphasis`; `THEME.text.italic` trỏ
  sang lớp mới `awc-live-em`.
- `admin/admin.css` — `.awc-live-bold` chỉ còn `font-weight`, thêm
  `.awc-live-em` với `font-style`.
- `admin/lib/marks.ts` — `Mark` đổi `'em'` thành `'bold'`, thêm `'italic'`;
  `markFor` nhận thêm phím `i`.

## [SỬA LỖI] `Cmd+I` lên một chữ đang đậm thì gỡ mất một tầng đậm

`toggleWrap` trong `marks.ts` hỏi "đã có dấu này chưa" bằng cách so từng ký tự
ngay ngoài vùng chọn. Với `**chữ**` và dấu `*`, nó thấy một dấu sao sát mép,
tưởng là đã nghiêng, nên **gỡ** một sao: `**chữ**` thành `*chữ*`.

Đã sửa: `alreadyWrapped` **đếm** số dấu sao liền nhau. Một là nghiêng, hai là
đậm, ba là cả hai — nên nghiêng hỏi số lẻ, đậm hỏi từ hai trở lên. Gạch dưới
không chồng tầng nên vẫn hỏi đúng bằng.

## [SỬA LỖI] Khối kéo lên rồi không có chỗ thả

**Tái hiện:** mở một bài có hình "chữ – ảnh – chữ", nhấc tấm ảnh bằng tay nắm,
kéo lên trên đoạn chữ đầu, thả. Không có gì xảy ra.

**Nguyên nhân:** chỉ **khối** mới nhận thả. `RowShell` và nhánh `thing` của
report có `onDragOver`/`onDrop`; dải chữ thì không có gì cả. Bài thường chỉ có
một hai khối thật, nên gần như không có điểm hạ cánh nào.

Chủ site: *"tất cả các khối tạo bằng [+] đều đang không kéo di lên xuống được.
nó phải di được lên xuống khắp cả template edit nhé"*.

**Đã sửa:** `LiveRun` nhận thêm `drop`, và dải chữ thành chỗ hạ cánh với một
vạch rơi chạy theo chuột. Nối ở cả bốn chỗ gọi — article (`wrapSection`),
long-form, `useElementBody` (memo/bitesize/cards) và report.

`lineAtY` trả về dòng **gần nhất** chứ không đòi trúng. Giữa hai dòng có
khoảng cách và dải có đệm ở hai đầu; đòi trúng thì thả vào mấy chỗ ấy lại
không có gì xảy ra, tức là đúng cái lỗi đang sửa, chỉ hẹp hơn.

**Chữ không thành khối.** Dải chữ vẫn là một dòng chảy, không có tay nắm,
không cắt theo đoạn. Bản nháp đầu của tôi định gắn tay nắm vào từng dòng chữ
và chủ site bác thẳng: *"chữ không có khối. không tách paragraph. tất cả là
long form edit như lark/markdown/ghost rồi mà"*.

## [ĐỔI HÀNH VI] Trích dẫn ra đứng riêng thành khối

`FLOWING` trong `admin/lib/flow.ts` bỏ `'quote'`, còn `paragraph`, `heading`,
`list`.

Chủ site: *"quote cũng phải được di chuyển chứ"*. Thứ nằm trong dải chữ thì
không có tay nắm, nên muốn kéo được thì phải ra đứng riêng.

Gõ `> ` vẫn tạo ra nó như cũ; khác ở chỗ lúc ghi lại, nó tách khỏi dải thành
một khối có tay nắm, dùng nhánh `case 'quote'` sẵn có của `ReportBlockFields`
(ô chữ và ô nguồn). `TYPED` giữ nguyên nên nó vẫn không nằm trong menu `+`.

## [SỬA LỖI] Nút `+` bám chuột thay vì bám con trỏ soạn

`LiveRun.follow` nghe `onMouseMove` và đo `clientY`. Chủ site: *"nút [+] đang
đi theo trỏ chuột thay vì vị trí của trỏ editor là cái [|]"*.

**Đã sửa:** `followCaret` đi từ nút neo của vùng chọn lên tới đứa con trực tiếp
của ô nhập — mỗi đứa con là một dòng — rồi lấy thứ tự của nó. Nghe
`selectionchange` ở tầng tài liệu, vì đó là đường duy nhất bắt được con trỏ đi
lại bằng cả phím mũi tên lẫn chuột. Đo lại sau mỗi lần vẽ có chữ mới, vì lúc ấy
các dòng xê dịch mà con trỏ không đi đâu nên sự kiện không bắn.

Không đo bằng toạ độ của vùng chọn: `getBoundingClientRect` của một vùng chọn
rỗng trả về 0 ở vài trình duyệt, còn cây DOM thì luôn nói đúng dòng.

## [SỬA LỖI] Xoá bằng bàn phím dừng lại ở khối — chỉ ở report

**Tái hiện:** trong một bài report, đặt con trỏ ở đầu đoạn chữ ngay dưới một
tấm ảnh, bấm `Backspace`. Không có gì xảy ra; phải bấm nút `×`.

**Nguyên nhân:** `registerLiveKeys` và hai móc `onBackspaceAtStart` /
`onDeleteAtEnd` đã có từ trước, và **năm** khuôn kia đều nối. Report là khuôn
duy nhất còn dựng dải chữ bằng tay — nó gọi thẳng `LiveText` và không truyền
hai móc ấy.

**Đã sửa:** report dùng chung `LiveRun` như năm khuôn kia. Nhờ vậy nó nhận luôn
cả máng `+` bám con trỏ lẫn chỗ thả khối. Xoá đi qua `requestRemove`, không xoá
thẳng: khối bị nuốt có thể đang mang ghi chú cạnh bài, và nó phải hỏi chỗ để
chữ ấy đi — y như bấm `Delete` trên tay nắm.

## Bảng, cột và endpoint đã đụng

Không đụng gì. Không migration, không endpoint, không cột. Cách lưu không đổi:
`Run.b` là một cờ mới trong cùng cột `body` jsonb, và bài cũ không có nó thì
đọc ra `undefined`, tức là không đậm.

## Đối chiếu bộ luật (`frontend/src/content/logic.ts`)

- **Nhóm 08** — soạn và lưu. Không luật nào nói site có mấy mức nhấn, nên tách
  đôi không mâu thuẫn với chữ nào đang có. Nhưng nó là thứ specs **nên** nói:
  xem mục cuối.
- **15.1** — "ô ảnh không có ảnh thì là hộp màu". Không đụng.

## Chưa nhìn tận mắt

`npm test` (136 tệp, 1385 bài, xanh) và `vite build`. `/ad-post` sau cổng đăng
nhập nên **chưa ai mở trình duyệt xem**. Năm chỗ đáng nhìn:

1. **Bài cũ đang dùng `**`.** Chúng mất phần nghiêng. Đây là chỗ rủi ro nhất
   của bản này và không đo được từ phiên.
2. Vạch rơi trong dải chữ: nó `position: absolute` với `left: 122` — đúng bề
   rộng máng — nên dải nào có máng khác bề rộng sẽ lệch.
3. Gõ `> ` giữa một đoạn văn: lúc rời ô, dải tách làm ba và con trỏ đi đâu thì
   chưa ai thấy.
4. `+` bám con trỏ trong danh sách lồng nhiều tầng: `input.children` đếm mục
   cấp một, mục con nằm trong nó.
5. `Backspace` ở đầu dải chữ trong report, ngay dưới một khối **có ghi chú**:
   phải hiện hộp "ghi chú đi đâu" chứ không xoá thẳng.

## Đề xuất luật

Nhóm 08 nên có một câu nói site có **hai** mức nhấn và ký hiệu của từng mức,
vì đó là thứ vừa đổi và là thứ người viết gõ hằng ngày. Kèm một câu rằng gạch
dưới đơn (`_x_`) là **số đo**, không phải nghiêng — đây là chỗ phương ngữ của
site lệch khỏi markdown chuẩn, và là chỗ duy nhất còn lệch sau bản này.
