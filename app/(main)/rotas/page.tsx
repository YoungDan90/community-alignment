'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import TeamDetail from '@/components/rotas/TeamDetail';
import CreateRota from '@/components/rotas/CreateRota';
import RotaDetail from '@/components/rotas/RotaDetail';

interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  leader: { full_name: string | null } | null;
  member_count: number;
}

interface Rota {
  id: string;
  title: string | null;
  service_date: string;
  notes: string | null;
  team: { id: string; name: string };
  slot_count: number;
}

interface SwapRequest {
  id: string;
  reason: string | null;
  status: string;
  created_at: string;
  swap_with: string | null;
  requester: { full_name: string | null };
  swap_target: { full_name: string | null } | null;
  slot: {
    id: string;
    role_name: string;
    rota: { title: string | null; service_date: string; team: { name: string } };
  };
}

type Tab = 'teams' | 'rotas' | 'swaps';

export default function RotasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<Tab>('teams');

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Rotas state
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [selectedRota, setSelectedRota] = useState<Rota | null>(null);
  const [showCreateRota, setShowCreateRota] = useState(false);
  const [rotaTeamFilter, setRotaTeamFilter] = useState('');

  // Swap requests state
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [processingSwap, setProcessingSwap] = useState<string | null>(null);

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/dashboard'); return; }
      const { data: roles } = await supabase.rpc('get_my_roles');
      if (!(roles ?? []).some((r: string) => r === 'pastor' || r === 'admin')) { router.replace('/dashboard'); return; }
      setAuthorized(true);
      await Promise.all([loadTeams(supabase), loadRotas(supabase), loadSwaps(supabase)]);
      setLoading(false);
    })();
  }, [router]);

  const loadTeams = async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('serving_teams')
      .select('id, name, description, leader_id, leader:leader_id(full_name)')
      .order('name');

    if (!data) { setTeams([]); return; }

    // Get member counts
    const { data: counts } = await supabase
      .from('team_members')
      .select('team_id');

    const countMap: Record<string, number> = {};
    (counts ?? []).forEach((c: { team_id: string }) => { countMap[c.team_id] = (countMap[c.team_id] ?? 0) + 1; });

    setTeams(data.map((t: { id: string; name: string; description: string | null; leader_id: string | null; leader: { full_name: string | null }[] | { full_name: string | null } | null }) => ({
      id: t.id, name: t.name, description: t.description, leader_id: t.leader_id,
      leader: Array.isArray(t.leader) ? (t.leader[0] ?? null) : t.leader,
      member_count: countMap[t.id] ?? 0,
    })));
  };

  const loadRotas = async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('rotas')
      .select('id, title, service_date, notes, team:team_id(id, name)')
      .order('service_date', { ascending: false });

    if (!data) { setRotas([]); return; }

    const { data: slots } = await supabase.from('rota_slots').select('rota_id');
    const slotMap: Record<string, number> = {};
    (slots ?? []).forEach((s: { rota_id: string }) => { slotMap[s.rota_id] = (slotMap[s.rota_id] ?? 0) + 1; });

    setRotas(data.map((r: { id: string; title: string | null; service_date: string; notes: string | null; team: { id: string; name: string }[] | { id: string; name: string } }) => ({
      id: r.id, title: r.title, service_date: r.service_date, notes: r.notes,
      team: Array.isArray(r.team) ? r.team[0] : r.team,
      slot_count: slotMap[r.id] ?? 0,
    })));
  };

  const loadSwaps = async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('swap_requests')
      .select(`
        id, reason, status, created_at, swap_with,
        requester:requested_by(full_name),
        swap_target:swap_with(full_name),
        slot:rota_slot_id(id, role_name, rota:rota_id(title, service_date, team:team_id(name)))
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setSwaps((data as unknown as SwapRequest[]) ?? []);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user!.id).maybeSingle();
    await supabase.from('serving_teams').insert({ name: newTeamName.trim(), description: newTeamDesc.trim() || null, church_id: profile?.church_id });
    setNewTeamName(''); setNewTeamDesc('');
    setShowCreateTeam(false);
    await loadTeams(supabase);
    showToast('Team created.');
    setCreatingTeam(false);
  };

  const handleApproveSwap = async (swap: SwapRequest) => {
    setProcessingSwap(swap.id);
    const supabase = createClient();
    // Reassign the slot to the requested swap partner if one was named,
    // otherwise just confirm the slot and leave reassignment to the pastor.
    await supabase.from('rota_slots')
      .update(swap.swap_with ? { member_id: swap.swap_with, status: 'confirmed' } : { status: 'confirmed' })
      .eq('id', swap.slot.id);
    await supabase.from('swap_requests').update({ status: 'approved' }).eq('id', swap.id);
    setSwaps(prev => prev.filter(s => s.id !== swap.id));
    showToast('Swap approved.');
    setProcessingSwap(null);
  };

  const handleDeclineSwap = async (swapId: string, slotId: string) => {
    setProcessingSwap(swapId);
    const supabase = createClient();
    await supabase.from('swap_requests').update({ status: 'declined' }).eq('id', swapId);
    await supabase.from('rota_slots').update({ status: 'assigned' }).eq('id', slotId);
    setSwaps(prev => prev.filter(s => s.id !== swapId));
    showToast('Swap declined.');
    setProcessingSwap(null);
  };

  if (loading) return (
    <div className="pf-page pf-page--wide">
      <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
      {[0, 1, 2].map((i) => <div key={i} className="pf-skel" style={{ height: 90, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );
  if (!authorized) return null;

  return (
    <div className="pf-page pf-page--wide">
      {/* Header */}
      <div className="pf-head">
        <button onClick={() => router.back()} className="pf-btn pf-btn--quiet pf-btn--sm" style={{ marginBottom: 12 }}>← Back</button>
        <p className="pf-eyebrow">Serve</p>
        <h1 className="pf-title">Serving Rotas</h1>
        <p className="pf-sub">Manage teams, publish rotas, and handle swap requests.</p>
      </div>

      {toast && <div className="pf-banner" role="status">✦ {toast}</div>}

      {/* Tabs */}
      <div className="pf-tabs" role="tablist">
        {(['teams', 'rotas', 'swaps'] as Tab[]).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setSelectedTeam(null); setSelectedRota(null); setShowCreateRota(false); }}
            className="pf-tabbtn"
            style={{ textTransform: 'capitalize' }}
          >
            {t}
            {t === 'swaps' && swaps.length > 0 && <span className="pf-badge">{swaps.length}</span>}
          </button>
        ))}
      </div>

      {/* ── TEAMS TAB ── */}
      {tab === 'teams' && (
        selectedTeam ? (
          <TeamDetail
            team={selectedTeam}
            onBack={() => { setSelectedTeam(null); const supabase = createClient(); loadTeams(supabase); }}
            onUpdated={() => { const supabase = createClient(); loadTeams(supabase); }}
          />
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowCreateTeam(v => !v)} className="pf-btn pf-btn--sm">
                + Create Team
              </button>
            </div>

            {showCreateTeam && (
              <div className="pf-card pf-card--accent" style={{ marginBottom: 16 }}>
                <p className="pf-card-label">New Team</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input className="pf-input" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team name…" />
                  <input className="pf-input" value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} placeholder="Description (optional)…" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowCreateTeam(false)} className="pf-btn pf-btn--quiet" style={{ flex: 1 }}>Cancel</button>
                    <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creatingTeam} className="pf-btn" style={{ flex: 2 }}>
                      {creatingTeam ? 'Creating…' : 'Create Team'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teams.map(t => (
                <button key={t.id}
                  onClick={() => setSelectedTeam(t)}
                  className="pf-card pf-card--link"
                  style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--pf-text-bright)', fontFamily: 'var(--pf-serif)' }}>{t.name}</p>
                      {t.description && <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>{t.description}</p>}
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--pf-gold)' }}>
                        {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                        {t.leader && <span style={{ color: 'var(--pf-text-soft)' }}> · Led by {t.leader.full_name}</span>}
                      </p>
                    </div>
                    <span style={{ color: 'var(--pf-text-soft)', fontSize: 14, flexShrink: 0 }}>→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── ROTAS TAB ── */}
      {tab === 'rotas' && (
        selectedRota ? (
          <RotaDetail rota={selectedRota} onBack={() => { setSelectedRota(null); const supabase = createClient(); loadRotas(supabase); }} />
        ) : showCreateRota ? (
          <CreateRota onCreated={() => { setShowCreateRota(false); const supabase = createClient(); loadRotas(supabase); showToast('Rota published.'); }} onCancel={() => setShowCreateRota(false)} />
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 }}>
              <select value={rotaTeamFilter} onChange={e => setRotaTeamFilter(e.target.value)} className="pf-input" style={{ flex: 1 }}>
                <option value="">All teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={() => setShowCreateRota(true)} className="pf-btn pf-btn--sm" style={{ flexShrink: 0 }}>
                + Create Rota
              </button>
            </div>

            {rotas.filter(r => !rotaTeamFilter || r.team.id === rotaTeamFilter).length === 0 && (
              <div className="pf-empty">
                <span className="pf-empty-icon">✦</span>
                No rotas yet. Create your first one.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rotas
                .filter(r => !rotaTeamFilter || r.team.id === rotaTeamFilter)
                .map(r => {
                  const date = new Date(r.service_date);
                  const isPast = date < new Date();
                  return (
                    <button key={r.id}
                      onClick={() => setSelectedRota(r)}
                      className="pf-card pf-card--link"
                      style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer', opacity: isPast ? 0.7 : 1 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p className="pf-card-label" style={{ margin: '0 0 2px' }}>{r.team.name}</p>
                          <p style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--pf-text-bright)', fontFamily: 'var(--pf-serif)' }}>{r.title ?? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--pf-text-soft)' }}>
                            {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}{r.slot_count} slot{r.slot_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span style={{ color: 'var(--pf-text-soft)', fontSize: 14 }}>→</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )
      )}

      {/* ── SWAP REQUESTS TAB ── */}
      {tab === 'swaps' && (
        <div>
          {swaps.length === 0 && (
            <div className="pf-empty">
              <span className="pf-empty-icon">✦</span>
              No pending swap requests.
            </div>
          )}
          {swaps.map(swap => {
            const dateStr = new Date(swap.slot.rota.service_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div key={swap.id} className="pf-card pf-card--accent" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 15, color: 'var(--pf-text-bright)', fontFamily: 'var(--pf-serif)' }}>{swap.requester.full_name ?? 'Unknown'}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--pf-gold)' }}>
                      {swap.slot.rota.team.name} · {swap.slot.role_name} · {dateStr}
                    </p>
                    {swap.reason && <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>{swap.reason}</p>}
                    {swap.swap_target && <p style={{ margin: 0, fontSize: 11, color: 'var(--pf-text-soft)' }}>Requested to swap with: {swap.swap_target.full_name}</p>}
                  </div>
                  <span className="pf-chip" style={{ flexShrink: 0 }}>Pending</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => handleApproveSwap(swap)}
                    disabled={processingSwap === swap.id}
                    className="pf-btn pf-btn--sm"
                    style={{ flex: 1 }}
                  >Approve</button>
                  <button
                    onClick={() => handleDeclineSwap(swap.id, swap.slot.id)}
                    disabled={processingSwap === swap.id}
                    className="pf-btn pf-btn--quiet pf-btn--sm"
                    style={{ flex: 1, color: 'var(--pf-danger)' }}
                  >Decline</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
