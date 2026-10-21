-- 0039_explicit_data_api_grants.sql
--
-- Explicit Data API grants on every table and sequence in `public`.
--
-- Until 2026-10-30 Supabase granted `anon`, `authenticated` and `service_role`
-- access to every new table in `public` automatically, through default
-- privileges. Not one migration before this one grants table access, so the
-- schema only ever worked because of that default. From that date a table
-- created in `public` gets no grants, and PostgREST answers 42501
-- ("permission denied") until it is granted explicitly.
--
-- The tables already on the linked project keep the grants they were created
-- with, so there this migration changes nothing. It matters wherever the
-- schema is rebuilt from these files — a new (e.g. production) project, a
-- preview branch, `supabase db reset` — where without it every table would be
-- unreachable through supabase-js.
--
-- Access control is still RLS, which every table in `public` has enabled.
-- These grants only let a request reach the policies at all. `anon` gets
-- SELECT alone because no policy anywhere lets a signed-out visitor write.
--
-- Sequences need USAGE because column defaults call `nextval()` as the
-- inserting role: a student creating a purchase runs
-- `next_purchase_readable_id()`, which is not SECURITY DEFINER.
--
-- Functions are deliberately left alone. Postgres grants EXECUTE to PUBLIC by
-- default, which this change does not touch, and the helpers that should not
-- be public already revoke that and grant exactly the roles they mean to
-- (0002, 0013, 0016, 0017, 0026). A blanket grant here would undo them.
--
-- A table added after this migration needs its own grants, in the migration
-- that creates it — `on all tables` only covers what exists when it runs.

grant select
  on all tables in schema public
  to anon;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated, service_role;

grant usage, select
  on all sequences in schema public
  to authenticated, service_role;
