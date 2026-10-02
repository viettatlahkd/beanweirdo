-- Quy chế nhóm được theo subject.
--
-- Chủ site muốn trang Ghi chia nhóm art và philo (2026-10-02): đó là subject,
-- không phải topic — một bài nằm ở topic "book & film" thuộc nhóm art. Nhóm theo
-- topic (đã có) tách nó thành "book & film"; nhóm theo subject gom mọi topic về
-- subject của chúng.
--
-- Chỉ nới ràng buộc, không đổi dòng nào. Số hiệu 0029: 0028 là migration cuối đã có.

alter table public.listing_rules drop constraint if exists listing_rules_group_by_check;
alter table public.listing_rules add constraint listing_rules_group_by_check
  check (group_by in ('none', 'subject', 'topic', 'keyword', 'kind', 'year'));
