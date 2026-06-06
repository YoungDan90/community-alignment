'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Member {
  id: string;
  full_name: string | null;
  role: string;
  church_id: string | null;
  created_at: string;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pastor:         { bg: S.goldDim,                  text: S.gold,   border: S.goldBorder },
  prophetic_team: { bg: 'rgba(90,138,90,0.15)',      text: '#5a8a5a', border: 'rgba(90,138,90,0.3)' },
  admin:          { bg: 'rgba(106,138,170,0.15)',    text: S.soft,   border: 'rgba(106,138,170,0.3)' },
  member:         { bg: 'transparent',               text: S.muted,  border: S.border },
};

const ROLES: { value: string; label: string }[] = [
  { value: 'member',         label: 'Member' },
  { value: 'prophetic_team', label: 'Prophetic Team' },
  { value: 'pastor',         label: 'Pastor' },
  { value: 'admin',          label: 'Admin' },
];

export default function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, church_id, created_at')
        .order('created_at', { ascending: true });
      setMembers((data as Member[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const setMsg = (id: string, msg: string) => {
    setFeedback((p) => ({ ...p, [id]: msg }));
    setTimeout(() => setFeedback((p) => { const n = { ...p }; delete n[id]; return n; }), 3000);
  };

  const handleNudge = async (member: Member) => {
    setNudging(member.id);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'A word from your pastor',
          body: `${member.full_name ?? 'Hey'}, don't forget your Word to Walk this week.`,
          url: '/word-to-walk',
          target: member.id,
        }),
      });
      const { sent } = await res.json();
      setMsg(member.id, sent > 0 ? 'Nudge sent ✓' : 'No active subscription');
    } catch {
      setMsg(member.id, 'Failed to send');
    }
    setNudging(null);
  };

  const handleRoleChange = async (member: Member, newRole: string) => {
    setUpdatingRole(member.id);
    setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, role: newRole } : m));
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', member.id);
      if (error) throw error;
      setMsg(member.id, 'Role updated ✓');
    } catch {
      // Revert optimistic update
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, role: member.role } : m));
      setMsg(member.id, 'Update failed — check RLS policy');
    }
    setUpdatingRole(null);
  };

  if (loading) return <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>Loading members…</p>;
  if (!members.length) return <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>No members found.</p>;

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: S.muted }}>
        {members.length} member{members.length !== 1 ? 's' : ''}
      </p>
      {members.map((m) => {
        const joined = new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
          <div
            key={m.id}
            style={{
              background: S.card, border: `1px solid ${S.border}`, borderRadius: 3,
              padding: '14px 16px', marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: S.goldDim, border: `1px solid ${S.goldBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: S.gold, flexShrink: 0,
              }}>
                {(m.full_name ?? '?')[0].toUpperCase()}
              </div>

              {/* Name + joined */}
              <div style={{ flex: 1, minWidth: 100 }}>
                <p style={{ margin: 0, fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>
                  {m.full_name ?? 'Unnamed member'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: S.soft }}>
                  Joined {joined}
                  {!m.church_id && <span style={{ marginLeft: 8, color: '#e07070' }}>· no church linked</span>}
                </p>
                {feedback[m.id] && (
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: S.gold, letterSpacing: '0.08em' }}>{feedback[m.id]}</p>
                )}
              </div>

              {/* Nudge */}
              <button
                onClick={() => handleNudge(m)}
                disabled={nudging === m.id}
                style={{
                  padding: '6px 12px', background: 'transparent',
                  border: `1px solid ${S.border}`, borderRadius: 2,
                  color: S.soft, fontSize: 10, cursor: 'pointer',
                  fontFamily: S.font.body, letterSpacing: '0.08em',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {nudging === m.id ? '…' : 'Nudge'}
              </button>
            </div>

            {/* Team assignment row */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft, flexShrink: 0 }}>
                Assign to team
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLES.map((r) => {
                  const active = m.role === r.value;
                  const rColors = ROLE_COLORS[r.value] ?? ROLE_COLORS.member;
                  return (
                    <button
                      key={r.value}
                      onClick={() => !active && handleRoleChange(m, r.value)}
                      disabled={updatingRole === m.id}
                      style={{
                        padding: '4px 12px', borderRadius: 20,
                        background: active ? rColors.bg : 'transparent',
                        border: `1px solid ${active ? rColors.border : S.border}`,
                        color: active ? rColors.text : S.soft,
                        fontSize: 10, letterSpacing: '0.08em',
                        cursor: active ? 'default' : 'pointer',
                        fontFamily: S.font.body,
                        transition: 'all 0.15s',
                        opacity: updatingRole === m.id ? 0.5 : 1,
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
