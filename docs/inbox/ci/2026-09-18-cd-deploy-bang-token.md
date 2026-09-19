# CD: deploy bằng token, bỏ phụ thuộc Git integration của Vercel

- Nhánh: `claude/project-thread-17346l`
- PR: *(chưa mở)*
- Cắt từ: `origin/main` tại `d42aa72`
- Nối tiếp: `2026-09-18-ci-ba-job-va-eslint.md` (PR #5) và
  `2026-09-18-ci-dinh-chinh-va-vercel.md` (cùng nhánh này)

## Vì sao

Vercel chưa từng deploy repo này. Repo là **fork** của
`viettatlahkd/beanweirdo`, và hai project Vercel nhìn repo gốc.
`GET /repos/norwayiscoming/beanweirdo/deployments` trả `[]`.

Chủ site chốt đường đi lúc 17:14: bỏ phụ thuộc vào Git integration, để GitHub
Actions deploy bằng token. Token mang sẵn quyền nên không còn khâu duyệt, và
deploy đi thẳng từ fork.

## Các mục

### [ĐỔI HÀNH VI] Hai job `deploy-frontend` và `deploy-backend`

Thêm vào `.github/workflows/ci.yml`.

- `needs: [lint, types, test]` — không deploy code chưa qua kiểm.
- `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` — PR
  không deploy. Secret cũng không đến được workflow chạy từ fork PR, nên đây
  vừa là ý muốn vừa là ràng buộc.
- `concurrency` riêng mỗi project, **`cancel-in-progress: false`**. Commit mới
  hơn nên thắng, nhưng không bằng cách giết một lần deploy đang dở — deploy nửa
  chừng tệ hơn là cũ một lúc.

### [ĐỔI HÀNH VI] `.github/scripts/vercel-deploy.sh`

Ba lệnh `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`.

`vercel pull` kéo về **cả settings lẫn biến môi trường** của project, nên build
không cần `frontend/.env.local` — file ấy không có trong repo.

Chạy từ gốc repo chứ không `cd` vào `frontend/` hay `backend/`: đó là đúng cách
Vercel tự làm, nó clone cả repo rồi áp `rootDirectory` của project. Script
`rm -rf .vercel` trước mỗi lần, vì link còn sót của project trước sẽ âm thầm
deploy nhầm thứ.

### [ĐỔI HÀNH VI] Không dùng `VERCEL_ORG_ID`

Chủ site nói rõ không lấy org id. Vercel CLI thì không chịu chạy khi chưa link,
mà link thì thường cần org id cạnh project id.

Cách đi vòng: với **tài khoản cá nhân, org id chính là id tài khoản**, và token
đã định danh tài khoản rồi. Script gọi
`GET https://api.vercel.com/v2/user`, lấy `user.id`, export thành
`VERCEL_ORG_ID`. Không ai phải chép gì từ dashboard, và bớt được một secret
phải giữ đồng bộ.

`curl -fsS` chứ không phải `curl -sS`: để 401 hỏng ngay tại đây kèm câu nói rõ,
thay vì đẩy xuống thành một lỗi khó hiểu của CLI ở bước sau.

## Secret đang trông đợi

| Tên | Dùng ở đâu |
|---|---|
| `VERCEL_TOKEN` | cả hai job |
| `VERCEL_PROJECT_ID_FRONTEND` | `deploy-frontend` |
| `VERCEL_PROJECT_ID_BACKEND` | `deploy-backend` |

**Chưa xác minh được ba tên này.** `GET /repos/.../actions/secrets` bị proxy của
sandbox chặn (*"Access to this GitHub Actions path is not permitted through this
proxy"*), nên tôi dùng đúng tên đã được báo. Lệch một chữ thì job dừng ngay ở
bước đầu với câu nói rõ tên nào đang rỗng, chứ không chạy tiếp rồi hỏng mơ hồ.

## Bảng, cột, endpoint đã đụng

Không đụng bảng hay cột nào. Có gọi một endpoint ngoài: `GET /v2/user` của
Vercel API, chỉ đọc, chỉ lấy `user.id`.

## Chưa kiểm được

**Chưa chạy thử lần nào.** Container này không có `VERCEL_TOKEN` — nó là secret
của repo, không phải biến môi trường của sandbox. Cái kiểm được đã kiểm:
`bash -n` sạch, YAML parse được, năm job đúng tên và đúng quan hệ `needs`,
`npm run lint` xanh.

Lần chạy đầu trên `main` chính là phép thử. Ba chỗ dễ hỏng nhất, theo thứ tự:

1. Tên secret lệch → dừng ở bước đầu, thông báo nói rõ.
2. `rootDirectory` của project Vercel không trỏ vào `frontend/` và `backend/`
   như giả định → `vercel build` build nhầm chỗ.
3. `post-renderer` là workspace package; nếu project frontend cấu hình install
   chỉ trong `frontend/` thì nó không resolve được.

## Ảnh hưởng tới mục tiêu "CI + CD < 60s"

**Không còn dưới 60 giây nữa, và đó là chủ ý.** Deploy `needs` ba job kiểm, nên
nó chạy *sau* chứ không song song: CI ~42s rồi mới tới deploy. Muốn giữ dưới 60s
thì phải deploy song song với test, tức là deploy code chưa qua kiểm. Tôi chọn
đúng thay vì nhanh, và nêu ra đây để chủ site biết mình đang đánh đổi cái gì.

## Còn treo

- `schedule` đã gỡ trong cùng nhánh này, lý do ở ghi chú đính chính bên cạnh.
- Sau khi CD chạy được, nên tắt Git integration của Vercel ở repo gốc, không thì
  hai đường deploy cùng tồn tại. Việc ấy nằm trong dashboard của chủ site.
