-- ============================================================
-- One World ByME — Group schedule, one-off blocking, cancel
-- outcome, and medical-certificate issue-date upgrade.
-- Applied 2026-06-03 (via MCP migrations). Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Bookings: cancellation outcome + group workout type
-- ------------------------------------------------------------
-- cancel_outcome drives the member's history color:
--   null = active · 'refunded' (early cancel, session returned)
--   'kept' (late cancel within 5h, session lost → shown red) · 'none'
alter table public.bookings add column if not exists cancel_outcome text;

-- For Group Training: the workout type booked (upper|lower|full|hiit),
-- stamped at booking time so the admin sees exactly what was booked.
alter table public.bookings add column if not exists session_type text;

-- ------------------------------------------------------------
-- 2) Medical certificates: validity from the real ISSUE date
-- ------------------------------------------------------------
-- A cert carries a real issue date (often before upload). Validity is
-- 12 months from that date, so a cert issued a month ago is re-requested
-- after 11 months, not 12.
alter table public.medical_certificates add column if not exists issued_at date;

drop function if exists public.my_medical_certificate(uuid);
drop function if exists public.add_medical_certificate(uuid, text);

create or replace function public.add_medical_certificate(
  p_member_id uuid,
  p_file_path text,
  p_issued_at date default null
)
returns table(id uuid, uploaded_at timestamptz, expires_at timestamptz, issued_at date)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_issued date := coalesce(p_issued_at, current_date);
begin
  if not exists (select 1 from members where members.id = p_member_id) then
    raise exception 'unknown member';
  end if;
  if v_issued > current_date then v_issued := current_date; end if;
  if v_issued < current_date - interval '2 years' then v_issued := current_date; end if;

  return query
  insert into medical_certificates (member_id, file_path, issued_at, expires_at)
  values (p_member_id, p_file_path, v_issued, (v_issued + interval '12 months'))
  returning medical_certificates.id, medical_certificates.uploaded_at,
            medical_certificates.expires_at, medical_certificates.issued_at;
end;
$function$;

revoke execute on function public.add_medical_certificate(uuid, text, date) from public;
grant  execute on function public.add_medical_certificate(uuid, text, date) to anon, authenticated;

create or replace function public.my_medical_certificate(p_member_id uuid)
returns table(uploaded_at timestamptz, expires_at timestamptz, issued_at date)
language sql
security definer
set search_path to 'public'
as $function$
  select uploaded_at, expires_at, issued_at
  from medical_certificates
  where member_id = p_member_id
  order by uploaded_at desc
  limit 1;
$function$;

revoke execute on function public.my_medical_certificate(uuid) from public;
grant  execute on function public.my_medical_certificate(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) app_settings: weekly Group schedule + one-off blocked slots
-- ------------------------------------------------------------
-- group_schedule: { "<weekday 0..6>": { "HH:MM": "full|lower|upper|hiit" } }
-- blocked_slots:  [ { "date":"YYYY-MM-DD", "time":"HH:MM", "service":"..." } ]
-- These are edited from admin Settings; the seed below mirrors the studio's
-- printed Group timetable (weekday: 1=Mon … 6=Sat).
insert into public.app_settings (key, value) values
('group_schedule', '{
  "1": {"09:00":"full","10:00":"upper","17:00":"lower","18:00":"hiit","19:00":"full","20:00":"full","21:00":"upper"},
  "2": {"09:00":"full","10:00":"hiit","11:00":"full","17:00":"full","18:00":"upper","20:00":"lower","21:00":"full"},
  "3": {"09:00":"upper","10:00":"lower","17:00":"hiit","18:00":"full","19:00":"upper","20:00":"full","21:00":"lower"},
  "4": {"17:00":"full","18:00":"lower","20:00":"upper","21:00":"full"},
  "5": {"09:00":"lower","10:00":"full","17:00":"upper","18:00":"full","19:00":"full","20:00":"lower","21:00":"hiit"},
  "6": {"12:00":"full","13:00":"hiit"}
}'::jsonb),
('blocked_slots', '[]'::jsonb),
-- pilates_schedule: { "<weekday 0..6>": ["HH:MM", …] } — available Pilates hours
-- per day (the studio's blue-cell timetable). Authoritative when non-empty.
('pilates_schedule', '{
  "1": ["08:00","09:00","10:00","17:00","18:00","19:00","20:00","21:00"],
  "2": ["09:00","10:00","17:00","19:00"],
  "3": ["11:00","18:00","19:00","20:00","21:00"],
  "4": ["08:00","09:00","10:00","19:00","20:00","21:00"],
  "5": ["11:00","17:00","18:00","19:00","20:00"],
  "6": ["10:00","11:00","12:00","13:00"]
}'::jsonb)
on conflict (key) do nothing;
