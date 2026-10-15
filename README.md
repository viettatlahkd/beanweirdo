# beanweirdo

Monorepo.

- [`frontend/`](frontend) — trang công khai và khu quản trị, React + Vite + TypeScript.
- [`backend/`](backend) — API serverless trên Vercel (`backend/api/`) và schema Supabase (`backend/supabase/migrations/`).
- [`packages/post-renderer`](packages/post-renderer) — sáu khuôn bài, dùng chung cho trang đọc và màn soạn.
- [`packages/api-contract`](packages/api-contract) — kiểu dữ liệu chung giữa frontend và backend.

## Chạy

```bash
npm install
npm test        # lint + knip, typecheck, vitest
```

Dev server: xem `.claude/launch.json`. Luật làm việc chung nằm ở `CLAUDE.md`.
