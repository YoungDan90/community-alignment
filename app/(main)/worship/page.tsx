'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateServicePlan from '@/components/worship/CreateServicePlan';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

interface Plan {
  id: string;
  service_date: string;
  title: string | null;
  theme: string | null;
  status: string;
  created_by: string;
}

interface WorshipMember {
  tmId: string;
  memberId: string;
  fullName: string | null;
}

interface AllMember {
  id: string;
  full_name: string | null;
}

export default function WorshipPage() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Plan[]>([]);
  const [past, setPast] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPastor, setIsPastor] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Worship team state
  const [worshipTeamId, setWorshipTeamId] = useState('');
  const [worshipMembers, setWorshipMembers] = useState<WorshipMember[]>([]);
  const [allMembers, setAllMembers] = useState<AllMember[]>([]);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [addMemberId, setAddMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [teamToast, setTeamToast] = useState('');

  const showToast = (msg: string) => { setTeamToast(msg); setTimeout(() => setTeamToast(''), 3000); };

  const loadWorshipTeam = async (supabase: ReturnType<typeof createClient>) => {
    const { data: team } = await supabase.from('serving_teams').select('id').eq('name', 'Worship Team').maybeSingle();
    if (!team?.id) return;
    setWorshipTeamId(team.id);
    const { data: members } = await supabase
      .from('team_members')
      .select('id, member_id, profiles:member_id(full_name)')
      .eq('team_id', team.id);
    const mapped: WorshipMember[] = (members ?? []).map((m: Record<string, unknown>) => {
      const p = Array.isArray(m.profiles) ? (m.profiles[0] ?? null) : m.profiles;
      return { tmId: m.id as string, memberId: m.member_id as string, fullName: (p as { full_name: string | null } | null)?.full_name ?? null };
    });
    setWorshipMembers(mapped);
  };

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const pastor = ['pastor', 'admin'].includes(profile?.role ?? '');
    setIsPastor(pastor);

    const today = new Date().toISOString().split('T')[0];
    const [upRes, pastRes] = await Promise.allSettled([
      supabase.from('service_plans').select('id, service_date, title, theme, status, created_by').gte('service_date', today).order('service_date', { ascending: true }),
      supabase.from('service_plans').select('id, service_date, title, theme, status, created_by').lt('service_date', today).order('service_date', { ascending: false }).limit(20),
    ]);
    if (upRes.status === 'fulfilled') setUpcoming(upRes.value.data ?? []);
    if (pastRes.status === 'fulfilled') setPast(pastRes.value.data ?? []);

    if (pastor) {
      await loadWorshipTeam(supabase);
      const { data: members } = await supabase.from('profiles').select('id, full_name').order('full_name');
      setAllMembers(members ?? []);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddMember = async () => {
    if (!addMemberId || !worshipTeamId) return;
    setAddingMember(true);
    const supabase = createClient();
    const { error } = await supabase.from('team_members').insert({ team_id: worshipTeamId, member_id: addMemberId });
    if (error) { showToast('Already on team or error.'); setAddingMember(false); return; }
    await loadWorshipTeam(supabase);
    setAddMemberId('');
    setAddingMember(false);
    showToast('Member added to Worship Team.');
  };

  const handleRemoveMember = async (tmId: string) => {
    const supabase = createClient();
    await supabase.from('team_members').delete().eq('id', tmId);
    setWorshipMembers(prev => prev.filter(m => m.tmId !== tmId));
    showToast('Member removed.');
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const notOnTeam = allMembers.filter(m => !worshipMembers.some(wm => wm.memberId === m.id));

  const inputStyle: React.CSSProperties = {
    background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '8px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
    outline: 'none', flex: 1,
  };

  const PlanCard = ({ plan }: { plan: Plan }) => (
    <div
      onClick={() => router.push(`/worship/${plan.id}`)}
      style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, color: S.textLight, fontWeight: 500 }}>{plan.title ?? formatDate(plan.service_date)}</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 11, color: S.soft }}>{formatDate(plan.service_date)}</p>
          {plan.theme && <p style={{ margin: 0, fontSize: 11, color: S.gold, fontStyle: 'italic' }}>&ldquo;{plan.theme}&rdquo;</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 2, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          background: plan.status === 'published' ? 'rgba(72,160,110,0.15)' : S.goldDim,
          border: `1px solid ${plan.status === 'published' ? 'rgba(72,160,110,0.3)' : S.goldBorder}`,
          color: plan.status === 'published' ? '#48a06e' : S.gold,
        }}>
          {plan.status}
        </span>
        <span style={{ color: S.soft, fontSize: 16 }}>›</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: S.dark, padding: '20px 0 80px', fontFamily: S.font.body }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>Alignment Church</p>
            <h1 style={{ margin: '4px 0 0', fontSize: 32, fontFamily: S.font.display, color: S.textLight, fontWeight: 400 }}>Worship Planning</h1>
          </div>
          <Link href="/worship/songs" style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Song Library
          </Link>
        </div>

        {/* Worship Team panel — pastor only */}
        {isPastor && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowTeamPanel(p => !p)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '12px 16px', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: S.gold }}>◉</span>
                <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>
                  Worship Team
                </span>
                <span style={{ fontSize: 11, color: S.soft }}>
                  {worshipMembers.length === 0 ? 'No members yet' : `${worshipMembers.length} member${worshipMembers.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <span style={{ color: S.soft, fontSize: 14, transform: showTeamPanel ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
            </button>

            {showTeamPanel && (
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderTop: 'none', borderRadius: '0 0 3px 3px', padding: '16px' }}>
                {teamToast && (
                  <div style={{ marginBottom: 12, padding: '7px 12px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 12, color: S.gold }}>
                    ✦ {teamToast}
                  </div>
                )}

                {worshipMembers.length === 0 ? (
                  <p style={{ margin: '0 0 14px', fontSize: 13, color: S.soft, fontStyle: 'italic' }}>No members on the Worship Team yet. Add members below.</p>
                ) : (
                  <div style={{ marginBottom: 14 }}>
                    {worshipMembers.map(m => (
                      <div key={m.tmId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
                        <p style={{ margin: 0, fontSize: 13, color: S.text }}>{m.fullName ?? 'Unknown'}</p>
                        <button onClick={() => handleRemoveMember(m.tmId)} style={{ background: 'none', border: 'none', color: '#e05555', fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)} style={inputStyle}>
                    <option value="">Add a member…</option>
                    {notOnTeam.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
                  </select>
                  <button
                    onClick={handleAddMember}
                    disabled={!addMemberId || addingMember}
                    style={{ padding: '8px 16px', background: addMemberId ? S.goldDim : 'transparent', border: `1px solid ${addMemberId ? S.goldBorder : S.border}`, borderRadius: 2, color: addMemberId ? S.gold : S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: addMemberId ? 'pointer' : 'not-allowed', fontFamily: S.font.body, flexShrink: 0 }}
                  >
                    {addingMember ? '…' : '+ Add'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isPastor && !showCreate && (
          <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: '12px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 3, color: S.gold, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 24 }}>
            + New Service Plan
          </button>
        )}

        {showCreate && (
          <CreateServicePlan
            onClose={() => setShowCreate(false)}
            onCreated={(id) => { setShowCreate(false); router.push(`/worship/${id}`); }}
          />
        )}

        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>Upcoming Services</p>
          {loading ? (
            <p style={{ color: S.soft, fontSize: 13 }}>Loading…</p>
          ) : upcoming.length === 0 ? (
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: S.soft }}>No upcoming services planned.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <button
              onClick={() => setShowPast(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12 }}
            >
              <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.soft }}>Past Services ({past.length})</p>
              <span style={{ color: S.soft, fontSize: 14, transform: showPast ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
            </button>
            {showPast && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {past.map(plan => <PlanCard key={plan.id} plan={plan} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
