# CI ba job và eslint

- Nhánh: `claude/project-thread-17346l`
- PR: *(chưa mở — chờ chủ site duyệt)*
- Cắt từ: `origin/main` tại `3f15954`

## Đã đo trước khi sửa

Trên `main` tại `d46f9c2`, đo ở máy:

| | |
|---|---|
| `npm ci` (có cache) | 9s |
| `npm run typecheck` (ba tsconfig) | 11.8s |
| `vitest run` (124 file, 1241 test) | 45s |
| **`npm test`** | **57s** |
| `vite build` frontend | 3.2s |

Vitest tự báo phân rã: `setup 15.8s, collect 9.8s, tests 27.6s, environment
48.9s, prepare 7.5s` (cộng dồn trên worker). Tức 27.2s là thân test chạy thật,
phần còn lại là phí cố định mỗi file.

**Workflow cũ chưa từng chạy, cho tới 16:35 UTC hôm nay.** Xem mục "Vì sao CI
chưa từng chạy" bên dưới — nguyên nhân đã truy ra, kèm bằng chứng.

## Các mục

### [ĐỔI HÀNH VI] Thêm eslint, chưa từng có trong repo

Thêm `eslint.config.mjs` (flat config): `@eslint/js` recommended,
`typescript-eslint` recommended, `eslint-plugin-react-hooks` recommended.

- Trước: repo không có linter nào. Sau: `npm run lint` chạy 5.1s, 0 lỗi.
- **Không bật type-aware linting.** Nó dựng lại cả TypeScript program, đắt gấp
  3–4 lần, mà job `types` đã chạy `tsc --noEmit` cho cả ba tsconfig rồi.
- `@typescript-eslint/no-explicit-any` để `off`: `any` đang gánh việc ở ranh
  giới Supabase và Vercel, chỗ hình dạng payload không do repo này khai.
- `linterOptions.reportUnusedDisableDirectives` để `off`: vì luật trên tắt,
  các comment `eslint-disable` sẵn có trong `frontend/src/content/site.ts`,
  `frontend/src/lib/supabaseClient.ts` và
  `packages/post-renderer/src/elements/registry.ts` sẽ bị báo là thừa. Đó là
  file của lane khác nên không đụng.
- `frontend/design/**` bị ignore: `frontend/design/prototype/support.js` là
  file sinh tự động ("GENERATED from dc-runtime/src/*.ts — do not edit"),
  một mình nó ra 86 lỗi `no-undef`.

### [SỬA LỖI] Sáu lỗi eslint có thật, đã sửa

Đều là biến/import khai mà không dùng, trong file test:

- `backend/lib/auth.test.ts`, trong `it('rejects a tampered payload')`:
  `const [payloadB64, sig]` → `const [, sig]`. `payloadB64` khai rồi bỏ đó.
- `frontend/src/admin/screens/Editor.structure.test.tsx`: bỏ ba import không
  dùng — `screen`, `userEvent`, `GRIP_LABEL`.
- `packages/post-renderer/src/mobile.test.tsx`: bỏ import `screen`.
- `frontend/src/screens/Landing.mobile.test.ts`, trong
  `it('hở dưới phần chữ hẹp lại ở màn nhỏ…')`: regex có hai dấu cách liền,
  đổi thành `{2}` theo luật `no-regex-spaces`. Nghĩa không đổi.

Không sửa logic của file nào, chỉ bỏ thứ không dùng.

### [ĐỔI HÀNH VI] `vitest.config.ts`: environment mặc định `node`, jsdom có chọn lọc

- Trước: `environment: 'jsdom'` cho cả 125 file.
- Sau: `environment: 'node'`, và `environmentMatchGlobs` bật jsdom cho
  `**/*.test.tsx`, `frontend/src/data/**/*.test.ts`,
  `frontend/src/lib/use*.test.ts`, `frontend/src/admin/lib/*.test.ts`,
  `frontend/src/admin/components/*.test.ts`,
  `frontend/src/lib/mediaShape.test.ts`, `frontend/src/lib/routeWords.test.ts`,
  `packages/post-renderer/src/elements/*.test.ts`.
- Đo được: `environment` 48.9s → 28.5s, `setup` 15.8s → 9.4s, tường 45s → 36s.
- Cả 125 file vẫn xanh, 1243 test pass, 2 skip — y như trước.
- Lỗi khi thiếu jsdom là `document is not defined`, to và rõ, không âm thầm.

### [ĐỔI HÀNH VI] `vitest.setup.ts` chỉ chạy khi có DOM

Bọc toàn bộ thân file trong `if (typeof document !== 'undefined')` và chuyển
sang `await import`. Trước đó `@testing-library/react` được import cho cả 125
file kể cả file chạy ở `node`, không dùng đến.

### [ĐỔI HÀNH VI] `.github/workflows/test.yml` → `.github/workflows/ci.yml`, ba job song song

- Trước: một job chạy `npm test`, tức typecheck **rồi mới** vitest, nối tiếp.
  Đo trên runner thật: **96 giây** (run 35369414625, PR #3, xanh).
- Sau: ba job `lint` / `types` / `test` chạy song song, mỗi job `npm ci` riêng
  với `cache: npm`. Thời gian tường = job chậm nhất, không phải tổng.
- Giữ nguyên `concurrency` + `cancel-in-progress` của workflow cũ.

### [ĐỔI HÀNH VI] Job `test` chia hai shard

`npm run test:unit -- --shard=N/2`, chạy bằng `strategy.matrix`.

- Đo trên 128 file: một job 36.7s; hai shard 17.8s và 20.5s. Vitest tự chia
  theo file nên hai nửa cân nhau mà không phải liệt kê đường dẫn.
- **Cố tình không tách theo thư mục.** Tách theo đường dẫn thì một file test
  mới nằm ngoài các đường dẫn đó sẽ bị bỏ sót, và bỏ sót âm thầm. `--shard`
  chia theo toàn bộ danh sách file nên không có khe nào lọt.
- `fail-fast: false` để shard này đỏ không giết shard kia — cần thấy cả hai.

### [ĐỔI HÀNH VI] Thêm `schedule` và `workflow_dispatch`

`schedule` nhìn như thừa bên cạnh `push: branches: [main]`, nhưng không thừa —
lý do ở mục dưới. Cron `0 1 * * *`, tức 08:00 giờ Hà Nội.

### [ĐỔI HÀNH VI] Script trong `package.json`

- `lint`: `eslint .` *(mới)*
- `typecheck`: giữ nguyên
- `test:unit`: `vitest run` *(mới, cho job `test` của CI)*
- `test`: trước là `typecheck && vitest run`, nay là
  `lint && typecheck && vitest run` — cổng đầy đủ khi chạy ở máy.

### [ĐỔI HÀNH VI] Xoá 10 file test, tỉa 3 file

Chủ site chốt danh sách lúc 16:43 ngày 2026-09-18.

**Xoá cả file — đọc mã nguồn bằng regex thay vì chạy mã (5 file):**

- `frontend/src/lib/rulesOfHooks.test.ts` — dò hook đứng sau `return` bằng lề
  chữ. Chính file này ghi "dự án không có eslint, nên luật này không có ai canh
  ngoài chỗ này". Nay có `react-hooks/rules-of-hooks` đọc AST, nên nó thừa.
  **Luật vẫn được canh, chặt hơn trước.**
- `frontend/src/lib/templateModel.test.ts` — kiểm văn xuôi trong `logic.ts`.
- `frontend/src/screens/siteCopyReach.test.ts`
- `frontend/src/screens/prose.test.ts`
- `frontend/src/lib/brand.test.ts` — kiểm file PNG có trên đĩa.

**Xoá cả file — khoá con số CSS (5 file):**

- `packages/post-renderer/src/Memo.design.test.tsx` — `80px`, `34px`, màu cụ thể
- `packages/post-renderer/src/mobile.test.tsx`
- `frontend/src/content/notes.mobile.test.ts`
- `frontend/src/screens/Landing.mobile.test.ts`
- `frontend/src/screens/ImageBand.mobile.test.tsx`

**Tỉa một phần — bỏ chỗ đọc nguồn, giữ chỗ kiểm hành vi (3 file):**

- `frontend/src/screens/ModuleScreen.plates.test.ts` — bỏ cả
  `describe('chú thích ảnh trên trang module')` (chỉ grep `ModuleScreen.tsx`)
  và ba dòng đọc nguồn trong `describe('tiêu đề module dài')`. **Giữ** phần
  kiểm `wrapTitle.hyphens`, `wrapTitle.hyphenateLimitChars`, `PLATE_WIDTH`,
  `PLATE_HEIGHT` và `plateRatio` — đó là tính toán thật.
- `frontend/src/lib/postToRenderer.test.ts` — bỏ
  `it('the API answers in the database's own field names')`, chỗ đọc
  `backend/lib/posts.ts` rồi bóc interface bằng regex. **Giữ** toàn bộ phần
  chuyển đổi và phần màu.
- `frontend/src/lib/postThumbFocus.test.ts` — bỏ
  `it('không chỗ nào vẽ ảnh bài bằng center/cover viết tay nữa')`. **Giữ**
  `it('coverStyle đọc điểm căn từ đường dẫn')`.

Sau khi xoá, `readFileSync` trong file test chỉ còn ở hai chỗ, đều cố ý giữ:
`packages/post-renderer/src/templateContract.test.ts` (luật **09.10**) và
`backend/api/integration.test.ts`.

**Xoá bao nhiêu test, được bao nhiêu thời gian:** 128 file → 118 file,
1291 test → 1216 test. `test:unit` từ 36.7s xuống **35.4s**.

Tức là **1,3 giây**. Đúng như đã báo trước khi xoá: các file này giòn chứ không
chậm. Lý do xoá là chúng đỏ khi đổi tên biến hay đổi một con số thiết kế, trong
khi hành vi không sai — không phải vì chúng tốn thời gian.

## Vì sao CI chưa từng chạy — đã truy ra

GitHub **không** khởi động workflow cho một push thực hiện bằng token của
GitHub App. Mọi lần merge ở repo này đều do App `claude[bot]` làm. Hai commit
cạnh nhau cho thấy rõ:

| Commit | Committer | Kết quả |
|---|---|---|
| `3f15954` (merge vào `main`) | `claude[bot]`, id 209825114 | **không có run nào** |
| `c5678d3` (PR #3, push từ sandbox) | `claude`, id 81847 | **run 1, xanh** |

Nên `push: branches: [main]` chỉ nổ khi người thật push, và **không bao giờ nổ
khi merge**. Hệ quả: mọi thứ đã vào `main` từ trước tới nay chưa từng được CI
kiểm sau merge.

`schedule` vá đúng lỗ này: run theo lịch do chính GitHub khởi động, không đi
qua token nào, nên luôn nổ. `pull_request` vẫn là cổng chính trước merge.

Giả thuyết ban đầu của tôi — "Actions bị tắt trong Settings" — **sai**. Actions
vẫn bật; PR #3 chứng minh điều đó.

## Đo lại sau khi sửa

Đo trên `main` tại `3f15954` (128 file, 1291 test), cùng container:

| Job | Thời gian | Kết quả |
|---|---|---|
| `npm run lint` | 5.0s | 0 lỗi, 1 cảnh báo |
| `npm run typecheck` | 11.3s | xanh |
| `npm run test:unit` | 35.4s | 118 file, 1216 pass, 2 skip |
| `npm run test:unit -- --shard=1/2` | 17.6s | 59 file |
| `npm run test:unit -- --shard=2/2` | 19.9s | 59 file |

So sánh cùng điều kiện, cùng 128 file, chưa xoá gì: cấu hình **cũ 46.4s**,
cấu hình **mới 36.7s**. Xoá 10 file rồi thì còn 35.4s.

Tường CI ở máy = `npm ci` + shard chậm nhất ≈ 9 + 19.9 ≈ **29s**.

Quy đổi ra runner: pipeline cũ đo ở máy 66s mà chạy thật mất 96s, tức runner
chậm hơn khoảng **1.45 lần**. Áp tỉ lệ đó lên 29s ra **khoảng 42 giây**. Đây là
phép ngoại suy từ một điểm dữ liệu, không phải số đo — phải có một run thật
của `ci.yml` mới chốt được.

## Đối chiếu bộ luật (`logic.ts`)

Luật **09.10** ("Thêm một template mới là phải sửa đủ ba nơi… nên có một kiểm
tra tự động so chúng với nhau") nói tới
`packages/post-renderer/src/templateContract.test.ts`. Bản sửa này **giữ
nguyên** file đó, và danh sách đề nghị xoá cũng liệt nó vào nhóm giữ. Không có
mâu thuẫn với luật nào.

## Bảng, cột, endpoint đã đụng

Không đụng bảng, cột hay endpoint nào. Thay đổi nằm hết ở cấu hình pipeline và
import trong file test.

## Còn treo — cần chủ site

1. **Phần CD không đo.** Chủ site nói không cần, nên mục tiêu "CI + CD < 60s"
   ở đây chỉ chứng minh nửa CI. Connector Vercel cũng không truy cập được từ
   phiên này.
2. **`schedule` là thứ tôi tự thêm**, không nằm trong yêu cầu ban đầu. Lý do ở
   mục trên. Một run mỗi ngày; không muốn thì xoá bốn dòng.

## Đề xuất luật (ý kiến, chưa làm)

- Nếu một run thật vẫn vượt 60s, đòn bẩy kế tiếp là nâng số shard lên 3 hoặc
  4 — chỉ sửa một dòng `matrix`. Nhưng mỗi shard trả thêm ~9s `npm ci`, nên
  quá 3 shard là lỗ.
- `npm ci` chiếm 9s trong mỗi job, tức phần cố định lớn nhất còn lại. Nếu muốn
  bớt nữa thì cache `node_modules` giữa các job bằng một artifact, thay vì mỗi
  job cài lại. Chưa làm vì nó đổi cách cả bốn job khởi động, đáng một PR riêng.
- `frontend/src/components/ActivityRow.tsx:535` có cảnh báo
  `react-hooks/exhaustive-deps` (thiếu `t` trong mảng phụ thuộc). Là file của
  lane khác và sửa mảng phụ thuộc có thể đổi hành vi, nên để nguyên ở mức
  cảnh báo. Lane sở hữu file nên xem.
