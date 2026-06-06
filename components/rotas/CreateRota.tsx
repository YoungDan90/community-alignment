'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Team {
  id: string;
  name: string;
}

interface TeamMemberOption {
  member_id: string;
  profile: { full_name: string | null };
}

interface Slot {
  roleName: string;
  memberId: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
  padding: '9px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
  outline: 'none', boxSizing: 'border-box',
};

export default function CreateRota({ onCreated, onCancel }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<Slot[]>([{ roleName: '', memberId: '' }]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('serving_teams').select('id, name').order('name');
      setTeams((data as Team[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!teamId) { setTeamMembers([]); return; }
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('team_members')
        .select('member_id, profile:member_id(full_name)')
        .eq('team_id', teamId)
        .order('created_at');
      setTeamMembers((data as unknown as TeamMemberOption[]) ?? []);
    })();
  }, [teamId]);

  // Auto-generate title when team + date change
  useEffect(() => {
    if (teamId && serviceDate) {
      const team = teams.find(t => t.id === teamId);
      const dateStr = new Date(serviceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      setTitle(`${team?.name ?? ''} — ${dateStr}`);
    }
  }, [teamId, serviceDate, teams]);

  const updateSlot = (i: number, field: keyof Slot, value: string) => {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const addSlot = () => setSlots(prev => [...prev, { roleName: '', memberId: '' }]);
  const removeSlot = (i: number) => setSlots(prev => prev.filter((_, idx) => idx !== i));

  const handlePublish = async () => {
    if (!teamId || !serviceDate) { setError('Team and service date are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: myProfile } = await supabase.from('profiles').select('church_id').eq('id', user!.id).maybeSingle();

      const { data: rota, error: rotaErr } = await supabase
        .from('rotas')
        .insert({ church_id: myProfile?.church_id, team_id: teamId, service_date: serviceDate, title: title.trim() || null, notes: notes.trim() || null, created_by: user!.id })
        .select('id')
        .single();
      if (rotaErr) throw rotaErr;

      const filledSlots = slots.filter(s => s.roleName.trim());
      if (filledSlots.length > 0) {
        await supabase.from('rota_slots').insert(
          filledSlots.map(s => ({ rota_id: rota.id, member_id: s.memberId || null, role_name: s.roleName.trim() }))
        );

        // Notify assigned members
        const team = teams.find(t => t.id === teamId);
        const dateStr = new Date(serviceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
        const assignedSlots = filledSlots.filter(s => s.memberId);
        for (const slot of assignedSlots) {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Serving Rota',
              body: `You are on the ${team?.name ?? 'team'} rota for ${dateStr} — ${slot.roleName}`,
              url: '/my-rota',
              target: slot.memberId,
            }),
          }).catch(() => {});
        }
      }

      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish rota.');
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Team *</label>
          <select value={teamId} onChange={e => setTeamId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Select team…</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Service Date *</label>
          <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sunday Service — 18 May" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Notes <span style={{ color: S.muted, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any notes for the team…" style={{ ...inputStyle, resize: 'none' }} />
        </div>
      </div>

      {/* Slots */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 14px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Serving Slots</p>
        {slots.map((slot, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <input
              value={slot.roleName}
              onChange={e => updateSlot(i, 'roleName', e.target.value)}
              placeholder="Role (e.g. Lead Worshipper)"
              style={inputStyle}
            />
            <select
              value={slot.memberId}
              onChange={e => updateSlot(i, 'memberId', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Assign member…</option>
              {teamMembers.map(m => (
                <option key={m.member_id} value={m.member_id}>{m.profile.full_name ?? 'Unnamed'}</option>
              ))}
            </select>
            {slots.length > 1 && (
              <button
                onClick={() => removeSlot(i)}
                style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 16, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
              >✕</button>
            )}
          </div>
        ))}
        <button
          onClick={addSlot}
          style={{ background: 'none', border: 'none', color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body, padding: 0, letterSpacing: '0.05em' }}
        >+ Add another slot</button>
      </div>

      {error && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#e07070' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body }}
        >Cancel</button>
        <button
          onClick={handlePublish}
          disabled={saving}
          style={{ flex: 2, padding: '11px', background: saving ? 'rgba(198,167,94,0.3)' : S.gold, border: 'none', borderRadius: 2, color: saving ? S.muted : S.dark, fontSize: 12, fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer', fontFamily: S.font.body, letterSpacing: '0.06em' }}
        >
          {saving ? 'Publishing…' : 'Publish Rota ✦'}
        </button>
      </div>
    </div>
  );
}
