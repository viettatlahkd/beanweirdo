-- 0006: grant table-level privileges to anon/authenticated/service_role.
--
-- Found while wiring up the admin app: RLS policies alone are not enough —
-- Postgres checks the table-level GRANT before it ever evaluates a row-level
-- security policy. Every previous migration created tables as the "postgres"
-- role, and this project never issued an explicit GRANT, so anon/authenticated/
-- service_role had none of SELECT/INSERT/UPDATE/DELETE on any public table
-- (confirmed against a live PostgREST call: `permission denied for table posts`,
-- 42501, even though the "posts are publicly readable" policy is correct).
-- service_role has BYPASSRLS but still needs the table grant to be usable at
-- all — the admin backend authenticates with the service_role key, so this
-- was blocking every admin API call, not just the public read path.

-- Public, unauthenticated reads: posts/modules only, gated further by RLS.
grant select on modules, posts to anon;

-- authenticated mirrors anon for the public tables, and owns the personal
-- journal tables (RLS scopes rows to the signed-in user).
grant select on modules, posts to authenticated;
grant all on activity_kinds, hour_logs, notes to authenticated;

-- service_role bypasses RLS entirely (admin backend) — needs full access to
-- everything it might manage.
grant all on modules, posts, activity_kinds, hour_logs, notes to service_role;
