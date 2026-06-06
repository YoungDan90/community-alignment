'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Slot {
  id: string;
  role_name: string;
  rota: { title: string | null; service_date: string; team: { id: string; name: string } };
}

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface Props {
  slot: Slot;
  onClose: () => void;
  onSubmitted: () => void;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
  padding: '10px 14px', color: S.text, fontSize: 14, fontFamily: S.font.body,
  outline: 'none', boxSizing: 'border-box',
};

export default function SwapRequestForm({ slot, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState('');
  const [swapWithId, setSwapWithId] = useState('');
  const [teamMembers, setTeamMembers] = useState<MemberOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('team_members')
        .select('member_id, profile:member_id(full_name)')
        .eq('team_id', slot.rota.team.id);
      const members = (data as unknown as { member_id: string; profile: { full_name: string | null } }[]) ?? [];
      setTeamMembers(members.map(m => ({ id: m.member_id, full_name: m.profile.full_name })));
    })();
  }, [slot.rota.team.id]);

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertErr } = await supabase.from('swap_requests').insert({
        rota_slot_id: slot.id,
        requested_by: user!.id,
        swap_with: swapWithId || null,
        reason: reason.trim() || null,
      });
      if (insertErr) throw insertErr;

      // Update slot status
      await supabase.from('rota_slots').update({ status: 'swap_requested' }).eq('id', slot.id);

      onSubmitted();
    } catch {
      setError('Failed to submit swap request.');
    }
    setSaving(false);
  };

  const dateStr = new Date(slot.rota.service_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(7,12,18,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: S.card, border: `1px solid ${S.border}`, borderRadius: 3,
        padding: '28px 24px', width: '100%', maxWidth: 420, position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)`, borderRadius: '3px 3px 0 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>Request a Swap</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2, padding: '10px 14px', marginBottom: 18 }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{slot.rota.team.name}</p>
          <p style={{ margin: '0 0 2px', fontSize: 14, color: S.textLight, fontFamily: S.font.display }}>{slot.role_name}</p>
          <p style={{ margin: 0, fontSize: 12, color: S.soft }}>{dateStr}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why do you need a swap?"
              rows={3}
              style={{ ...inputStyle, resize: 'none', fontStyle: 'italic' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Swap with <span style={{ color: S.muted, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <select value={swapWithId} onChange={e => setSwapWithId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Let pastor decide</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
            </select>
          </div>
        </div>

        {error && <p style={{ marginTop: 10, fontSize: 12, color: '#e07070' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '11px', background: saving ? 'rgba(198,167,94,0.3)' : S.gold, border: 'none', borderRadius: 2, color: saving ? S.muted : S.dark, fontSize: 12, fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer', fontFamily: S.font.body, letterSpacing: '0.06em' }}>
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
