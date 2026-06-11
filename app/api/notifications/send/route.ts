import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { title, body, url = '/', target } = await request.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    // Broadcasts (no target / target='all') require pastor/admin
    if (!target || target === 'all') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!['pastor', 'admin'].includes(profile?.role ?? '')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch subscriptions — targeted or broadcast
    let query = supabase.from('push_subscriptions').select('subscription');
    if (target && target !== 'all') {
      query = query.eq('user_id', target) as typeof query;
    }
    const { data: rows } = await query;
    if (!rows?.length) {
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      rows.map((row) => webpush.sendNotification(row.subscription, payload))
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return NextResponse.json({ sent, total: rows.length });
  } catch {
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
