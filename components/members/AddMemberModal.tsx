'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};


const STATUS_OPTIONS = ['visitor', 'attendee', 'member', 'leader'] as const;

export default function AddMemberModal({ onClose, onAdded }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [memberStatus, setMemberStatus] = useState<typeof STATUS_OPTIONS[number]>('attendee');
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    setSaving(true);
    setError('');

    try {
      if (sendInvite) {
        // Send invite email via API — profile created when they sign up (via DB trigger)
        const res = await fetch('/api/members/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fullName.trim(), email: email.trim(), phone: phone.trim() || null, memberStatus }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to send invite');
        setSuccess(`Invite sent to ${email}.`);
      } else {
        // Create profile directly — pastor adding someone without an account yet
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: myProfile } = await supabase.from('profiles').select('church_id').eq('id', user!.id).maybeSingle();

        const { error: insertErr } = await supabase.from('profiles').insert({
          full_name: fullName.trim(),
          role: 'member',
          member_status: memberStatus,
          church_id: myProfile?.church_id ?? null,
          phone: phone.trim() || null,
          join_date: new Date().toISOString().split('T')[0],
        });
        if (insertErr) throw insertErr;
        setSuccess(`${fullName} added to the directory.`);
      }
      setTimeout(() => { onAdded(); }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
    setSaving(false);
  };

  return (
    <div className="pf-modal-overlay" onClick={onClose}>
      <div
        className="pf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="pf-modal-title" id="add-member-title">Add Member</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: S.soft, fontSize: 20, cursor: 'pointer', padding: 8, minWidth: 40, minHeight: 40 }}>✕</button>
        </div>

        {success ? (
          <div style={{ padding: '16px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, color: S.gold, fontFamily: S.font.display, fontStyle: 'italic' }}>✦ {success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="pf-label" htmlFor="add-name">Full Name *</label>
              <input id="add-name" className="pf-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="First and last name" required />
            </div>

            <div>
              <label className="pf-label" htmlFor="add-email">Email *</label>
              <input id="add-email" className="pf-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
            </div>

            <div>
              <label className="pf-label" htmlFor="add-phone">Phone <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input id="add-phone" className="pf-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44…" />
            </div>

            <div>
              <label className="pf-label" htmlFor="add-status">Member Status</label>
              <select
                id="add-status"
                className="pf-input"
                value={memberStatus}
                onChange={e => setMemberStatus(e.target.value as typeof STATUS_OPTIONS[number])}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            {/* Send invite toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: S.text }}>Send email invite</p>
                <p style={{ margin: 0, fontSize: 11, color: S.soft, fontStyle: 'italic' }}>
                  {sendInvite ? 'They will receive a signup link' : 'Add directly without an account'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSendInvite(v => !v)}
                style={{
                  position: 'relative', width: 44, height: 24, flexShrink: 0,
                  background: sendInvite ? S.gold : S.border,
                  border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'background 0.25s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: sendInvite ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.25s',
                }} />
              </button>
            </div>

            {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={onClose} className="pf-btn pf-btn--quiet" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={saving} className="pf-btn" style={{ flex: 2 }}>
                {saving ? 'Saving…' : sendInvite ? 'Send Invite' : 'Add Member'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
