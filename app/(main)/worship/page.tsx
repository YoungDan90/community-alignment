'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateServicePlan from '@/components/worship/CreateServicePlan';

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
    const { data: roles } = await supabase.rpc('get_my_roles');
    const pastor = (roles ?? []).some((r: string) => r === 'pastor' || r === 'admin');
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

  const PlanCard = ({ plan }: { plan: Plan }) => (
    <button
      onClick={() => router.push(`/worship/${plan.id}`)}
      className="pf-card"
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', border: '1px solid var(--pf-border)', font: 'inherit' }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-text-bright)', fontWeight: 500 }}>{plan.title ?? formatDate(plan.service_date)}</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--pf-text-soft)' }}>{formatDate(plan.service_date)}</p>
          {plan.theme && <p style={{ margin: 0, fontSize: 11, color: 'var(--pf-gold)', fontStyle: 'italic' }}>&ldquo;{plan.theme}&rdquo;</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="pf-chip" style={plan.status === 'published' ? { background: 'rgba(72,160,110,0.15)', borderColor: 'rgba(72,160,110,0.3)', color: '#48a06e' } : undefined}>
          {plan.status}
        </span>
        <span style={{ color: 'var(--pf-text-soft)', fontSize: 16 }}>›</span>
      </div>
    </button>
  );

  return (
    <div className="pf-page pf-page--wide">
      <div>
        <div className="pf-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p className="pf-eyebrow">Serve</p>
            <h1 className="pf-title">Worship Planning</h1>
          </div>
          <Link href="/worship/songs" className="pf-btn pf-btn--quiet pf-btn--sm">Song Library</Link>
        </div>

        {/* Worship Team panel — pastor only */}
        {isPastor && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowTeamPanel(p => !p)}
              className="pf-card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', textAlign: 'left', font: 'inherit', borderRadius: showTeamPanel ? '6px 6px 0 0' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--pf-gold)' }}>◉</span>
                <span className="pf-card-label" style={{ margin: 0 }}>Worship Team</span>
                <span className="pf-sub">
                  {worshipMembers.length === 0 ? 'No members yet' : `${worshipMembers.length} member${worshipMembers.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <span style={{ color: 'var(--pf-text-soft)', fontSize: 14, transform: showTeamPanel ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
            </button>

            {showTeamPanel && (
              <div style={{ background: 'var(--pf-bg-raised)', border: '1px solid var(--pf-border)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '16px' }}>
                {teamToast && <div className="pf-banner">✦ {teamToast}</div>}

                {worshipMembers.length === 0 ? (
                  <p className="pf-sub" style={{ marginBottom: 14 }}>No members on the Worship Team yet. Add members below.</p>
                ) : (
                  <div style={{ marginBottom: 14 }}>
                    {worshipMembers.map(m => (
                      <div key={m.tmId} className="pf-row">
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-text)' }}>{m.fullName ?? 'Unknown'}</p>
                        <button onClick={() => handleRemoveMember(m.tmId)} style={{ background: 'none', border: 'none', color: 'var(--pf-danger)', fontSize: 11, cursor: 'pointer', padding: '13px 10px', minHeight: 44, minWidth: 44 }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)} className="pf-input" style={{ flex: 1 }}>
                    <option value="">Add a member…</option>
                    {notOnTeam.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
                  </select>
                  <button
                    onClick={handleAddMember}
                    disabled={!addMemberId || addingMember}
                    className={`pf-btn pf-btn--sm${addMemberId ? '' : ' pf-btn--quiet'}`}
                    style={{ flexShrink: 0 }}
                  >
                    {addingMember ? '…' : '+ Add'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isPastor && !showCreate && (
          <button onClick={() => setShowCreate(true)} className="pf-btn pf-btn--ghost" style={{ display: 'flex', width: '100%', marginBottom: 24 }}>
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
          <p className="pf-card-label">Upcoming Services</p>
          {loading ? (
            <p className="pf-sub">Loading…</p>
          ) : upcoming.length === 0 ? (
            <div className="pf-empty">
              <span className="pf-empty-icon">✦</span>
              No upcoming services planned.
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
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', marginBottom: 2, minHeight: 44 }}
            >
              <p className="pf-card-label" style={{ margin: 0, color: 'var(--pf-text-soft)' }}>Past Services ({past.length})</p>
              <span style={{ color: 'var(--pf-text-soft)', fontSize: 14, transform: showPast ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
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
