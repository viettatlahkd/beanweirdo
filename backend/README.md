# backend

Hai phần:

- `api/` — các hàm serverless trên Vercel. Khu quản trị ghi qua đây, bằng service
  key; trình duyệt không bao giờ cầm key ấy. Gói Hobby cho tối đa 12 hàm, nên
  endpoint mới gộp vào endpoint có sẵn (ví dụ `/api/tags?vocab=authors`).
- `supabase/` — schema. `migrations/` là nguồn sự thật của bảng, RLS và grant;
  `seed.sql` là nội dung mẫu cho một project trống.

Database là Supabase **hosted**. Migration mới do chủ site chạy tay trong SQL
Editor trên dashboard; bảng hoặc hàm mới cần grant rõ ràng cho `service_role`.

## Chạy

```bash
npm test                              # từ gốc repo: lint, typecheck, vitest
node backend/scripts/dev-server.mjs   # API ở máy, đọc backend/.env.local
```

`backend/.env.local` trỏ tới project thật: chạy ở máy vẫn đọc ghi dữ liệu thật.
