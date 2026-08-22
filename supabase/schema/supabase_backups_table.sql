-- ============================================================
-- One World ByME — In-app daily backups
-- Run this ONCE in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- WHAT IT DOES
--   • Creates a `backups` table that stores one JSON snapshot of all
--     business data (bookings, members, subscriptions) per day.
--   • The admin panel auto-creates today's snapshot on load (once/day)
--     and lists the recent ones with a "Download Excel" button.
--   • Only the logged-in admin (Supabase Auth) can read/write backups.
--
-- NOTE: this keeps history *inside* Supabase. For off-site disaster
--       recovery (survives Supabase itself going down) the next step is
--       a weekly email-with-attachment — not covered here.
-- ============================================================

create table if not exists backups (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  -- One snapshot per calendar day; re-running the same day overwrites it.
  snapshot_date date not null unique,
  -- Quick at-a-glance counts so the list renders without parsing the blob.
  bookings_count      int  not null default 0,
  members_count       int  not null default 0,
  subscriptions_count int  not null default 0,
  -- { bookings: [...], members: [...], subscriptions: [...] }
  snapshot      jsonb not null
);

create index if not exists backups_date_idx on backups(snapshot_date desc);

-- ------------------------------------------------------------
-- RLS: only the authenticated admin can touch backups.
-- ------------------------------------------------------------
alter table backups enable row level security;

drop policy if exists "backups_select_admin" on backups;
drop policy if exists "backups_write_admin"  on backups;

create policy "backups_select_admin" on backups
  for select to authenticated using (true);

create policy "backups_write_admin" on backups
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- Housekeeping: keep only the latest 60 daily snapshots.
-- Called by the app after each insert; also safe to run manually.
-- ------------------------------------------------------------
create or replace function prune_backups()
returns void
language sql
security definer
set search_path = public
as $$
  delete from backups
  where id in (
    select id from backups
    order by snapshot_date desc
    offset 60
  );
$$;

-- Only the logged-in admin may prune; never the public anon role.
revoke execute on function prune_backups() from public, anon;
grant  execute on function prune_backups() to authenticated;
