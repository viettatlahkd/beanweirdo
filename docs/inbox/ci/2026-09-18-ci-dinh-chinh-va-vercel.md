# Đính chính lý do thêm `schedule`, và vì sao Vercel không deploy

- Nhánh: `claude/project-thread-17346l`
- PR: *(chưa mở)*
- Cắt từ: `origin/main` tại `3e7d523`
- Nối tiếp: `docs/inbox/ci/2026-09-18-ci-ba-job-va-eslint.md` (PR #5). File ấy đã
  nộp nên không sửa; mọi đính chính nằm ở đây.

## Các mục

### [SỬA LỖI] Gỡ `schedule` — nó dựa trên một khẳng định sai của tôi

Ghi chú trước và chú thích đầu `ci.yml` khẳng định: *GitHub không khởi động
workflow cho push thực hiện bằng token của GitHub App, nên merge không bao giờ
kiểm được `main`.* **Sai.**

Bằng chứng ngược lại, lấy từ `list_workflow_runs` sau khi PR #5 merge:

| Run | `event` | Nhánh | `triggering_actor` | Kết quả |
|---|---|---|---|---|
| 2 | `push` | `main` (`43d5ceb`) | `claude[bot]` | success |
| 5 | `push` | `main` (`dda06d1`) | `claude[bot]` | success |
| 8 | `push` | `main` (`3e7d523`) | `claude[bot]` | chạy |

Merge do App làm **vẫn** nổ `push`. Kết luận cũ dựng trên hai điểm dữ liệu đều
nằm trước 16:35 UTC — thời điểm repo còn chưa có một run nào của bất cứ
workflow nào — tức là lấy tương quan làm nhân quả.

Vì sao repo nằm im tới 16:35 thì **chưa xác định được**, và ghi chú này không
đoán tiếp.

Đã gỡ: bốn dòng `schedule` trong `ci.yml`, và đoạn chú thích khẳng định sai.
`push: branches: [main]` làm đúng việc của nó.

### [SỬA LỖI] Repo này là một fork — đó là gốc của chuyện Vercel

`GET /repos/norwayiscoming/beanweirdo` trả `fork: true`, `parent` và `source`
đều là **`viettatlahkd/beanweirdo`**.

Nghĩa là mọi thứ ba lane merge hôm nay vào `norwayiscoming/beanweirdo` **chưa
đi đâu cả**. Vercel gắn với repo gốc của chủ site, không gắn với fork:

- `GET /repos/norwayiscoming/beanweirdo/deployments` → **0**. Chưa một lần build.
- `get_status` trên các commit của fork → không có commit status nào.
- `get_check_runs` → đúng bốn job của `ci.yml`, không có dòng Vercel nào.

Hai check đỏ chủ site nhìn thấy — `Vercel – beanweirdo` và
`Vercel – beanweirdo-backend`, lý do *"Authorization required to deploy"* —
nằm trên PR **từ fork sang repo gốc**, tức trên `viettatlahkd/beanweirdo`, chỗ
phạm vi GitHub của phiên này không với tới.

*"Authorization required to deploy"* là đúng cách Vercel xử sự với PR đến từ
một fork: nó **cố tình** không tự build, vì một PR từ fork có thể đọc trộm biến
môi trường của project. Phải có người trong team bấm duyệt. Giả thuyết "commit
mang danh `claude[bot]` nên Vercel không nhận tác giả" mà tôi báo trước đó cũng
cho ra đúng thông điệp này, nên **chưa phân biệt được hai khả năng** — cần đọc
được settings phía Vercel mới chốt, mà connector Vercel không truy cập được từ
đây.

**Hệ quả cần chủ site biết:** merge vào `norwayiscoming/beanweirdo` không đẩy gì
lên production. `beanweirdo.vercel.app` vẫn chạy bản build cũ, kể cả sau khi
PR #1, #2, #3, #5 và #6 đã merge.

Đây **không phải** chuyện `build-rate-limit` mà CLAUDE.md mô tả. Dấu hiệu của
cái đó là đường dẫn lỗi có `upgradeToPro=build-rate-limit`; cái này khác hẳn.

### [SỬA LỖI] `readFileSync` trong bài kiểm: hai chỗ, nay là ba

Commit `43d5ceb` viết "nay chỉ còn hai chỗ". PR #3 thêm
`frontend/src/design/Button.test.tsx`, đọc `frontend/src/admin/admin.css`. Con
số đúng hiện nay là **ba**.

Tôi **giữ** file ấy, không xoá. Nó khác loại với 10 file đã bỏ: những file kia
grep mã nguồn để đoán hành vi mà lẽ ra kiểm được bằng cách chạy mã, còn file
này khẳng định về nội dung một file CSS — thứ không đọc được từ phía React, vì
màu và viền nằm trong `admin.css` chứ không nằm trong component. Lane nút cũng
đã nêu tiền lệ: bản đề xuất đầu của họ để cấp ghost và danger ở
`border: 1px solid transparent`, và chủ site phát hiện trước, không bài kiểm
nào bắt được.

### [Ý KIẾN] `ActivityRow.tsx` — cảnh báo `exhaustive-deps` là đúng luật, sai ý định

Cảnh báo duy nhất còn lại của repo. Lane nút đã đọc và giải thích: effect ấy
chốt bằng `opened.current` chứ không bằng mảng phụ thuộc, nên thêm `t` vào
cũng không đổi hành vi, chỉ tốn vài lượt chạy rỗng.

Để nguyên ở mức cảnh báo. Ghi lại đây để người sau khỏi điều tra lại từ đầu.
Lưu ý `ActivityRow` thuộc mảng Practice/hours, **không** thuộc lane ba màn
quản trị — lane nút đã đính chính điểm này.

## Bảng, cột, endpoint đã đụng

Không đụng cái nào.

## Còn treo — cần chủ site

1. **Merge vào fork không deploy.** Muốn code lên production thì PR phải vào
   `viettatlahkd/beanweirdo`, và ở đó phải bấm duyệt deploy cho từng PR đến từ
   fork, hoặc đổi setting phía Vercel.
2. **Nếu muốn CD tự động**, đường bền là để GitHub Actions deploy bằng
   `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` trong secrets rồi tắt
   Git integration của Vercel — token mang sẵn quyền nên không còn khâu duyệt.
   **Chưa làm**: nó đụng hạ tầng thật, và chủ site đã nói phần CD không cần.
