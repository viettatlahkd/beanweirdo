/**
 * Điểm căn của một tấm ảnh — nay định nghĩa ở gói renderer.
 *
 * Chỗ vẽ ảnh nhiều nhất là các khuôn bài, mà gói `post-renderer` không import
 * được từ `frontend/`. Để hàm này bên `frontend` nghĩa là các khuôn bài không
 * với tới, và đó đúng là chuyện đã xảy ra: bốn ô ảnh của article cùng ô ảnh
 * từng phần tự viết `background-image` bằng tay, không đọc điểm căn.
 *
 * Tệp này ở lại làm cửa cũ cho hơn hai mươi chỗ gọi trong app, để bản dọn ấy
 * không phải sửa từng chỗ một.
 */
export { CENTRE, coverStyle, cropStyle, readCrop, readFocus, stripFocus, withCrop, withFocus } from 'post-renderer'
export type { Focus } from 'post-renderer'
