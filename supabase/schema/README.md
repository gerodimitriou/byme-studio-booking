# Database schema

Every schema change to the Supabase project lives here as a numbered-by-order,
idempotent SQL file. Each one is run once against the database, but they stay
in the repo permanently: together they *are* the database definition, and
running them in order against an empty Supabase project reproduces the schema
the app expects.

Run them from the Supabase Dashboard → SQL Editor.

## Order

Later files depend on tables the earlier ones create, so the order matters:

| # | File | Adds |
|---|---|---|
| 1 | `supabase_members_table.sql` | `members` |
| 2 | `supabase_bookings_table.sql` | `bookings` |
| 3 | `supabase_subscriptions_table.sql` | `subscriptions` |
| 4 | `supabase_bookings_subscription_link.sql` | links a booking to the subscription it draws a session from |
| 5 | `supabase_admin_upgrade.sql` | `app_settings`, `bookings.attendance`, allows `standby` status |
| 6 | `supabase_medical_certificates.sql` | `medical_certificates` + its RPCs |
| 7 | `supabase_schedule_medical_upgrade.sql` | adds an expiry date to certificates, re-grants the RPCs |
| 8 | `supabase_backups_table.sql` | `backups` + `prune_backups()` |
| 9 | `supabase_overbooking_guard.sql` | capacity trigger — rejects a confirmed booking past capacity |
| 10 | `supabase_security_upgrade.sql` | RLS lockdown of `members`; **needs a working admin login first** |

`seed_demo_data.sql` is optional and independent: it fills the database with
demo members, subscriptions and bookings so the admin panel has something to
show. Its names, addresses and phone numbers are all invented — the phone
numbers run in sequence from `6944123001` — and correspond to no real person.

## Known drift from production

These files do not currently reproduce production exactly.

`supabase_bookings_table.sql` grants the `anon` role `select`, `insert` and
`update` on `bookings`. In production those grants have since been tightened by
hand — `bookings`, `subscriptions` and `medical_certificates` all reject the
public anon key, the same way `members` does.

That hardening was done in the dashboard and was never written back into a
file, so a fresh project built from this directory ends up **more permissive**
than production. Closing that gap means capturing the production grants as a
new migration here.

The lesson is the reason this directory exists at all: a change that only
happens in the dashboard is a change nobody can review, reproduce, or roll
back.

## Two invariants worth knowing

**Capacities are defined twice.** `supabase_overbooking_guard.sql` hard-codes
the per-service capacities to match `src/lib/constants.js`. Changing one
without the other makes the trigger reject valid bookings. The durable fix is
to read the capacities from a table instead of duplicating them.

**Overbooking is enforced in the database, not the UI.** The client routes full
slots to standby, but two people can still confirm the same last slot in the
same instant. The trigger is what actually holds the invariant.
