/**
 * Cách một nhãn người dùng gõ trở thành `id` của tag.
 *
 * Tách ra khỏi `api/tags.ts` vì nay có hai đường tạo tag: màn quản lý tag gọi
 * `POST /api/tags`, còn "bài mới" gửi thẳng nhãn kèm bài và để máy chủ tự lo.
 * Hai đường phải sinh ra cùng một `id` cho cùng một nhãn — khác nhau một chữ là
 * cùng một tag nằm ở hai dòng, và bài đeo cái này thì không hiện dưới cái kia.
 */
export function slug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
