# /journal thay /personal-blog · Mục lục beanweirdo thêm được trang có sẵn

Nhánh `claude/journal-path-menu-link-wqo5s6`.

## [ĐỔI HÀNH VI] Tiền tố của blog: `/personal-blog` → `/journal`

- Tôi đổi hằng `BLOG` trong `frontend/src/lib/routes.ts` thành `'journal'`. Mọi địa chỉ blog (`toPath`) đi theo: `/journal`, `/journal/muc-luc`, `/journal/ghi`, `/journal/module/…`, `/journal/tag/…`, `/journal/post/…` (vẫn chuyển về `/p/…`).
- Không giữ bí danh: `/personal-blog` giờ đọc như một trang biz lạ (`routes.test.ts`, "đọc lại đúng các địa chỉ mới"). Địa chỉ cũ hơn (`/bean/details`, `/muc-luc`…) vẫn chuyển như trước, giờ về `/journal`.
- `backend/lib/vocab.ts: RESERVED_SLUGS`: `'personal-blog'` thay bằng `'journal'`.
- Nhãn hiển thị "personal blog" / "Personal Blog" đổi thành "journal" / "Journal" (`AdminShell.tsx: CONFIG_SITE_LABELS`, `PostSettings.tsx`, `ContentWorkspace.tsx: SITE_LABEL`, `PortEditors.tsx: SITE_NAMES`, `PostHead.tsx`, `DisplaySettings.tsx: SITE_LABELS`). Giá trị site `'blog'` trong DB giữ nguyên.

## [ĐỔI HÀNH VI] Thanh trên beanweirdo: "Thêm mục" có "Trang mới | Trang có sẵn"

- `Detail.tsx: AddSpec.existing` + `AddLine`: khi có `existing`, dòng thêm mở với lựa chọn Trang mới (như cũ: tên + mẫu bibi/bibe/trống) hoặc Trang có sẵn (ô chọn).
- `content.ts: JOURNAL_LINKS`: hai khoá `journal:home` (/journal) và `journal:index` (/journal/muc-luc). Khác trang port, chúng chỉ lên thanh khi được thêm (`navLinks`). Khoá ghi tên màn hình, không ghi địa chỉ, nên đổi tiền tố không cần sửa dữ liệu.
- `ConfigTree.tsx: addLink / dropLink / linkChoices`: chọn trang journal thì thêm khoá vào `site_settings.data.portfolio.header.links`; chọn trang port hay About đang ẩn thì bỏ ẩn. Hàng journal có ⋮ "Gỡ khỏi thanh trên"; bấm hàng mở tab journal.

## Bảng / cột / endpoint

- Ghi: `site_settings.data.portfolio.header.links` qua `PATCH /api/site` (`updateSite`), như công tắc "Hiện trên menu" vốn có. Không DDL.
- Chưa kiểm được dữ liệu thật có còn chuỗi `/personal-blog` gõ tay (khối, bài) hay không: phiên này không có credentials. Câu tìm đưa chủ site chạy.

## Chưa nhìn tận mắt

Khu quản trị cần đăng nhập; phiên từ xa không mở được. Chủ site cần xem Cấu hình › beanweirdo › Mục lục.
