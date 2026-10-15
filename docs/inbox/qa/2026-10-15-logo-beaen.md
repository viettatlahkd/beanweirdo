# Thay logo bằng "beaen"

Nhánh `claude/project-thread-tfn8nd` · PR: xem nhánh này trên GitHub

- [ĐỔI HÀNH VI] Icon tab (`frontend/public/icon-32.png`) và icon màn hình chính iOS (`icon-180.png`) đổi từ logo "bean station" nền xanh #446548 sang cặp chữ "ae" (đen + hồng) của logo mới "beaen", nền kem #FBF8F1. Logo gốc là chữ dài nên icon vuông chỉ cắt phần "ae".
- [ĐỔI HÀNH VI] `frontend/index.html`: `theme-color` #446548 → #FBF8F1; `og:image` `/icon-512.png` → `/og.jpg` (logo "beaen" đầy đủ, 1200×1200).
- [ĐỔI HÀNH VI] Sidebar (`components/Sidebar.tsx`, khối `body`): logo cạnh chữ "beanweirdo" đổi từ `/logo-bean.png` (chữ nhật) sang `/icon-180.png` (vuông 34px, 27px khi thu gọn).
- Đã xoá `frontend/public/logo-bean.png` và `icon-512.png`: không còn chỗ nào tham chiếu.
- Không đụng bảng, cột hay endpoint nào.
