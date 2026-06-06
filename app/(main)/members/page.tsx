'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AddMemberModal from '@/components/members/AddMemberModal';

interface Member {
  id: string;
  full_name: string | null;
  role: string;
  member_status: string | null;
  join_date: string | null;
  created_at: string;
  church_id: string | null;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const STATUS_TABS = ['all', 'visitor', 'attendee', 'member', 'leader'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  visitor:  { bg: 'rgba(106,138,170,0.15)', text: '#6a8aaa', border: 'rgba(106,138,170,0.3)' },
  attendee: { bg: 'rgba(198,167,94,0.12)',  text: '#c6a75e', border: 'rgba(198,167,94,0.25)' },
  member:   { bg: 'rgba(90,138,90,0.15)',   text: '#5a8a5a', border: 'rgba(90,138,90,0.3)' },
  leader:   { bg: 'rgba(180,100,100,0.15)', text: '#c47a7a', border: 'rgba(180,100,100,0.3)' },
};

const ROLE_LABELS: Record<string, string> = {
  member: 'Member', prophetic_team: 'Prophetic', pastor: 'Pastor', admin: 'Admin',
};

export default function MembersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusTab>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/dashboard'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!['pastor', 'admin'].includes(profile?.role ?? '')) { router.replace('/dashboard'); return; }
      setAuthorized(true);
      await loadMembers(supabase);
      setLoading(false);
    })();
  }, [router]);

  const loadMembers = async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, member_status, join_date, created_at, church_id')
      .order('full_name', { ascending: true });
    setMembers((data as Member[]) ?? []);
  };

  const handleMemberAdded = async () => {
    setShowAddModal(false);
    const supabase = createClient();
    await loadMembers(supabase);
  };

  const filtered = members.filter((m) => {
    const matchesTab = tab === 'all' || m.member_status === tab;
    const matchesSearch = !search.trim() ||
      m.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic', fontFamily: S.font.body }}>Loading…</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div style={{ padding: '28px 20px', maxWidth: 720, margin: '0 auto', fontFamily: S.font.body }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>Pastor Dashboard</p>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>Member Directory</h1>
          <p style={{ margin: 0, fontSize: 13, color: S.soft, fontStyle: 'italic' }}>{members.length} people on record</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '9px 20px', background: S.gold, border: 'none', borderRadius: 2,
            color: S.dark, fontSize: 11, fontWeight: 'bold', cursor: 'pointer',
            fontFamily: S.font.body, letterSpacing: '0.08em', flexShrink: 0,
          }}
        >
          + Add Member
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name…"
        style={{
          width: '100%', background: S.card, border: `1px solid ${S.border}`, borderRadius: 2,
          padding: '10px 14px', color: S.text, fontSize: 14, fontFamily: S.font.body,
          outline: 'none', marginBottom: 14, boxSizing: 'border-box',
        }}
      />

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {STATUS_TABS.map((t) => {
          const count = t === 'all' ? members.length : members.filter(m => m.member_status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', flexShrink: 0,
                background: tab === t ? S.goldDim : 'transparent',
                border: `1px solid ${tab === t ? S.goldBorder : S.border}`,
                borderRadius: 2, color: tab === t ? S.gold : S.muted,
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'capitalize',
                cursor: 'pointer', fontFamily: S.font.body,
              }}
            >
              {t} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>No members found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {filtered.map((m) => {
            const initials = (m.full_name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const status = m.member_status ?? 'attendee';
            const sc = STATUS_COLORS[status] ?? STATUS_COLORS.attendee;
            const joined = m.join_date
              ? new Date(m.join_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
              : new Date(m.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            return (
              <Link key={m.id} href={`/members/${m.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: S.card, border: `1px solid ${S.border}`, borderRadius: 3,
                    padding: '18px 16px', cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = S.goldBorder)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: S.goldDim, border: `1px solid ${S.goldBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: S.gold, marginBottom: 12, fontFamily: S.font.display,
                  }}>
                    {initials}
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 15, color: S.textLight, fontFamily: S.font.display, lineHeight: 1.2 }}>
                    {m.full_name ?? 'Unnamed'}
                  </p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 9, letterSpacing: '0.1em', textTransform: 'capitalize',
                      background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                      padding: '2px 7px', borderRadius: 10,
                    }}>{status}</span>
                    {m.role !== 'member' && (
                      <span style={{
                        fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                        background: S.goldDim, color: S.gold, border: `1px solid ${S.goldBorder}`,
                        padding: '2px 7px', borderRadius: 10,
                      }}>{ROLE_LABELS[m.role] ?? m.role}</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 10, color: S.soft }}>Joined {joined}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleMemberAdded}
        />
      )}
    </div>
  );
}
