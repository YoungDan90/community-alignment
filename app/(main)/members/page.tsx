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
  member: 'Member', prophetic_team: 'Prophetic', pastor: 'Pastor', admin: 'Senior Leader',
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
      .eq('status', 'approved')
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
      <div className="pf-page pf-page--wide">
        <div className="pf-skel" style={{ height: 26, width: 240, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="pf-skel" style={{ height: 150, borderRadius: 6 }} />)}
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="pf-page pf-page--wide">
      {/* Header */}
      <div className="pf-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="pf-eyebrow">Pastor Dashboard</p>
          <h1 className="pf-title">Member Directory</h1>
          <p className="pf-sub">{members.length} people on record</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="pf-btn pf-btn--sm" style={{ flexShrink: 0 }}>
          + Add Member
        </button>
      </div>

      {/* Search */}
      <label className="pf-label" htmlFor="member-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search members by name</label>
      <input
        id="member-search"
        type="search"
        className="pf-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name…"
        style={{ marginBottom: 14 }}
      />

      {/* Status tabs */}
      <div className="pf-tabs" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {STATUS_TABS.map((t) => {
          const count = t === 'all' ? members.length : members.filter(m => m.member_status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className="pf-tabbtn"
              style={{ flexShrink: 0, textTransform: 'capitalize' }}
            >
              {t} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-icon" aria-hidden="true">◉</span>
          No members found.
        </div>
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
