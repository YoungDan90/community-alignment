import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required' },
        { status: 400 }
      );
    }

    // Save to Supabase using service role key (bypasses RLS for insert)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await supabase.from('contact_messages').insert({
      name,
      email,
      subject: subject || null,
      message,
    });

    if (dbError) {
      console.error('[contact] db insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Send email notification via Resend
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const contactEmail = process.env.CONTACT_EMAIL ?? 'info@alignmentchurch.uk';
        const timestamp = new Date().toLocaleString('en-GB', {
          dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/London',
        });

        await resend.emails.send({
          from: 'Alignment Church Website <noreply@alignmentchurch.uk>',
          to: contactEmail,
          subject: `New message from ${name} — Alignment Church website`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <div style="background: #0f1e2e; padding: 24px; text-align: center;">
                <h1 style="color: #c6a75e; font-size: 20px; margin: 0;">New Contact Message</h1>
                <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 4px 0 0;">Alignment Church Website</p>
              </div>
              <div style="padding: 32px 24px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; width: 80px;">From</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #c6a75e;">${email}</a></td></tr>
                  ${subject ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Subject</td><td style="padding: 8px 0;">${subject}</td></tr>` : ''}
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Sent</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${timestamp}</td></tr>
                </table>
                <div style="background: #f9fafb; border-left: 3px solid #c6a75e; padding: 16px 20px; border-radius: 0 4px 4px 0;">
                  <p style="margin: 0; line-height: 1.7; white-space: pre-wrap;">${message}</p>
                </div>
              </div>
              <div style="padding: 16px 24px; background: #f9fafb; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">You can view all messages in the <a href="https://community.alignmentchurch.uk/pastor" style="color: #c6a75e;">Pastor Dashboard</a></p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        // Email failure is non-blocking — message is already saved to DB
        console.error('[contact] email send error:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
