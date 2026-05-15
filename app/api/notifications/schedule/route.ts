import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// Map of [dayOfWeek (0=Sun), hour] → notification. -1 day = any day.
const SCHEDULE: Array<{ day: number; hour: number; minute: number; title: string; body: string; url: string }> = [
  { day: -1, hour: 6,  minute: 30, title: 'Morning Stillness',         body: 'Begin your Selah moment — quiet your heart before the Word.',              url: '/selah' },
  { day: 1,  hour: 7,  minute: 0,  title: "This week's verse is live",  body: 'A new word has been released. Receive it.',                                url: '/word-to-walk' },
  { day: -1, hour: 12, minute: 0,  title: 'Midday Verse',               body: 'Pause. Return to the Word.',                                               url: '/selah' },
  { day: 2,  hour: 7,  minute: 0,  title: 'Begin Your Word to Walk',    body: 'Seven stages. One word. Start your meditation journey today.',             url: '/word-to-walk' },
  { day: 3,  hour: 7,  minute: 0,  title: 'Continue Your Word to Walk', body: 'Where did you leave off? Return and go deeper.',                           url: '/word-to-walk' },
  { day: 3,  hour: 12, minute: 0,  title: 'Someone Needs Prayer',       body: 'A brother or sister has asked for intercession. Will you stand with them?', url: '/prayer-wall' },
  { day: 4,  hour: 7,  minute: 0,  title: 'Accountability Check-In',    body: 'Did you do what you committed to? Be honest with God.',                    url: '/word-to-walk' },
  { day: 5,  hour: 7,  minute: 0,  title: 'Complete Your Review',       body: 'Finish strong. Reflect on what obedience produced this week.',             url: '/word-to-walk' },
  { day: 6,  hour: 9,  minute: 0,  title: 'Rest in the Word',           body: 'Sabbath rest. Carry what God spoke into your day.',                        url: '/selah' },
];

async function broadcastNotification(title: string, body: string, url: string) {
  const supabase = await createClient();
  const { data: rows } = await supabase.from('push_subscriptions').select('subscription');
  if (!rows?.length) return 0;

  const payload = JSON.stringify({ title, body, url });
  const results = await Promise.allSettled(
    rows.map((row) => webpush.sendNotification(row.subscription, payload))
  );
  return results.filter((r) => r.status === 'fulfilled').length;
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent public triggering
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Use UTC+1 (UK time approximation — adjust for BST/GMT in production)
  const now = new Date();
  const ukOffset = 1; // hours ahead of UTC (use 0 for GMT, 1 for BST)
  const ukHour = (now.getUTCHours() + ukOffset) % 24;
  const ukMinute = now.getUTCMinutes();
  const ukDay = now.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat

  const matches = SCHEDULE.filter(
    (s) =>
      (s.day === -1 || s.day === ukDay) &&
      s.hour === ukHour &&
      Math.abs(s.minute - ukMinute) < 5 // 5-minute window for cron jitter
  );

  if (!matches.length) {
    return NextResponse.json({ sent: 0, message: 'No scheduled notification at this time' });
  }

  const results = await Promise.all(
    matches.map((m) => broadcastNotification(m.title, m.body, m.url))
  );

  return NextResponse.json({ sent: results.reduce((a, b) => a + b, 0), notifications: matches.length });
}
