-- 0017: the unclassified bucket is spelled `khác`, not `Khác`.
--
-- The bucket is where an activity lands when the tag it wore was deleted and
-- nothing was chosen to replace it (see 0009 for the two tag systems). It is
-- not a row in `activity_kinds` — it is a literal string in `hour_logs.kind`
-- and `hour_logs.project`, so renaming it means rewriting the rows that carry
-- it rather than updating one record.
--
-- Why: it is drawn in the same row of chips as `đọc`, `thực hành`, `viết` and
-- reads as one of them. Every one of those is lower-case; the capital made the
-- bucket look like a proper noun instead of what it is, the absence of a
-- choice.

update hour_logs set kind = 'khác' where kind = 'Khác';
update hour_logs set project = 'khác' where project = 'Khác';

-- Nothing to guard against on the way back: a journal that has never had a tag
-- deleted holds no rows at all here, and the statements are idempotent.
