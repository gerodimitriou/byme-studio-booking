-- ============================================================
-- One World ByME — Subscriptions schema
-- Run this once in Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists subscriptions (
  id              uuid          primary key default gen_random_uuid(),
  member_id       uuid          not null references members(id) on delete cascade,
  plan_name       text          not null,
  plan_type       text          not null check (plan_type in ('sessions','unlimited')),
  sessions_total  int,
  sessions_used   int           default 0,
  price           numeric(10,2),
  start_date      date          not null,
  end_date        date          not null,
  status          text          not null default 'active' check (status in ('active','expired','cancelled')),
  notes           text,
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

create index if not exists subs_member_id_idx on subscriptions(member_id);
create index if not exists subs_status_idx    on subscriptions(status);
create index if not exists subs_end_date_idx  on subscriptions(end_date);

alter table subscriptions enable row level security;

drop policy if exists "select_subs"  on subscriptions;
drop policy if exists "manage_subs" on subscriptions;

create policy "select_subs"  on subscriptions for select using (true);
create policy "manage_subs"  on subscriptions for all    using (true);

-- Auto-update updated_at
create or replace function touch_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subs_touch on subscriptions;
create trigger trg_subs_touch
before update on subscriptions
for each row execute function touch_subscriptions_updated_at();

-- Optional: nightly cron to auto-expire (uncomment if pg_cron extension available)
-- select cron.schedule('expire_subs', '5 0 * * *', $$ update subscriptions set status='expired' where end_date < current_date and status='active'; $$);
