# Kiểm trong trình duyệt thật

**jsdom không dựng `contenteditable`.** `isContentEditable` trả về `undefined`
và gõ phím vào vùng soạn không sinh ra chữ nào — nên mọi bảo đảm về *gõ tới
đâu render tới đó*, *bôi đen suốt nhiều khối*, và *hoàn tác* không kiểm được
bằng `npm test`.

Giả lập `contenteditable` cho `npm test` xanh thì chỉ chứng minh cái giả lập
chạy. Nên chúng nằm ở đây, chạy trong Chrome thật.

## Chạy

```bash
# 1. Dựng trang thử (xem phần dưới) rồi mở dev server
node_modules/.bin/vite frontend --port 5199

# 2. Cài Playwright ngoài repo — KHÔNG thêm vào package.json
mkdir -p /tmp/bw-e2e && cd /tmp/bw-e2e && npm init -y && npm i playwright

# 3. Chạy
node <đường-dẫn-repo>/tools/e2e/live.mjs
```

## Hai cái bẫy đã gặp

**Playwright không có bản chromium hay firefox cho `mac13-arm64`** — cả hai
lệnh `npx playwright install` đều fail. Dùng Chrome của máy:
`chromium.launch({ channel: 'chrome' })`.

**Đo hộp thì đo khung, đừng đo `span` bên trong.** `getByText` trả về thẻ trong
cùng chứa chữ; một `span` inline trải ba dòng chỉ trả về hộp của mảnh đầu. Hai
lần đã báo nhầm "giật 58.8px" và "43px→81px" chỉ vì đo nhầm thẻ.

## Trang thử

`live.mjs` cần một trang mount `LiveText` ở `/harness.html`. Trang ấy **không
nằm trong repo** — dựng tạm rồi xoá, để không có file chết trong `frontend/`:

```
frontend/harness.html   → <div id="root"></div> + script /src/harness.tsx
frontend/src/harness.tsx → mount <LiveText text="" onCommit={...} />
```
