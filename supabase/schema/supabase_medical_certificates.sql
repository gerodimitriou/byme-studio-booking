-- ============================================================
-- One World ByME — Medical certificates (χαρτί γιατρού)
-- Run this ONCE in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- WHAT IT DOES
--   • Members upload a doctor's certificate (photo/PDF) from /me.
--   • Each upload is valid for 1 year (expires_at = uploaded + 365d).
--   • The admin sees, per member, the latest certificate + status
--     (valid / expiring / expired / missing) and can open the file.
--   • Booking is NOT blocked when missing/expired — it's informational only.
--
-- SECURITY MODEL (matches the rest of the app)
--   • Members are NOT Supabase-authenticated (they log in via RPC with the
--     anon key). So member-side writes/reads go through SECURITY DEFINER
--     RPCs — never direct table access.
--   • The actual files live in a PRIVATE storage bucket. Only the
--     authenticated admin can read them (via signed URLs). Members can
--     upload but cannot list/download others' files.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Table: one row per upload (history kept; latest = newest).
-- ------------------------------------------------------------
create table if not exists medical_certificates (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  file_path   text not null,            -- path inside the storage bucket
  uploaded_at timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '1 year')
);

create index if not exists medcert_member_idx on medical_certificates(member_id, uploaded_at desc);

alter table medical_certificates enable row level security;

-- Only the authenticated admin reads/writes the table directly.
drop policy if exists "medcert_admin_all" on medical_certificates;
create policy "medcert_admin_all" on medical_certificates
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 2) RPCs for the (anon) member side.
-- ------------------------------------------------------------

-- Record an upload. The file itself is already in storage at p_file_path.
-- Sets expiry to one year out. Returns the new row.
create or replace function add_medical_certificate(p_member_id uuid, p_file_path text)
returns table (id uuid, uploaded_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Guard: the member must exist (prevents junk rows for random ids).
  if not exists (select 1 from members where members.id = p_member_id) then
    raise exception 'unknown member';
  end if;

  return query
  insert into medical_certificates (member_id, file_path)
  values (p_member_id, p_file_path)
  returning medical_certificates.id, medical_certificates.uploaded_at, medical_certificates.expires_at;
end;
$$;

-- A member's latest certificate status (no file_path leaked).
create or replace function my_medical_certificate(p_member_id uuid)
returns table (uploaded_at timestamptz, expires_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select uploaded_at, expires_at
  from medical_certificates
  where member_id = p_member_id
  order by uploaded_at desc
  limit 1;
$$;

grant execute on function add_medical_certificate(uuid, text) to anon, authenticated;
grant execute on function my_medical_certificate(uuid)        to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Private storage bucket + policies.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('medical-certificates', 'medical-certificates', false)
on conflict (id) do nothing;

-- Anyone with the anon key may UPLOAD (members aren't authenticated).
-- Mirrors the app's existing "public can insert bookings" posture; the
-- bucket is private so uploaded files are never publicly listable.
drop policy if exists "medcert_upload" on storage.objects;
create policy "medcert_upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'medical-certificates');

-- Only the authenticated admin may READ/DOWNLOAD (sign URLs).
drop policy if exists "medcert_admin_read" on storage.objects;
create policy "medcert_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'medical-certificates');

-- Admin may delete/replace.
drop policy if exists "medcert_admin_delete" on storage.objects;
create policy "medcert_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'medical-certificates');
