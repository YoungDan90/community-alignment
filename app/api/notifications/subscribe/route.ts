import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Native app (iOS/Android via the Capacitor wrapper) registers an FCM
    // token — a single opaque string, nothing like a web PushSubscription.
    if (body?.fcmToken) {
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user?.id ?? null,
          platform: 'fcm',
          fcm_token: body.fcmToken,
        },
        { onConflict: 'fcm_token' }
      );
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Browser (PWA) registers a standard web PushSubscription.
    const subscription = body;
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user?.id ?? null,
        platform: 'web',
        subscription,
        endpoint: subscription.endpoint,
      },
      { onConflict: 'endpoint' }
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
