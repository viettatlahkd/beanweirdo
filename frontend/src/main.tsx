import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './global.css'
import './admin/admin.css'

/**
 * Ba khu: `/` là nhật ký công khai, nhật ký hằng ngày và khu quản trị nằm sau
 * một lần đăng nhập chung. Chúng là ba đường dẫn riêng chứ không phải mấy dòng
 * bị giấu trong sidebar, nên người chưa đăng nhập không có lối nào vào.
 *
 * Khu vực đọc ra từ chính đường dẫn, cùng một chỗ đọc ra màn hình — xem
 * `lib/routes.ts`. Hai chỗ cùng trả lời "đây là khu nào" thì sớm muộn chúng
 * trả lời khác nhau, và khi ấy địa chỉ đúng nhưng trang vẽ ra sai.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
