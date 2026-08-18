-- 0011: somewhere for a memo to keep its shape.
--
-- A plain note is a title and a paragraph, which `t` and `b` hold fine. A memo
-- is not: it opens with a spec table (bean, water, pour), then a nested outline
-- three levels deep where the indent carries the argument — a tasting sits
-- under the character it belongs to, a caveat under the tasting.
--
-- Flattening that into `b` would lose exactly the part worth keeping, and
-- encoding it as JSON inside a text column meant for prose is the kind of
-- shortcut that reads fine today and traps the next change. So memos get their
-- own column, and plain notes leave it null.

alter table notes add column if not exists body jsonb;

comment on column notes.body is
  'Structured memo content: { specs: [{k, v}], sections: [{h, items}] }. Null for plain notes.';
