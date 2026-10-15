# Cấu hình: tab ngang theo site, Port và blog chung một khuôn

Nhánh `claude/project-thread-8fq470` · PR mở ngày 2026-10-13 (số PR ghi ở tiêu đề PR).

## [ĐỔI HÀNH VI] Cây Cấu hình tách theo site
- Trước: Port, Bean blog, Practice là ba khối gập được trong một cột cuộn chung.
- Sau: thanh tab ngang Personal Blog | Port | Practice (`SiteTabs` trong `admin/components/SiteTabs.tsx`, dùng chung với `DisplaySettings`), nhớ tab ở `localStorage` khoá `beanweirdo.config.site`. Cây chỉ vẽ site đang chọn.
- Mỗi site khai một `SiteSpec` (`ConfigTree.tsx`): `home`, `toc` (Mục lục), `pages`, `shared` (Phần chung); `siteTree` vẽ chung cho mọi site.
- Tên đổi: "Bean blog" → "Personal Blog" ở breadcrumb; "Hình trang" → card "Phần chung"; port "Các trang port" → "Mục lục", "Phần chung của port" → "Phần chung" (bỏ About, About chuyển vào Mục lục).

## [ĐỔI HÀNH VI] Port: kéo thả Mục lục = thứ tự thanh trên
- Trước: thứ tự link thanh trên kéo trong màn Thanh trên (`ContentTab`, `linkDrag`).
- Sau: kéo ⋮⋮ trong Port › Mục lục (`movePortLink` trong `ConfigTree.tsx`), chỉ trước/sau, không lồng. Ghi `site_settings.data.portfolio.header.links` qua `PATCH /api/site`; giữ label/hidden riêng của từng link và vị trí của link home. Trang nháp/lưu trữ đứng cuối, không kéo được. Màn Thanh trên chỉ còn sửa chữ và ẩn/hiện.
- Không đổi bảng, cột hay migration. Endpoint đụng: `PATCH /api/site` (đã có).

## Kiểm
- `ConfigTree.test.tsx`: thêm hai bài (tab Port, kéo Mục lục port ra đúng `header.links`).
