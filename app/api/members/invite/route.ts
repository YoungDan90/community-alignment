import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('full_name, church_id').eq('id', user.id).maybeSingle(),
      supabase.rpc('get_my_roles'),
    ]);
    if (!(roles ?? []).some((r: string) => r === 'pastor' || r === 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, email, phone, memberStatus } = await request.json();
    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });

    const pastorName = profile?.full_name ?? 'Pastor Daniel';

    // Real invite: creates an actual auth.users row. handle_new_user()
    // then creates the profiles row automatically — with status='approved'
    // (not the usual 'pending') because invited_by is set below, since a
    // pastor personally inviting someone shouldn't also have to approve
    // them separately afterward.
    const admin = createAdminClient();
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name, invited_by: user.id },
      redirectTo: 'https://www.alignmentchurch.uk/reset-password',
    });
    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    // phone/member_status aren't part of handle_new_user's insert — set
    // them separately now that a real profile row exists to update.
    if (invited.user && (phone || memberStatus)) {
      await admin.from('profiles').update({
        ...(phone ? { phone } : {}),
        ...(memberStatus ? { member_status: memberStatus } : {}),
      }).eq('id', invited.user.id);
    }

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Heads-up only — the actual invite link is in Supabase's own email
      // sent by inviteUserByEmail above, since that's the only email that
      // carries a working magic link for setting up the account.
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
              <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0;">
                You'll receive a separate email with a link to set up your account — look out for it, and check your spam folder if it doesn't arrive shortly.
              </p>
            </div>
            <div style="padding: 16px 24px; background: #f9fafb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Alignment Church · Southend-on-Sea</p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[invite]', err);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
