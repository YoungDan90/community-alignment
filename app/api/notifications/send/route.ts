import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendToSubscriptions } from '@/lib/notifications/send';

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
      const { data: roles } = await supabase.rpc('get_my_roles');
      if (!(roles ?? []).some((r: string) => r === 'pastor' || r === 'admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch subscriptions — targeted or broadcast. Uses the service-role
    // client: RLS restricts the cookie client to the caller's own rows,
    // which would make broadcasts only reach the sender's devices.
    const admin = createAdminClient();
    let query = admin.from('push_subscriptions').select('platform, subscription, fcm_token');
    if (target && target !== 'all') {
      query = query.eq('user_id', target) as typeof query;
    }
    const { data: rows } = await query;
    if (!rows?.length) {
      return NextResponse.json({ sent: 0 });
    }

    const sent = await sendToSubscriptions(rows, title, body, url);
    return NextResponse.json({ sent, total: rows.length });
  } catch {
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
