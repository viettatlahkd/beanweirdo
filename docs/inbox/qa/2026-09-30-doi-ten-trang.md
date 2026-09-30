# Đổi tên trang trên tab trình duyệt

PR: (điền khi mở)    nhánh: claude/rename-site-title-dgbl4o
Nguồn: chủ site, 2026-09-30: "hiện tại trang web đang tên là beanweirdo a coffe journal … cái tên cục bộ với favicon … đổi thành -> beanweirdo - a weirdo's study journal".

## Đã làm

- [ĐỔI HÀNH VI] `frontend/index.html`: `<title>` và `og:title` đổi từ "beӕn weirdo — a coffee study journal" thành "beanweirdo - a weirdo's study journal". Đây là tên trên tab cạnh favicon và tiêu đề khi chia link.

## Không đụng

- Không có code nào đặt `document.title`, không có web manifest, không bảng hay cột nào giữ tên này — tên chỉ nằm trong `index.html`, nên không có giá trị trong DB đè lên.
- Chữ trên trang chủ vẫn giữ: `content/site.ts:SITE_DEFAULTS` có `lEyebrow` "coffee study journal — 2024 / 2026" và `lTitle1` "beӕn weirdo", chủ site sửa được trong /ad-config.
