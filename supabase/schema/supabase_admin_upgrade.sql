-- ============================================================
-- One World ByME — Admin upgrade
-- Run this ONCE in Supabase Dashboard → SQL Editor.
-- Safe to re-run (idempotent).
-- Adds:
--   1) app_settings  → editable hours / plans / closed days
--   2) bookings.attendance → present / no_show tracking
--   3) fixes the bookings status check to allow 'standby'
-- ============================================================

-- ------------------------------------------------------------
-- 1) app_settings : a simple key/value store the admin edits
-- ------------------------------------------------------------
create table if not exists app_settings (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz default now()
);

alter table app_settings enable row level security;

drop policy if exists "select_app_settings" on app_settings;
drop policy if exists "manage_app_settings" on app_settings;

create policy "select_app_settings" on app_settings for select using (true);
create policy "manage_app_settings" on app_settings for all    using (true);

-- Auto-update updated_at
create or replace function touch_app_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_app_settings_touch on app_settings;
create trigger trg_app_settings_touch
before update on app_settings
for each row execute function touch_app_settings_updated_at();

-- Seed with the current defaults (won't overwrite if already set)
-- Weekday (Mon–Fri) hours: 08:00–12:00 & 17:00–22:00
insert into app_settings (key, value) values
  ('time_slots',
   '["08:00","09:00","10:00","11:00","17:00","18:00","19:00","20:00","21:00"]'::jsonb)
on conflict (key) do nothing;

-- Saturday hours: 10:00–12:00
insert into app_settings (key, value) values
  ('saturday_slots', '["10:00","11:00"]'::jsonb)
on conflict (key) do nothing;

-- Recurring closed weekdays (0 = Sunday, JS getDay)
insert into app_settings (key, value) values
  ('closed_weekdays', '[0]'::jsonb)
on conflict (key) do nothing;

insert into app_settings (key, value) values
  ('closed_dates', '[]'::jsonb)
on conflict (key) do nothing;

insert into app_settings (key, value) values
  ('plans',
   '[
     {"name":"Δοκιμαστική","type":"sessions","sessions":1,"days":30,"price":0},
     {"name":"Drop-in","type":"sessions","sessions":1,"days":30,"price":25},
     {"name":"4 Συνεδρίες","type":"sessions","sessions":4,"days":60,"price":90},
     {"name":"8 Συνεδρίες","type":"sessions","sessions":8,"days":90,"price":160},
     {"name":"12 Συνεδρίες","type":"sessions","sessions":12,"days":120,"price":220},
     {"name":"Unlimited 1 μήνα","type":"unlimited","sessions":null,"days":30,"price":130},
     {"name":"Unlimited 3 μήνες","type":"unlimited","sessions":null,"days":90,"price":350},
     {"name":"Unlimited 6 μήνες","type":"unlimited","sessions":null,"days":180,"price":650},
     {"name":"Unlimited Ετήσια","type":"unlimited","sessions":null,"days":365,"price":1200}
   ]'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 2) bookings.attendance : present / no_show (orthogonal to status)
-- ------------------------------------------------------------
alter table bookings
  add column if not exists attendance text;

-- (Re)create the attendance check constraint
alter table bookings drop constraint if exists bookings_attendance_check;
alter table bookings
  add constraint bookings_attendance_check
  check (attendance in ('present','no_show'));

-- ------------------------------------------------------------
-- 3) Fix status check so 'standby' bookings are allowed
--    (the original table did not include 'standby')
-- ------------------------------------------------------------
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings
  add constraint bookings_status_check
  check (status in ('pending','confirmed','cancelled','completed','standby'));
