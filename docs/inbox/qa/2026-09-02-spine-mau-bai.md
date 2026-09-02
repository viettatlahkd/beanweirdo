# Màu bài: một trường, và cái mặc định biết tự cập nhật

PR: #68    nhánh: spine/cms-17-theme-color    commit: điền sau khi merge
Xếp chồng trên #67 — **merge #67 trước**, rồi #68.
Migration: `0021_post_theme_color.sql`, chủ site đã chạy.

## [ĐỔI HÀNH VI] `posts.theme_color`

Trước đây màu một bài mặc là màu module nó thuộc về, không nói khác được. Hỏng ở
hai chỗ: bài trong Ghi 01 và các module đặc biệt không có màu nào tự nhiên để
mặc, còn bài trong module thường thì không lệch đi được dù chỉ một lần.

**Rỗng nghĩa là theo module, không phải chưa đặt màu.** Chọn lại đúng màu module
thì hệ thống không ghi gì cả. Chỗ này đáng nói vì nghe thì vụn: nếu bài chỉ
*chép* màu module vào cột riêng, thì hôm nào đổi màu module, những bài cũ sẽ giữ
màu cũ và trôi dần ra khỏi module của chúng, từng bài một, không ai để ý.

Cột có ràng buộc `^#[0-9A-Fa-f]{6}$` ở cơ sở dữ liệu, và API chặn trước đó — giá
trị này đi thẳng ra thuộc tính CSS của trang, nên không tin phía trước.

## [ĐỔI HÀNH VI] Bộ chọn màu ở hai chỗ

Ở "+ bài mới" và trên đầu màn soạn. Không chỉ lúc tạo, vì màu thường chỉ lộ ra
là sai khi đã viết được vài dòng — bản nháp đầu tiên đúng là lúc người ta phát
hiện ra điều đó.

Bộ chọn hiện: ô màu module (mặc định), các theme module khác, và một ô `+` cho
màu tự đặt. Bên dưới là dải bốn sắc phái sinh, để chọn màu mà thấy luôn nó sẽ
thành cái gì.

Module đặc biệt không có màu riêng thì chỉ hiện danh sách theme của module khác
cộng ô tự đặt — đúng luồng chủ site mô tả cho Ghi 01.

## [ĐỔI HÀNH VI] Mỗi màu được gọi tên một kiểu, ở mọi chỗ

`[tên module] — [mã màu]`, ví dụ `sensory — #F2A0A5`. Màu không thuộc module nào
thì là `customize — #773236`. Áp cho mọi ô màu: tên khi rê chuột, tên cho trình
đọc màn hình, và dòng mô tả dưới dải màu phái sinh.

Kèm một ô nhập mã màu. Màu thường được chốt ở chỗ khác trước — trong một bản
tham chiếu, một ảnh chụp, một file khác — rồi tới đây dưới dạng sáu ký tự để
dán. Ô nhận cả `773236` lẫn `#773236`, và giữ nguyên thứ đang gõ dở: ba ký tự
chưa phải một màu, nên bài vẫn giữ màu cũ cho tới khi đủ sáu.

## [SỬA LỖI] SPEC ghi 22 migration, thật là 23

`spec-numbers.mjs --check` chặn đúng chỗ. Migration 0021 làm con số lệch; đã sửa
trong `docs/SPEC.html`.

## [SỬA LỖI] Bộ chọn sập khi gặp module không có màu

Fixture test của `MetadataStep` không đặt `accent` cho module nào, và điều đó làm
lộ một lỗi thật: `t.color.toLowerCase()` trên một module không màu ném lỗi và
đánh sập cả form. Nay module không màu thì bỏ qua, và so màu bằng một hàm chịu
được rỗng. Fixture cũng được cho màu thật, giữ lại một module không màu để đúng
đường đi ấy còn được test.

## [ĐỔI HÀNH VI] Dải màu đầu trang: một chỗ cho cả năm template

Trước đây mỗi adapter tự viết `band: mod ? {...} : undefined`, năm bản sao. Nay
một hàm `bandOf`. `on_color` **chỉ đi cùng màu module** — nó là câu trả lời của
module cho "chữ gì đọc được trên tôi", và là câu trả lời sai cho một màu khác;
với màu khác thì hệ thống tự tính từ độ sáng.

## Luật mới

A21, A22 trong `docs/spine/SO-BAN-GIAO.md`.

## Kiểm thử

`npm test` — 77 file, 743 test, xanh, kể cả test tích hợp chạm cơ sở dữ liệu
thật sau khi migration đã chạy. Mới: 5 test cho form, 8 test cho quy tắc màu
chạy qua cả năm template.

Đã soi bằng trình duyệt thật: dán `#773236` vào ô mã màu thì dải màu phái sinh
đổi theo và dòng mô tả thành `customize — #773236`; bấm lại ô màu module thì về
`sensory — #F2A0A5`.
