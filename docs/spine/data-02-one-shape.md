# spine/data-02-one-shape · Một hình dạng dữ liệu, từ đầu đến cuối

nhánh: spine/data-02-one-shape   base: origin/main

## Đã đổi
- [ĐỔI HÀNH VI] **API thôi đổi tên cột.** Trước đây mọi trường được đổi sang
  kiểu camelCase khi trả ra (`module_id` → `moduleId`…). Nay giữ nguyên tên
  của database. Cả hệ thống chỉ còn **một** bộ tên trường.
- Gỡ hai bộ nối `fromAdminPost` / `fromAdminModule` — không còn gì để nối.
- Rút gọn bảng ánh xạ PATCH: mọi khoá đã trùng tên cột, nên nó chỉ còn là danh
  sách cột được phép ghi.

## ⚠ Đây là thay đổi hợp đồng API
Frontend và backend là hai dự án Vercel riêng, deploy không đồng thời. Trong
khoảng giữa hai lần deploy, khu admin có thể lỗi vài phút. Khu công khai
**không ảnh hưởng** — nó đọc thẳng database, không qua API.

## Phạm vi
203 chỗ trên 22 file. **Không** đổi những chỗ trùng tên nhưng không thuộc API:
`nav.moduleId`, tham số `moduleId` của hook, `content/modules.ts`, và các trường
của bộ vẽ bài như `furtherReading`.

## Đụng dữ liệu
- Không đổi schema, không migration.
- Đổi **hình dạng phản hồi** của `/api/posts`, `/api/posts/[id]`, `/api/modules`,
  `/api/templates`, và **khoá nhận vào** của `PATCH /api/posts/[id]`.

## Luật đề xuất
- "API trả về đúng tên cột của database, không đổi tên. Đổi tên ở biên giới là
  cách chắc chắn nhất để hai bên cùng đọc một bài mà hiểu thành hai thứ."

## Kiểm chứng
- Test mới đọc thẳng `backend/lib/posts.ts` và **bắt lỗi nếu có trường nào
  quay lại kiểu camelCase**. Đã thử: đổi một trường → đỏ ngay.
- Trên máy: Content management liệt kê đủ 19 bài kèm ảnh, trạng thái, thao tác;
  màn soạn bài mở đúng bài với dải màu module.
- 223 FE + 137 BE xanh, typecheck cả ba phần sạch.

**Chưa kiểm tận tay:** thao tác lưu bài (PATCH) — tôi không muốn ghi vào dữ
liệu thật để thử. Phần này do test backend bao.

## SPEC lỗi thời
- Mục "Backend" — mô tả hình dạng phản hồi cần sửa sang tên cột database.
