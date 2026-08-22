# QA-18 · Co gọn danh sách ngày theo tuần và theo tháng

PR: chưa tạo    nhánh: feat/qa-18-collapse-weeks    commit: điền sau khi merge
Nguồn: chủ site ngày 2026-08-22 — "kiểm tra xem có logic be + fe chưa nếu chưa
thì set up thêm hiển thị như sau: Co gọn các ngày hoạt động theo tuần hoặc
tháng · có 2 tuần trở lên, tuần cũ được gom lại, user click mở mới mở · có 2
tháng trở lên, tháng cũ được gom lại, user click mở mới mở · week khi co under
tháng".
Cắt từ: feat/qa-16-kickoff (xếp sau QA-14, QA-15, QA-16 khi merge)

## Trả lời câu hỏi "có logic be + fe chưa"

- **Backend: đã đủ, không cần thêm gì.** `GET /api/hours?from=YYYY-MM-DD` trả
  mọi hoạt động từ ngày đó tới nay. Từ QA-16, `from` không bao giờ sớm hơn ngày
  mở sổ, nên lời gọi này đang tải **toàn bộ lịch sử** — mà lịch sử đang dài ba
  ngày. Không cần phân trang, không cần endpoint mới, cho tới khi nhật ký dài
  vài năm.
  Bằng chứng: backend/api/hours.ts (`from`), frontend/src/data/useHours.ts.
- **Frontend: gom theo tháng thì đã có sẵn** — `openMonths`, tháng hiện tại
  luôn mở, tháng cũ có nút "xổ ra ↓". Thiếu tầng tuần, và thiếu dữ liệu để
  tháng cũ có gì mà hiện.

## Đã đổi

- [SỬA LỖI] **Tháng cũ xổ ra thì trống rỗng.** Danh sách ngày chỉ dựng 21 ngày
  gần nhất rồi cắt tiếp còn 12 ngày để hiển thị. Bấm "xổ ra ↓" ở tháng trước sẽ
  ra một khối rỗng, vì những ngày đó chưa bao giờ được dựng. Cái nút đã có từ
  trước, thứ nó mở ra thì không.
  Nay danh sách dựng từ ngày mở sổ tới hôm nay, trần là cửa sổ dữ liệu đã tải
  về (182 ngày), và không còn cắt 12.
  Bằng chứng: `buildAllDays` trong frontend/src/lib/hoursStats.ts; `shownDays`
  trong frontend/src/screens/Hours.tsx.

- [ĐỔI HÀNH VI] **Thêm tầng tuần, nằm trong tháng.** Thứ tự đọc là tháng → tuần
  → ngày, tuần thụt vào dưới heading tháng. Tuần cắt từ thứ Hai tới Chủ nhật.
  Bằng chứng: `weekGroups` trong hoursStats.ts; phần dựng `weeks` và khối render
  trong Hours.tsx.

- [ĐỔI HÀNH VI] **Tuần mới nhất trong tháng để mở, các tuần cũ hơn gom lại**,
  mỗi tuần một nút "xổ ra ↓". Đúng luật chủ site đặt: từ hai tuần trở lên mới có
  chuyện gom.

- [ĐỔI HÀNH VI] **Tháng chỉ có một tuần thì không có heading tuần nào cả.**
  Một tuần nằm dưới một tháng là đọc hai lần cùng một thứ. Hiện tại nhật ký mới
  có ba ngày trong cùng một tuần, nên màn hình **không đổi gì so với trước** —
  tầng thứ hai chỉ hiện khi thật sự có tuần thứ hai.

- [ĐỔI HÀNH VI] **Nhãn tuần đặt bằng chữ serif**, cùng họ với heading tháng
  nhưng nhỏ hơn một bậc (15.5px, `#143C43`), kèm một đường kẻ mảnh làm chân.
  Bản đầu dùng chữ hoa nhỏ màu xám — chủ site xem rồi bảo "chìm nghỉm", và
  đúng: ở cỡ đó nó nằm cùng trọng lượng với mọi nhãn khác trên màn hình nên
  đọc thành thêm một dòng phụ trợ, không thành một tầng. Hai bản sửa tiếp theo
  (vạch màu dọc, rồi chip nền đặc) cũng bị từ chối. Cái ăn thua không phải màu
  mà là **kiểu chữ**: tầng hiện ra theo đúng cách tháng vẫn làm.
  Bằng chứng: khối heading tuần trong Hours.tsx.

- [ĐỔI HÀNH VI] **Hàng tuần gom lại vẫn nói đủ**: khoảng ngày, số ngày có ghi
  trên tổng số ngày của nhóm, và tổng thời lượng. Đủ để không cần mở ra mới
  biết tuần đó thế nào.

- **Tuần vắt qua hai tháng bị chia theo tháng đang đọc**, và nhãn ghi đúng
  những ngày thật sự nằm trong nhóm. Ngày 31/8 là thứ Hai; đọc dưới tháng 8 nó
  là "Tuần 31.8" — một ngày — chứ không phải một tuần im ắng.

- **Bỏ hai hằng không còn ai dùng**: `SPAN_DAYS` (21) và `SHOWN_DAYS` (12).

## Đối chiếu bộ luật

Không mâu thuẫn với luật nào; `logic.ts` không quy định gì về độ dài hay cách
gom của danh sách ngày.

Nếu `docs/SPEC.html` mô tả màn Ghi 02 hiện "12 ngày gần nhất" hoặc "21 ngày"
thì nay đã sai — tôi không sửa file đó.

## Bảng, cột, endpoint đã đụng

Không có. Toàn bộ là gom nhóm phía giao diện trên dữ liệu đã tải sẵn. Không
migration.

## Kiểm tra

- 5 test mới cho `weekGroups`: cắt tuần theo thứ Hai · tuần mới nhất mở còn lại
  gom · một tuần thì không có gì để gom · nhãn tuần cụt · cộng phút và đếm ngày
  có ghi.
- Toàn bộ: 322 test xanh, typecheck sạch, `vite build` sạch.
- Xem trên trình duyệt bằng cách **tạm lùi ngày mở sổ về 01/06/2026** để có ba
  tháng và bốn tuần, rồi trả lại đúng 20/08. Kết quả lúc đó: tháng 8 mở với
  tuần 17–22.8 mở (2/6 ngày, 9h 10m) và ba tuần cũ gom lại (0/7, 0/7, 0/2);
  tháng 7 và tháng 6 gom lại. Sau khi trả ngày mở sổ về: đúng ba ngày, một
  tuần, không heading tuần — như mong đợi.

## Đề xuất luật

1. Danh sách ngày đọc theo ba tầng: tháng, rồi tuần, rồi ngày. Tuần luôn nằm
   trong một tháng.
2. Tuần tính từ thứ Hai tới Chủ nhật. Tuần vắt qua hai tháng được đọc tách theo
   từng tháng, và nhãn ghi đúng khoảng ngày thuộc nhóm.
3. Từ hai tuần trở lên trong một tháng: tuần mới nhất để mở, các tuần cũ hơn
   gom lại cho tới khi người dùng bấm mở. Một tuần thì không hiện heading tuần.
4. Từ hai tháng trở lên: tháng hiện tại để mở, các tháng cũ hơn gom lại.
5. Một nhóm đang gom vẫn phải hiện khoảng thời gian, số ngày có ghi và tổng
   thời lượng của nó.

## Còn bỏ ngỏ

- Trạng thái mở/gom **không được nhớ giữa các lần vào trang**. Mỗi lần mở màn
  Ghi 02, chỉ tháng hiện tại và tuần mới nhất là mở. Nếu chủ site muốn nhớ thì
  thêm một khoá `localStorage` là xong — chưa làm vì chưa được yêu cầu.
- Trần 182 ngày là cửa sổ dữ liệu tải về, không phải giới hạn hiển thị. Khi
  nhật ký vượt sáu tháng, các tháng cũ hơn sẽ không có gì để xổ ra. Lúc đó cần
  tải theo tháng khi người dùng bấm mở — chưa cần bây giờ, nhưng sẽ cần.
