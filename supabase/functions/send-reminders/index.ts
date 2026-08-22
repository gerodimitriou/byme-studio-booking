// Sends Web Push reminders ~1 hour before each confirmed booking, plus
// subscription expiry / low-session notices (once per subscription, daytime only).
// Invoked on a schedule by pg_cron (every 10 min). Auth via a shared secret header.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC    = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE   = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT   = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@byme.gr";
const REMINDER_SECRET = Deno.env.get("REMINDER_SECRET")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// YYYY-MM-DD → DD/MM for friendly Greek dates in notifications.
const fmtDate = (d: string) => { const [, m, day] = (d ?? "").split("-"); return `${day}/${m}`; };

Deno.serve(async (req) => {
  // Only pg_cron (or a manual call) carrying the shared secret may trigger this.
  if (req.headers.get("x-reminder-secret") !== REMINDER_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  const { data: due, error } = await supabase.rpc("bookings_due_for_reminder");
  if (error) return json({ error: error.message }, 500);

  let sent = 0, failed = 0;

  for (const b of due ?? []) {
    const email = (b.email ?? "").trim();
    if (!email) continue;

    // No-wildcard ilike = case-insensitive exact email match.
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .ilike("email", email);

    if (!subs || subs.length === 0) continue;

    const payload = JSON.stringify({
      title: "Υπενθύμιση ραντεβού — ByME",
      body:  `${b.service} στις ${b.booking_time} — σε περίπου 1 ώρα.`,
      url:   "/me",
      tag:   `booking-${b.id}`,
    });

    let anySent = false;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        anySent = true; sent++;
      } catch (e) {
        failed++;
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          // Subscription expired/unsubscribed — clean it up.
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }

    if (anySent) {
      await supabase
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", b.id);
    }
  }

  // ── Subscription expiry / low-session notices ───────────────
  // Fires once per subscription (the RPC filters out rows where
  // expiry_notified_at is already set). Daytime-only (Athens 10:00–19:59)
  // so no one gets a "your card expires" buzz in the middle of the night.
  const athensHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", hourCycle: "h23" }).format(new Date()),
  );
  let subDue = 0, subSent = 0, subFailed = 0;

  if (athensHour >= 10 && athensHour < 20) {
    const { data: dueSubs } = await supabase.rpc("subscriptions_due_for_expiry_notice");
    subDue = dueSubs?.length ?? 0;

    for (const s of dueSubs ?? []) {
      const email = (s.email ?? "").trim();
      if (!email) continue;

      const { data: devices } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .ilike("email", email);

      // No device → leave it eligible (mirrors the booking-reminder behaviour),
      // so the member still gets it if they enable notifications later.
      if (!devices || devices.length === 0) continue;

      const payload = JSON.stringify(
        s.reason === "low_sessions"
          ? {
              title: "Λίγες συνεδρίες έμειναν! 🎯",
              body:  `Σου ${s.sessions_left === 1 ? "έμεινε 1 συνεδρία" : `έμειναν ${s.sessions_left} συνεδρίες`} στο ${s.plan_name}. Ανανέωσε για να κρατήσεις το σερί! 🔥`,
              url:   "/me",
              tag:   `sub-${s.id}`,
            }
          : {
              title: "Η συνδρομή σου λήγει σύντομα ⏳",
              body:  `${s.plan_name} — λήγει ${fmtDate(s.end_date)}. Ανανέωσε έγκαιρα για να μη χαθεί το σερί! 💪`,
              url:   "/me",
              tag:   `sub-${s.id}`,
            },
      );

      let anySent = false;
      for (const d of devices) {
        try {
          await webpush.sendNotification(
            { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
            payload,
          );
          anySent = true; subSent++;
        } catch (e) {
          subFailed++;
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", d.endpoint);
          }
        }
      }

      if (anySent) {
        await supabase
          .from("subscriptions")
          .update({ expiry_notified_at: new Date().toISOString() })
          .eq("id", s.id);
      }
    }
  }

  return json({ ok: true, due: due?.length ?? 0, sent, failed, subDue, subSent, subFailed });
});
