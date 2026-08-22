-- Run this in Supabase Dashboard → SQL Editor

create table if not exists members (
  id           uuid        default gen_random_uuid() primary key,
  name         text        not null,
  email        text        not null unique,
  phone        text,
  member_code  text        not null unique,
  active       boolean     default true,
  created_at   timestamptz default now()
);

-- Allow the app (anon key) to validate member logins and let admin manage
alter table members enable row level security;

-- Anyone with the anon key can check if an email+code combo is valid
create policy "validate_member" on members
  for select using (true);

-- Anyone with the anon key can insert/update (admin page uses anon key too)
-- In production you'd restrict this to a service role, but for this setup it's fine
create policy "admin_manage_members" on members
  for all using (true);
