// Generic Web Push sender. Invoked server-side only (DB triggers / cron via pg_net),
// authenticated with the shared x-reminder-secret header.
// Body: { email: string, title: string, body: string, url?: string, tag?: string }
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

Deno.serve(async (req) => {
  if (req.headers.get("x-reminder-secret") !== REMINDER_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: { email?: string; title?: string; body?: string; url?: string; tag?: string };
  try { payload = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const email = (payload.email ?? "").trim();
  if (!email) return json({ error: "email required" }, 400);

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .ilike("email", email);

  if (!subs || subs.length === 0) return json({ ok: true, sent: 0, failed: 0 });

  const msg = JSON.stringify({
    title: payload.title ?? "ByME",
    body:  payload.body  ?? "",
    url:   payload.url   ?? "/me",
    tag:   payload.tag   ?? "byme",
  });

  let sent = 0, failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        msg,
      );
      sent++;
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }

  return json({ ok: true, sent, failed });
});
