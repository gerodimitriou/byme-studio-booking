-- ============================================================
-- One World ByME — Security upgrade (members table lockdown)
-- Run this ONCE in Supabase Dashboard → SQL Editor.
-- Safe to re-run (idempotent).
--
-- ⚠️  DO NOT RUN THIS YET.
--     The admin login is currently the temporary PIN (anon role). This file
--     locks the members table to the *authenticated* admin, so running it now
--     would hide the members list from the admin. Run it ONLY after the admin
--     login has been switched to Supabase Auth (the final hardening step).
--
-- WHAT IT DOES
--   • Stops anyone with the public anon key from dumping the members
--     table (names, emails, phones AND login codes).
--   • Member login / self-service / standby promotion keep working via
--     SECURITY DEFINER functions (RPCs) that bypass RLS in a controlled way.
--   • Direct read/write of `members` is restricted to the logged-in admin
--     (Supabase Auth — see "ADMIN SETUP" below).
--
-- ORDER OF OPERATIONS (important!)
--   1) Create the admin account first:
--        Dashboard → Authentication → Users → Add user
--        (set email + password, tick "Auto Confirm User").
--   2) Deploy the app and confirm you can log in at /admin/login.
--   3) THEN run this file. (The app already works before AND after this
--      migration thanks to graceful fallbacks, so there is no rush — but
--      do step 1 & 2 first so you don't lock yourself out of the members list.)
--
-- The bookings & subscriptions tables stay readable by the booking flow
-- (they carry no login credentials); only the members table is locked.
-- ============================================================

-- ------------------------------------------------------------
-- 1) RPCs — controlled access for the public (anon) flows
-- ------------------------------------------------------------

-- Login: returns the member row only on an exact email + code match.
create or replace function verify_member_login(p_email text, p_code text)
returns table (id uuid, name text, email text, phone text, member_code text, active boolean)
language sql
security definer
set search_path = public
as $$
  select m.id, m.name, m.email, m.phone, m.member_code, m.active
  from members m
  where lower(m.email) = lower(trim(p_email))
    and m.member_code  = trim(p_code)
    and m.active = true
  limit 1;
$$;

-- Self-service: update own phone and/or code. The current code proves
-- ownership. Returns 'ok' | 'taken' | 'notfound'.
create or replace function update_member_self(
  p_id uuid, p_current_code text, p_phone text, p_new_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_exists boolean;
begin
  select true into v_exists from members where id = p_id and member_code = p_current_code;
  if v_exists is not true then
    return 'notfound';
  end if;

  if p_new_code is not null
     and exists (select 1 from members where member_code = p_new_code and id <> p_id) then
    return 'taken';
  end if;

  update members set
    phone       = coalesce(p_phone,    phone),
    member_code = coalesce(p_new_code, member_code)
  where id = p_id;

  return 'ok';
end;
$$;

-- Standby promotion: look up a member id by email (returns nothing else).
create or replace function member_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from members where lower(email) = lower(trim(p_email)) limit 1;
$$;

-- Let the public flow + admin call these.
grant execute on function verify_member_login(text, text)            to anon, authenticated;
grant execute on function update_member_self(uuid, text, text, text) to anon, authenticated;
grant execute on function member_id_by_email(text)                   to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Lock down the members table
--    Only the authenticated admin can read/write directly.
--    Everyone else goes through the RPCs above.
-- ------------------------------------------------------------
alter table members enable row level security;

drop policy if exists "validate_member"       on members;
drop policy if exists "admin_manage_members"   on members;
drop policy if exists "members_select_admin"   on members;
drop policy if exists "members_write_admin"    on members;

create policy "members_select_admin" on members
  for select to authenticated using (true);

create policy "members_write_admin" on members
  for all to authenticated using (true) with check (true);

-- ============================================================
-- ROLLBACK (only if something goes wrong — re-opens the table)
-- Uncomment and run:
--
-- drop policy if exists "members_select_admin" on members;
-- drop policy if exists "members_write_admin"  on members;
-- create policy "validate_member"     on members for select using (true);
-- create policy "admin_manage_members" on members for all    using (true);
-- ============================================================
