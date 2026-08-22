-- ============================================================
-- One World ByME — Create bookings table
-- Run this FIRST in Supabase Dashboard → SQL Editor
-- Order: 1) this file  2) supabase_subscriptions_table.sql  3) supabase_bookings_subscription_link.sql
-- ============================================================

create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text,
  service      text not null,
  booking_date date not null,
  booking_time text not null,
  status       text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  notes        text,
  created_at   timestamptz not null default now()
);

-- Index for quick lookups by email and date
create index if not exists bookings_email_idx        on bookings(email);
create index if not exists bookings_booking_date_idx on bookings(booking_date);
create index if not exists bookings_status_idx       on bookings(status);

-- RLS: allow public reads and inserts for booking flow
alter table bookings enable row level security;

create policy "Public can insert bookings"
  on bookings for insert to anon, authenticated
  with check (true);

create policy "Public can read bookings"
  on bookings for select to anon, authenticated
  using (true);

create policy "Public can update bookings"
  on bookings for update to anon, authenticated
  using (true);
