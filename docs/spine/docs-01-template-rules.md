# spine/docs-01-template-rules · Ba luật mô tả sai mô hình template

nhánh: spine/docs-01-template-rules   base: origin/main

## Bối cảnh
Chủ site mô tả lại cách dùng mẫu thật: mẫu được dựng **từ một bài thật sắp
đăng** nên **có sẵn nội dung**; một mẫu được clone **nhiều lần** thành nhiều
bài **khác tiêu đề và khác cả nội dung**.

Code làm đúng như vậy từ lâu — `POST /api/posts` sao chép `body` của mẫu một
lần, bài giữ tiêu đề người dùng gõ, rồi mở thẳng màn soạn bài. Nhưng **bộ quy
tắc mô tả một mô hình khác**.

## Đã sửa — 3 luật, nhóm 09
| | Trước | Sau |
|---|---|---|
| [1] | "template … một cái **khung rỗng**, **không phải nội dung**" | mẫu là nội dung lưu lại để dùng lại; tạo bài là sao chép nội dung đó |
| [5] | "chỉ đổi màu, nhãn, tiêu đề, đoạn dẫn — **nội dung giữ nguyên**" | bài sở hữu nội dung của nó; một mẫu clone nhiều lần thành nhiều bài khác nội dung |
| [6] | đường dẫn bài mẫu `Admin › Notes › Templates` | `Admin › Templates` — khớp code |

Ba luật còn lại trong nhóm ([2] [3] [4], về màu) vẫn đúng, không đụng.

## Nguồn gốc
Hai luật [1] và [5] viết từ thời "template" nghĩa là ba màn hình mẫu rỗng —
thứ đã bị bác bỏ khi làm lại hệ template thành kho dữ liệu. Chúng sống sót qua
đợt đó và mâu thuẫn với code kể từ đấy.

## Vì sao nguy hiểm
Luật mâu thuẫn với code **tệ hơn là không có luật**: người đọc rulebook sẽ
tưởng code sai và sửa nó quay lại mô hình cũ.

## Kiểm chứng
- Thêm `templateModel.test.ts` — đỏ nếu câu chữ cũ quay lại.
- 226 FE + 137 BE xanh.

## Không đụng code
Code đã đúng. PR này chỉ sửa mô tả — không đụng schema, endpoint, giao diện.
