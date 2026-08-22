-- ============================================================
-- One World ByME — Overbooking guard
-- Run this ONCE in Supabase Dashboard → SQL Editor.
-- Safe to re-run (idempotent).
--
-- The app already prevents overbooking client-side (full slots fall back to
-- standby). This trigger is the last line of defence against two people
-- confirming the same slot at the exact same moment (a race the client
-- can't catch). It rejects a CONFIRMED booking if the slot is already at
-- capacity for that service.
--
-- Capacities are hard-coded here to match src/lib/constants.js
-- (Pilates Reformer 3, Personal Training 2, Group Training 5).
-- If you change a capacity there, update it here too.
-- ============================================================

create or replace function enforce_booking_capacity()
returns trigger
language plpgsql
as $$
declare
  v_cap   int;
  v_count int;
begin
  -- Only confirmed bookings occupy a real slot; standby/cancelled don't.
  if NEW.status <> 'confirmed' then
    return NEW;
  end if;

  v_cap := case NEW.service
    when 'Personal Training' then 2
    when 'Pilates Reformer'  then 3
    when 'Group Training'    then 5
    else 1
  end;

  select count(*) into v_count
  from bookings
  where booking_date = NEW.booking_date
    and booking_time = NEW.booking_time
    and service      = NEW.service
    and status       = 'confirmed'
    and id <> NEW.id;

  if v_count >= v_cap then
    raise exception 'Slot full: % already has % confirmed booking(s) at % %',
      NEW.service, v_count, NEW.booking_date, NEW.booking_time
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_capacity on bookings;
create trigger trg_enforce_capacity
  before insert or update on bookings
  for each row execute function enforce_booking_capacity();

-- ============================================================
-- ROLLBACK (if needed):
--   drop trigger if exists trg_enforce_capacity on bookings;
--   drop function if exists enforce_booking_capacity();
-- ============================================================
