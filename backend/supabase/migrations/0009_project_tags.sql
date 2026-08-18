-- 0009: a second way to file an activity.
--
-- Ghi 02 has filed activities by task since it existed — đọc / thực hành /
-- viết / quan sát, "what kind of work was this". That answers what you did but
-- not what it was for, and the two are independent: reading for one project and
-- reading for another are the same task and different work.
--
-- So `activity_kinds` becomes two systems rather than one list, and an activity
-- carries one of each. Two systems in one table rather than two tables: they
-- have identical shape, the same "add one from the page" behaviour, and the
-- same endpoint reads both — a `projects` table would be this one copied.

alter table activity_kinds
  add column if not exists system text not null default 'task'
  check (system in ('task', 'project'));

-- Names were unique outright; now "đọc" as a task and "đọc" as a project are
-- different labels and may coexist.
drop index if exists activity_kinds_name_key;
create unique index if not exists activity_kinds_system_name_key
  on activity_kinds (system, name);

-- Nullable on purpose: not every hour belongs to a project, and forcing one
-- would mean inventing a "no project" project.
alter table hour_logs add column if not exists project text;

create index if not exists activity_kinds_system_idx on activity_kinds (system, sort_order);

insert into activity_kinds (name, system, sort_order) values
  ('Sao đâu', 'project', 1),
  ('Cà củng', 'project', 2)
on conflict (system, name) do nothing;
