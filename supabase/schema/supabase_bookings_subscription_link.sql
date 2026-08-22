-- ============================================================
-- One World ByME — Link bookings to subscriptions + unique member name
-- Run this in Supabase Dashboard → SQL Editor
-- (Run supabase_subscriptions_table.sql first if you haven't already)
-- ============================================================

-- 1) Add subscription_id to bookings so each booking knows which sub it consumed
alter table bookings
  add column if not exists subscription_id uuid references subscriptions(id) on delete set null;

create index if not exists bookings_subscription_id_idx on bookings(subscription_id);

-- 2) Enforce unique member names (case-insensitive)
-- If there are existing duplicates this will fail — clean them first.
create unique index if not exists members_name_unique_idx
  on members (lower(trim(name)));

-- 3) Backfill nothing — legacy bookings stay with subscription_id = null
-- These pre-existing bookings don't decrement any subscription.

-- 4) Helper view REMOVED.
-- The old `bookings_full` view exposed member_code (login codes) + member PII
-- through the public API and showed as "Unrestricted" in Supabase. It was
-- never used by the app, so we drop it instead of recreating it.
drop view if exists bookings_full;
