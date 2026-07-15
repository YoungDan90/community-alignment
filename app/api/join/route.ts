import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, heardVia, visited, message, wantsCall } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Anon key is sufficient — RLS policy allows anon INSERT on join_requests
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: dbError } = await supabase.from('join_requests').insert({
      name,
      email,
      phone: phone || null,
      heard_via: heardVia || null,
      visited: typeof visited === 'boolean' ? visited : null,
      message: message || null,
      wants_call: !!wantsCall,
    });

    if (dbError) {
      console.error('[join] db insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save your details' }, { status: 500 });
    }

    // Notify the church via Resend (non-blocking — enquiry is already saved)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const to = process.env.CONTACT_EMAIL ?? 'info@alignmentchurch.uk';
        const timestamp = new Date().toLocaleString('en-GB', {
          dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/London',
        });

        await resend.emails.send({
          from: 'Alignment Church Website <noreply@alignmentchurch.uk>',
          to,
          subject: `New membership enquiry from ${name} — Alignment Church`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <div style="background: #0f1e2e; padding: 24px; text-align: center;">
                <h1 style="color: #c6a75e; font-size: 20px; margin: 0;">New Membership Enquiry</h1>
                <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 4px 0 0;">Someone wants to join Alignment Church</p>
              </div>
              <div style="padding: 32px 24px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #c6a75e;">${email}</a></td></tr>
                  ${phone ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Phone</td><td style="padding: 8px 0;">${phone}</td></tr>` : ''}
                  ${heardVia ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Heard via</td><td style="padding: 8px 0;">${heardVia}</td></tr>` : ''}
                  ${typeof visited === 'boolean' ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Visited before</td><td style="padding: 8px 0;">${visited ? 'Yes' : 'No'}</td></tr>` : ''}
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Wants a call</td><td style="padding: 8px 0;">${wantsCall ? 'Yes' : 'No'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Sent</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${timestamp}</td></tr>
                </table>
                ${message ? `
                <div style="background: #f9fafb; border-left: 3px solid #c6a75e; padding: 16px 20px; border-radius: 0 4px 4px 0;">
                  <p style="margin: 0; line-height: 1.7; white-space: pre-wrap;">${message}</p>
                </div>` : ''}
              </div>
              <div style="padding: 16px 24px; background: #f9fafb; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">Triage enquiries in the <a href="https://www.alignmentchurch.uk/pastor" style="color: #c6a75e;">Pastor Dashboard</a></p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        // Email failure is non-blocking — enquiry is already saved to DB
        console.error('[join] email send error:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[join] unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
