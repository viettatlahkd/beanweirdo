# spine/design-02-module-surfaces · Module đặc biệt vẫn là module

nhánh: spine/design-02-module-surfaces   base: origin/main

## Schema
- **Migration 0015** (chủ site đã chạy trên production ngày 2026-08-21):
  thêm `modules.visibility` — `'public' | 'private'`, mặc định `'public'`,
  có ràng buộc check. Đặt `ghi02 = 'private'`.
- Lý do: bảng `modules` trước đó chỉ có `kind` (normal/special) và code đã
  gộp "đặc biệt" với "ẩn" làm một. Ghi 01 công khai nhưng vẫn bị ẩn khỏi Mục
  lục vì nó đặc biệt.

## API
- Không đổi hợp đồng. `/api/modules` dùng `select('*')` nên cột mới tự có.

## Màn hình
- `frontend/src/data/useModules.tsx` — `readingModules` tách thành ba hàm theo
  ba bề mặt; thêm `visibility` vào `ModuleRow`
- `frontend/src/lib/moduleTarget.ts` (mới) — module đặc biệt mở trang riêng
- `frontend/src/components/Sidebar.tsx` — Ghi 01 vẽ như module, không như trang
- `frontend/src/screens/IndexScreen.tsx` — Mục lục nhận module đặc biệt công khai
- `frontend/src/screens/Landing.tsx` — đổi tên hàm, hành vi giữ nguyên
- `frontend/src/screens/DesignSystem.tsx` — bảng theme đọc DB thay vì file tĩnh
- `frontend/src/content/designSystem.ts` — sửa mã màu ô "apricot"
- `frontend/src/content/modules.ts` — gỡ 18 bài giả và hai hàm chết

## Đã đổi
- [ĐỔI HÀNH VI] Mục lục nay liệt kê module đặc biệt công khai. Bài
  "taste modality: sơn la" (thuộc Ghi 01) lần đầu xuất hiện ở Mục lục.
- [ĐỔI HÀNH VI] Sidebar vẽ Ghi 01 như một module có số bài, thay vì một dòng
  trang trống. Thứ tự: module thường trước, đặc biệt sau.
- [ĐỔI HÀNH VI] Bảng theme ở trang Design system đọc từ database. Trước đọc
  file tĩnh nên hiện "roasting" thay vì "roasting 101", sai thứ tự, và không
  đổi theo CMS.
- [SỬA LỖI] Ô màu "apricot" vẽ ra #A13B4B (đỏ rượu). Sửa thành #F0B45C, đúng
  màu module roasting đang dùng.
- [SỬA LỖI] Ô ảnh thứ 3 ở Mục lục: chữ #3B2E19 trên nền #A13B4B, tương phản
  2.04:1. Đổi nền sang #F0B45C → 7.16:1.
- [SỬA LỖI] Gỡ 18 bài viết giả trong `content/modules.ts` — dữ liệu thời
  prototype, trông như bài thật, không ai đọc nhưng chỉ cách một dòng import.

## Đụng luật
- Nhóm 05 (Điều hướng) — luật "module đã tạo thì luôn hiện" vẫn đúng nguyên.
  PR này nói rõ thêm *hiện ở đâu*, không sửa luật cũ.

## Luật đề xuất
- "Module phân loại theo hai trục độc lập: `kind` nói nó là gì, `visibility`
  nói nó có được liệt kê không. Không bao giờ lọc một bề mặt chỉ bằng `kind`."
- "Trang chủ chỉ trưng module thường — vì nó là phòng trưng bày module đọc,
  không phải vì module đặc biệt bị ẩn. Mục lục và sidebar liệt kê mọi module
  công khai."
- "Sidebar xếp module thường trước, module đặc biệt sau; trong mỗi nhóm theo
  thứ tự đặt ở Content management."

## Kiểm chứng
Trên trang đang chạy, dữ liệu production:
- Trang chủ: sensory · roasting 101 · biochemistry 101 (không đổi)
- Sidebar:   sensory 1 · roasting 101 0 · biochemistry 101 1 · **Ghi 01 1**
- Mục lục:   bốn mục, gồm Ghi 01, và có bài "taste modality: sơn la"
- Test: 169 FE + 137 BE, xanh. Typecheck sạch.

## SPEC lỗi thời
- Mục "Cơ sở dữ liệu" — bảng `modules` nay 21 cột, không phải 20.
- Mục "Mô hình nội dung" — đoạn nói module đặc biệt "không nằm chung lưới với
  các module kiến thức trên trang chủ" vẫn đúng, nhưng cần nói rõ chúng **có**
  nằm ở Mục lục và sidebar.
