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

---

# Bổ sung · Số thứ tự bài đánh theo danh sách đang hiển thị

## Đã đổi
- [ĐỔI HÀNH VI] Số hiện cạnh mỗi bài nay là **vị trí trong danh sách đang
  hiển thị**, không còn lấy từ cột `posts.n`.
  - Trước: `Sensory Lexicon` hiện `03`, `Lipid: Tổng quan` hiện `05` — vì đó
    là vị trí lúc soạn, tính trên toàn bộ bài trong module kể cả bài đã lưu
    trữ. Năm trong sáu bài đã lưu trữ, nên bài duy nhất còn đăng tự giới thiệu
    mình là "05".
  - Sau: cả hai hiện `01`.
- [SỬA LỖI] `Article.tsx` tra cứu bài dự phòng bằng `p.n === '03'` — một
  chuỗi cứng. Chỉ cần lưu trữ hoặc kéo-thả đổi thứ tự một lần là nó trỏ vào
  hư không. Nay lấy bài đã đăng đầu tiên của module.

## Phạm vi — tám chỗ in số
| Chỗ | Đánh số theo |
|---|---|
| Mục lục — dạng danh sách | bài đã đăng của module |
| Mục lục — dạng cột | bài đã đăng của module |
| Trang module — band / specimen / sequence | bài đã đăng của module |
| Trang bài — dòng eyebrow | vị trí trong danh sách anh em đã đăng |
| CMS — sơ đồ trang | danh sách đang hiện |
| CMS — hàng kéo-thả | danh sách đang hiện |

## Đụng dữ liệu
- Không đổi schema. `posts.n` vẫn còn và vẫn được `PUT /api/posts` ghi khi
  kéo-thả đổi thứ tự — nhưng **không màn hình nào in nó ra nữa**.
- Kéo theo: `posts.n` giờ trùng lặp với `sort_order`. Đề nghị chủ site quyết
  có bỏ cột không — chưa làm gì.

## Luật đề xuất
- "Số hiện cạnh một bài là vị trí của nó trong danh sách người đọc đang nhìn,
  đếm từ 01. Không bao giờ in thẳng `posts.n` — đó là thứ tự lúc soạn, tính
  trên mọi bài bất kể trạng thái."
- "Khi chưa biết bài nằm ở đâu trong danh sách thì bỏ số đi, đừng đoán."

## Kiểm chứng
Trên trang đang chạy, Mục lục:
```
sensory           01 · Sensory Lexicon        (trước: 03)
biochemistry 101  01 · Lipid: Tổng quan       (trước: 05)
Ghi 01            01 · taste modality: sơn la
roasting 101      (chưa có bài đã đăng)
```
Trang module biochemistry: `01`. Test 170 FE + 137 BE, xanh.

**Chưa quan sát được trên site:** dòng eyebrow ở trang bài chỉ áp cho bài dạng
`article`, mà ba bài đang đăng đều là `cards`, `longform`, `memo`. Phần đó do
test bao, không phải do nhìn tận mắt.
