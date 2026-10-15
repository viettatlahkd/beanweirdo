# Cột trái trang bài sát lề màn hình — nhánh `claude/config-one-tree-539wvd`

PR: (số PR ở mô tả PR). Không đụng bảng, cột hay endpoint nào.

## [ĐỔI HÀNH VI] Vị trí cột trái (Quay lại + Trong bài này) trên /p/

- Trước (PR #104): cột đứng cách cột chữ 48px, dính đầu bài rồi bám đỉnh màn hình khi cuộn.
- Sau: `frontend/src/screens/PostRail.tsx: rail` là `position: fixed`, cách mép trái màn
  hình `RAIL_EDGE` (32px), giữa màn hình theo chiều dọc. Chủ site yêu cầu 2026-10-15:
  "cho cái phần mục lục sát bên lề trái … căn ở giữa lề trái".
- Cột chỉ hiện khi mép trái cột chữ cách mép màn hình ít nhất 32 + 200 + 32px; không thì
  vẫn là dòng "← Quay lại" phía trên như trước.
