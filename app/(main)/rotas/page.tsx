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

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '9px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
    outline: 'none', boxSizing: 'border-box',
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
        <p className="pf-eyebrow">Pastor Dashboard</p>
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
              <button onClick={() => setShowCreateTeam(v => !v)} style={{ padding: '8px 18px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em' }}>
                + Create Team
              </button>
            </div>

            {showCreateTeam && (
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 16 }}>
                <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>New Team</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team name…" style={inputStyle} />
                  <input value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} placeholder="Description (optional)…" style={inputStyle} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowCreateTeam(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
                    <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creatingTeam} style={{ flex: 2, padding: '9px', background: newTeamName.trim() ? S.gold : 'rgba(198,167,94,0.2)', border: 'none', borderRadius: 2, color: newTeamName.trim() ? S.dark : S.muted, fontSize: 12, fontWeight: 'bold', cursor: newTeamName.trim() ? 'pointer' : 'not-allowed', fontFamily: S.font.body }}>
                      {creatingTeam ? 'Creating…' : 'Create Team'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teams.map(t => (
                <div key={t.id}
                  onClick={() => setSelectedTeam(t)}
                  style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = S.goldBorder)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 16, color: S.textLight, fontFamily: S.font.display }}>{t.name}</p>
                      {t.description && <p style={{ margin: '0 0 6px', fontSize: 12, color: S.soft, fontStyle: 'italic' }}>{t.description}</p>}
                      <p style={{ margin: 0, fontSize: 11, color: S.muted }}>
                        {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                        {t.leader && <span style={{ color: S.soft }}> · Led by {t.leader.full_name}</span>}
                      </p>
                    </div>
                    <span style={{ color: S.soft, fontSize: 14, flexShrink: 0 }}>→</span>
                  </div>
                </div>
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
              <select value={rotaTeamFilter} onChange={e => setRotaTeamFilter(e.target.value)} style={{ background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2, padding: '8px 12px', color: S.text, fontSize: 12, fontFamily: S.font.body, outline: 'none', flex: 1 }}>
                <option value="">All teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={() => setShowCreateRota(true)} style={{ padding: '8px 18px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', flexShrink: 0 }}>
                + Create Rota
              </button>
            </div>

            {rotas.filter(r => !rotaTeamFilter || r.team.id === rotaTeamFilter).length === 0 && (
              <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>No rotas yet. Create your first one.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rotas
                .filter(r => !rotaTeamFilter || r.team.id === rotaTeamFilter)
                .map(r => {
                  const date = new Date(r.service_date);
                  const isPast = date < new Date();
                  return (
                    <div key={r.id}
                      onClick={() => setSelectedRota(r)}
                      style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 18px', cursor: 'pointer', opacity: isPast ? 0.7 : 1, transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = S.goldBorder)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.muted }}>{r.team.name}</p>
                          <p style={{ margin: '0 0 4px', fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{r.title ?? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p style={{ margin: 0, fontSize: 11, color: S.soft }}>
                            {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}{r.slot_count} slot{r.slot_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span style={{ color: S.soft, fontSize: 14 }}>→</span>
                      </div>
                    </div>
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
            <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>No pending swap requests.</p>
          )}
          {swaps.map(swap => {
            const dateStr = new Date(swap.slot.rota.service_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div key={swap.id} style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: '16px 18px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{swap.requester.full_name ?? 'Unknown'}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: S.muted }}>
                      {swap.slot.rota.team.name} · {swap.slot.role_name} · {dateStr}
                    </p>
                    {swap.reason && <p style={{ margin: '0 0 4px', fontSize: 12, color: S.soft, fontStyle: 'italic' }}>{swap.reason}</p>}
                    {swap.swap_target && <p style={{ margin: 0, fontSize: 11, color: S.soft }}>Requested to swap with: {swap.swap_target.full_name}</p>}
                  </div>
                  <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.gold, background: S.goldDim, border: `1px solid ${S.goldBorder}`, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>Pending</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleApproveSwap(swap)}
                    disabled={processingSwap === swap.id}
                    style={{ flex: 1, padding: '8px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >Approve</button>
                  <button
                    onClick={() => handleDeclineSwap(swap.id, swap.slot.id)}
                    disabled={processingSwap === swap.id}
                    style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: '#c47a7a', fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}
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
