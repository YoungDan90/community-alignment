'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
}

interface TeamMember {
  id: string;
  member_id: string;
  profile: { full_name: string | null; role: string };
}

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface Props {
  team: Team;
  onBack: () => void;
  onUpdated: () => void;
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

export default function TeamDetail({ team, onBack, onUpdated }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [leaderId, setLeaderId] = useState(team.leader_id ?? '');
  const [addMemberId, setAddMemberId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    loadTeamMembers();
    loadAllMembers();
  }, [team.id]);

  const loadTeamMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('team_members')
      .select('id, member_id, profile:member_id(full_name, role)')
      .eq('team_id', team.id)
      .order('created_at');
    setMembers((data as unknown as TeamMember[]) ?? []);
  };

  const loadAllMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
    setAllMembers((data as MemberOption[]) ?? []);
  };

  const handleSaveLeader = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('serving_teams').update({ leader_id: leaderId || null }).eq('id', team.id);
    onUpdated();
    showToast('Leader updated.');
    setSaving(false);
  };

  const handleAddMember = async () => {
    if (!addMemberId) return;
    const supabase = createClient();
    const { error } = await supabase.from('team_members').insert({ team_id: team.id, member_id: addMemberId });
    if (error) { showToast('Already on team or error adding.'); return; }
    setAddMemberId('');
    await loadTeamMembers();
    showToast('Member added.');
  };

  const handleRemove = async (tmId: string) => {
    const supabase = createClient();
    await supabase.from('team_members').delete().eq('id', tmId);
    setMembers(prev => prev.filter(m => m.id !== tmId));
    showToast('Member removed.');
  };

  const notOnTeam = allMembers.filter(m => !members.some(tm => tm.member_id === m.id));

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body, marginBottom: 20, padding: 0 }}
      >
        ← Back to Teams
      </button>

      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>{team.name}</h2>
      {team.description && <p style={{ margin: '0 0 20px', fontSize: 13, color: S.soft, fontStyle: 'italic' }}>{team.description}</p>}

      {toast && (
        <div style={{ marginBottom: 14, padding: '8px 12px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 12, color: S.gold }}>
          ✦ {toast}
        </div>
      )}

      {/* Leader */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 14 }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Team Leader</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={leaderId} onChange={e => setLeaderId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
            <option value="">— No leader assigned —</option>
            {allMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
          </select>
          <button
            onClick={handleSaveLeader}
            disabled={saving}
            style={{ padding: '9px 16px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body, flexShrink: 0 }}
          >
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 14 }}>
        <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>
          Team Members <span style={{ color: S.soft }}>({members.length})</span>
        </p>

        {members.length === 0 && (
          <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic', marginBottom: 12 }}>No members on this team yet.</p>
        )}

        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: S.goldDim, border: `1px solid ${S.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: S.gold, flexShrink: 0 }}>
                {(m.profile.full_name ?? '?')[0].toUpperCase()}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: S.textLight, fontFamily: S.font.display }}>{m.profile.full_name ?? 'Unnamed'}</p>
            </div>
            <button
              onClick={() => handleRemove(m.id)}
              style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >Remove</button>
          </div>
        ))}

        {/* Add member */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
            <option value="">Add a member…</option>
            {notOnTeam.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
          </select>
          <button
            onClick={handleAddMember}
            disabled={!addMemberId}
            style={{ padding: '9px 14px', background: addMemberId ? S.goldDim : 'transparent', border: `1px solid ${addMemberId ? S.goldBorder : S.border}`, borderRadius: 2, color: addMemberId ? S.gold : S.muted, fontSize: 11, cursor: addMemberId ? 'pointer' : 'not-allowed', fontFamily: S.font.body, flexShrink: 0 }}
          >+ Add</button>
        </div>
      </div>
    </div>
  );
}
