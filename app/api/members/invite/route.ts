import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role, full_name, church_id').eq('id', user.id).maybeSingle();
    if (!['pastor', 'admin'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, email, phone, memberStatus } = await request.json();
    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });

    const pastorName = profile?.full_name ?? 'Pastor Daniel';

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Alignment Church <noreply@alignmentchurch.uk>',
        to: email,
        subject: 'You have been invited to Community — Alignment Church',
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <div style="background: #0f1e2e; padding: 32px 24px; text-align: center;">
              <p style="color: #c6a75e; font-size: 28px; margin: 0 0 6px; font-family: Georgia, serif;">✦</p>
              <h1 style="color: #f0e8d4; font-size: 22px; font-weight: normal; margin: 0; font-family: Georgia, serif;">Alignment Church</h1>
              <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 4px 0 0; letter-spacing: 0.15em; text-transform: uppercase;">Community Platform</p>
            </div>
            <div style="padding: 36px 32px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; color: #333; margin: 0 0 16px;">Hi ${name},</p>
              <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 24px;">
                ${pastorName} has invited you to join the Alignment Church community platform — a space for encountering the Word, praying with the church, and walking in what God speaks.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://www.alignmentchurch.uk/signup?invite=true"
                   style="background: #c6a75e; color: #0f1e2e; text-decoration: none; padding: 14px 32px; border-radius: 2px; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; display: inline-block;">
                  Create Your Account
                </a>
              </div>
              <p style="font-size: 13px; color: #999; text-align: center; margin: 0;">
                Or visit <a href="https://www.alignmentchurch.uk/signup?invite=true" style="color: #c6a75e;">www.alignmentchurch.uk/signup</a>
              </p>
            </div>
            <div style="padding: 16px 24px; background: #f9fafb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Alignment Church · Southend-on-Sea</p>
            </div>
          </div>
        `,
      });
    }

    // Log the pending invite in profiles for tracking (no auth account yet)
    const serviceSupabase = await import('@supabase/supabase-js').then(({ createClient: sc }) =>
      sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    );
    await serviceSupabase.from('profiles').insert({
      full_name: name,
      role: 'member',
      member_status: memberStatus ?? 'attendee',
      church_id: profile?.church_id ?? null,
      phone: phone ?? null,
      join_date: new Date().toISOString().split('T')[0],
    }).then(() => {}); // best-effort, no auth.uid() match needed — invite placeholder

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[invite]', err);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
