# Đối soát design ↔ code

Thay cho hai tài liệu cũ `DOI-SOAT-DESIGN-V4.html` và `SO-TUNG-ELEMENT.html`.
Hai file đó **chưa từng được commit**, có lỗi, và **không tái lập được** — nên
không dùng làm căn cứ nữa.

Chạy lại bất cứ lúc nào:

```bash
node tools/design-audit.mjs            # tóm tắt
node tools/design-audit.mjs --screens  # design định nghĩa màn hình nào
node tools/design-audit.mjs --props    # giá trị design viết ra mà chưa thấy trong code
```

## Vì sao phải dựng lại

Agent tài liệu rà hai tài liệu cũ (lượt 03–04) và tìm ra:

| Lỗi | Hệ quả |
|---|---|
| Số dòng lệch 5 | mọi tham chiếu "ở đâu trong design" đều sai |
| Không tái lập được | script đọc file design từ thư mục tạm của một phiên đã kết thúc |
| Số liệu gộp hai loại | "84 máy báo nhầm" trộn 9 mục soi tay với 75 mục chỉ khớp chuỗi |
| Một số mục đã lỗi thời | code đã sửa từ lúc viết |

## Và một lỗi nặng hơn, chỉ lộ ra khi dựng lại

**File design tôi dùng không phải file trong repo.**

| | Màn hình | Kích thước |
|---|---|---|
| Bản trong repo — chuẩn thật | **16** | 331.786 bytes |
| Bản tôi dùng, lấy từ zip | 14 | 276.397 bytes |

Bản trong repo là **export mới hơn**, có thêm hai màn hình: **`isLongform`** và
**`isTaste`**.

Tôi đã báo cáo rằng hai bộ vẽ bài `longform` và `memo` "không có bản design để
đối chiếu". **Sai** — chúng có, tôi chỉ đọc nhầm file.

## Số liệu hôm nay

```
design       4.177 dòng · 16 màn hình
code         71 file .ts/.tsx (bỏ test)
khai báo CSS 876 giá trị literal khác nhau
  khớp chuỗi 816   ← MÁY đối chiếu, chưa ai soi tay
  không thấy  60   ← cần người xem
```

**Hai con số này nghĩa là gì — và không nghĩa là gì:**

- *khớp chuỗi* chỉ nghĩa là giá trị đó **có mặt đâu đó** trong code. Nó
  **không** chứng minh được dùng đúng chỗ. Đây là sàng lọc, không phải kết luận.
- *không thấy* **không phải** lệch đã xác nhận. Nhiều mục nằm trong nhóm này vì
  code diễn đạt cách khác — ví dụ `transform: translate(-34px,0)` được dựng
  trong `Rise.tsx` từ tham số, nên không có chuỗi nào khớp.

Tài liệu cũ đã trộn hai loại này làm một. Đó là lỗi khiến con số nghe chắc chắn
hơn thực tế rất nhiều.

## Việc còn phải làm

| | |
|---|---|
| Soi tay 60 mục "không thấy" | phân loại: lệch thật / diễn đạt khác / cố ý khác |
| **Đối soát `isLongform`** | chưa từng làm, vì tôi tưởng không có design |
| **Đối soát `isTaste`** | chưa từng làm, cùng lý do |

Ba trang đã đối soát bằng mắt trên trình duyệt — Design system, Sidebar, trang
bài chi tiết — vẫn còn giá trị: chúng dựa vào việc xem trang thật, không dựa
vào bảng máy sinh.
