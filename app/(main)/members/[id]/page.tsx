'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import EditProfileForm from '@/components/members/EditProfileForm';

function GroupsSection({ memberId }: { memberId: string }) {
  const [memberGroups, setMemberGroups] = useState<{ id: string; gmId: string; name: string }[]>([]);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>([]);
  const [addGroupId, setAddGroupId] = useState('');

  const S2 = {
    card: '#0a1828', border: '#1e3a52', gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)',
    goldBorder: 'rgba(198,167,94,0.25)', soft: '#6a8aaa', muted: '#c6a75e', textLight: '#f0e8d4',
    font: { body: "var(--font-jost), 'Jost', sans-serif" },
  };

  const load = () => {
    const supabase = createClient();
    supabase.from('group_members').select('id, group:group_id(id, name)').eq('member_id', memberId)
      .then(({ data }) => setMemberGroups(
        (data ?? []).map((d: { id: string; group: { id: string; name: string }[] | { id: string; name: string } }) => {
          const g = Array.isArray(d.group) ? d.group[0] : d.group;
          return { id: g.id, gmId: d.id, name: g.name };
        })
      ));
    supabase.from('groups').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setAllGroups((data as { id: string; name: string }[]) ?? []));
  };

  useEffect(() => { load(); }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!addGroupId) return;
    const supabase = createClient();
    await supabase.from('group_members').insert({ group_id: addGroupId, member_id: memberId });
    setAddGroupId('');
    load();
  };

  const handleRemove = async (gmId: string) => {
    const supabase = createClient();
    await supabase.from('group_members').delete().eq('id', gmId);
    setMemberGroups(prev => prev.filter(g => g.gmId !== gmId));
  };

  const notInGroup = allGroups.filter(g => !memberGroups.some(mg => mg.id === g.id));

  return (
    <div style={{ background: S2.card, border: `1px solid ${S2.border}`, borderRadius: 3, padding: '16px 18px', marginTop: 10 }}>
      <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S2.muted }}>Groups</p>
      {memberGroups.length === 0 && <p style={{ margin: '0 0 12px', fontSize: 13, color: S2.soft, fontStyle: 'italic' }}>Not in any groups.</p>}
      {memberGroups.map(g => (
        <div key={g.gmId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${S2.border}` }}>
          <span style={{ fontSize: 13, color: S2.textLight }}>{g.name}</span>
          <button onClick={() => handleRemove(g.gmId)} style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 10, cursor: 'pointer', fontFamily: S2.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Remove</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <select value={addGroupId} onChange={e => setAddGroupId(e.target.value)} style={{ flex: 1, background: '#0f1e2e', border: `1px solid ${S2.border}`, borderRadius: 2, padding: '8px 10px', color: S2.soft, fontSize: 12, fontFamily: S2.font.body, outline: 'none' }}>
          <option value="">Add to group…</option>
          {notInGroup.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button onClick={handleAdd} disabled={!addGroupId} style={{ padding: '8px 12px', background: addGroupId ? S2.goldDim : 'transparent', border: `1px solid ${addGroupId ? S2.goldBorder : S2.border}`, borderRadius: 2, color: addGroupId ? S2.gold : S2.muted, fontSize: 11, cursor: addGroupId ? 'pointer' : 'not-allowed', fontFamily: S2.font.body }}>+ Add</button>
      </div>
    </div>
  );
}

function ServingSection({ memberId }: { memberId: string }) {
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [slots, setSlots] = useState<{ id: string; role_name: string; status: string; rota: { service_date: string; team: { name: string } } }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('team_members').select('team:team_id(id, name)').eq('member_id', memberId)
      .then(({ data }) => setTeams((data ?? []).map((d: { team: { id: string; name: string }[] | { id: string; name: string } }) => (Array.isArray(d.team) ? d.team[0] : d.team)).filter(Boolean)));

    const today = new Date().toISOString().split('T')[0];
    supabase.from('rota_slots')
      .select('id, role_name, status, rota:rota_id!inner(service_date, team:team_id(name))')
      .eq('member_id', memberId)
      .gte('rota.service_date', today)
      .order('rota(service_date)', { ascending: true })
      .limit(5)
      .then(({ data }) => setSlots(((data as unknown as typeof slots) ?? []).filter(s => s.rota?.service_date)));
  }, [memberId]);

  const S2 = {
    card: '#0a1828', border: '#1e3a52', gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)',
    goldBorder: 'rgba(198,167,94,0.25)', soft: '#6a8aaa', muted: '#c6a75e', textLight: '#f0e8d4', text: '#ddd0b8',
    font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  };

  return (
    <div style={{ background: S2.card, border: `1px solid ${S2.border}`, borderRadius: 3, padding: '16px 18px', marginTop: 16 }}>
      <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S2.muted }}>Serving Teams</p>
      {teams.length === 0
        ? <p style={{ margin: '0 0 12px', fontSize: 13, color: S2.soft, fontStyle: 'italic' }}>Not assigned to any team.</p>
        : <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {teams.map(t => (
              <span key={t.id} style={{ fontSize: 10, letterSpacing: '0.08em', background: S2.goldDim, color: S2.gold, border: `1px solid ${S2.goldBorder}`, padding: '3px 10px', borderRadius: 10 }}>{t.name}</span>
            ))}
          </div>
      }
      <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S2.muted }}>Upcoming Rota Slots</p>
      {slots.length === 0
        ? <p style={{ margin: 0, fontSize: 13, color: S2.soft, fontStyle: 'italic' }}>No upcoming assignments.</p>
        : slots.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${S2.border}` }}>
              <span style={{ fontSize: 13, color: S2.textLight, fontFamily: S2.font.display }}>{s.role_name}</span>
              <span style={{ fontSize: 11, color: S2.soft }}>{new Date(s.rota.service_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))
      }
    </div>
  );
}

function DownloadsSection({ memberId }: { memberId: string }) {
  const [downloads, setDownloads] = useState<{ id: string; downloaded_at: string; document: { title: string; category: string } | null }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('document_downloads')
      .select('id, downloaded_at, document:document_id(title, category)')
      .eq('user_id', memberId)
      .order('downloaded_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setDownloads((data ?? []).map((d: {
        id: string; downloaded_at: string;
        document: { title: string; category: string }[] | { title: string; category: string } | null;
      }) => ({
        ...d,
        document: Array.isArray(d.document) ? (d.document[0] ?? null) : d.document,
      }))));
  }, [memberId]);

  const S2 = {
    card: '#0a1828', border: '#1e3a52', gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)',
    goldBorder: 'rgba(198,167,94,0.25)', soft: '#6a8aaa', muted: '#c6a75e', textLight: '#f0e8d4',
    font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  };

  if (downloads.length === 0) return null;

  return (
    <div style={{ background: S2.card, border: `1px solid ${S2.border}`, borderRadius: 3, padding: '16px 18px', marginTop: 16 }}>
      <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S2.muted }}>Resource Downloads</p>
      {downloads.map(d => (
        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${S2.border}` }}>
          <span style={{ fontSize: 13, color: S2.textLight, fontFamily: S2.font.display }}>{d.document?.title ?? 'Unknown'}</span>
          <span style={{ fontSize: 11, color: S2.soft, flexShrink: 0, marginLeft: 8 }}>
            {new Date(d.downloaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  member_status: string | null;
  join_date: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
  family_id: string | null;
  church_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface PastoralNote {
  id: string;
  note: string;
  created_at: string;
  pastor: { full_name: string | null };
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  created_at: string;
}

interface Stats {
  wtwCompletions: number;
  selahSessions: number;
  prayerRequests: number;
  testimonies: number;
  lastActive: string | null;
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

export default function MemberProfilePage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ wtwCompletions: 0, selahSessions: 0, prayerRequests: 0, testimonies: 0, lastActive: null });
  const [notes, setNotes] = useState<PastoralNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [pastorId, setPastorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'discipleship' | 'goals' | 'notes'>('details');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const loadNotes = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('pastoral_notes')
      .select('id, note, created_at, pastor:pastor_id(full_name)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    setNotes((data as unknown as PastoralNote[]) ?? []);
  }, [memberId]);

  const loadGoals = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('holistic_goals')
      .select('id, title, description, status, progress, created_at')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    setGoals((data as Goal[]) ?? []);
  }, [memberId]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/dashboard'); return; }

      const { data: myRoles } = await supabase.rpc('get_my_roles');
      if (!(myRoles ?? []).some((r: string) => r === 'pastor' || r === 'admin')) { router.replace('/dashboard'); return; }
      setAuthorized(true);
      setPastorId(user.id);

      const [profileRes, wtwRes, selahRes, prayerRes, testimonyRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', memberId).maybeSingle(),
        supabase.from('meditations').select('id, completed_at', { count: 'exact' }).eq('user_id', memberId).eq('status', 'completed'),
        supabase.from('selah_sessions').select('id, created_at', { count: 'exact' }).eq('user_id', memberId),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('user_id', memberId),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('user_id', memberId),
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data as Profile);

      const wtwData = wtwRes.status === 'fulfilled' ? wtwRes.value.data ?? [] : [];
      const selahData = selahRes.status === 'fulfilled' ? selahRes.value.data ?? [] : [];
      const prayerCount = prayerRes.status === 'fulfilled' ? prayerRes.value.count ?? 0 : 0;
      const testimonyCount = testimonyRes.status === 'fulfilled' ? testimonyRes.value.count ?? 0 : 0;

      const allDates = [
        ...wtwData.map((r: { completed_at?: string }) => r.completed_at),
        ...selahData.map((r: { created_at: string }) => r.created_at),
      ].filter(Boolean).sort().reverse();

      setStats({
        wtwCompletions: wtwData.length,
        selahSessions: selahData.length,
        prayerRequests: prayerCount,
        testimonies: testimonyCount,
        lastActive: allDates[0] ?? null,
      });

      await Promise.all([loadNotes(supabase), loadGoals(supabase)]);
      setLoading(false);
    })();
  }, [memberId, router, loadNotes, loadGoals]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !pastorId) return;
    setSavingNote(true);
    const supabase = createClient();
    await supabase.from('pastoral_notes').insert({ member_id: memberId, pastor_id: pastorId, note: newNote.trim() });
    setNewNote('');
    await loadNotes(supabase);
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const supabase = createClient();
    await supabase.from('pastoral_notes').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleSaveEditNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return;
    const supabase = createClient();
    await supabase.from('pastoral_notes').update({ note: editingNoteText.trim(), updated_at: new Date().toISOString() }).eq('id', noteId);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, note: editingNoteText.trim() } : n));
    setEditingNoteId(null);
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    setSavingGoal(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('holistic_goals')
      .insert({ member_id: memberId, title: newGoalTitle.trim(), description: newGoalDescription.trim() || null, created_by: pastorId })
      .select('id, title, description, status, progress, created_at')
      .single();
    if (data) setGoals(prev => [data as Goal, ...prev]);
    setNewGoalTitle('');
    setNewGoalDescription('');
    setSavingGoal(false);
  };

  const handleGoalProgress = async (goal: Goal, progress: number) => {
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, progress } : g));
    const supabase = createClient();
    await supabase.from('holistic_goals').update({ progress }).eq('id', goal.id);
  };

  const handleGoalStatus = async (goal: Goal, status: Goal['status']) => {
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status } : g));
    const supabase = createClient();
    await supabase.from('holistic_goals').update({ status }).eq('id', goal.id);
  };

  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-skel" style={{ height: 60, width: 280, marginBottom: 24, borderRadius: 30 }} />
        {[0, 1].map((i) => <div key={i} className="pf-skel" style={{ height: 160, borderRadius: 6, marginBottom: 14 }} />)}
      </div>
    );
  }
  if (!authorized || !profile) return null;

  const initials = (profile.full_name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const TABS = ['details', 'discipleship', 'goals', 'notes'] as const;

  return (
    <div className="pf-page">
      {/* Back */}
      <button onClick={() => router.back()} className="pf-btn pf-btn--quiet pf-btn--sm" style={{ marginBottom: 20 }}>
        ← Back to Directory
      </button>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: S.goldDim, border: `1px solid ${S.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: S.gold, fontFamily: S.font.display, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
            {profile.full_name ?? 'Unnamed Member'}
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: S.soft, fontStyle: 'italic' }}>
            {profile.member_status ?? 'attendee'} · joined {profile.join_date
              ? new Date(profile.join_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              : new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="pf-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={activeTab === t}
            onClick={() => setActiveTab(t)}
            className="pf-tabbtn"
            style={{ textTransform: 'capitalize' }}
          >
            {t === 'notes' ? 'Pastoral Notes' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Details ── */}
      {activeTab === 'details' && (
        <EditProfileForm
          profile={profile}
          onSaved={(updated) => setProfile(prev => prev ? { ...prev, ...updated } : prev)}
        />
      )}

      {/* ── Discipleship ── */}
      {activeTab === 'discipleship' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Word to Walk Completions', value: stats.wtwCompletions },
              { label: 'Selah Sessions', value: stats.selahSessions },
              { label: 'Prayer Requests', value: stats.prayerRequests },
              { label: 'Testimonies', value: stats.testimonies },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '18px 20px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 28, color: S.gold, fontFamily: S.font.display, lineHeight: 1 }}>{value}</p>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.soft }}>{label}</p>
              </div>
            ))}
          </div>
          {stats.lastActive && (
            <p style={{ fontSize: 12, color: S.soft, fontStyle: 'italic' }}>
              Last active: {new Date(stats.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <ServingSection memberId={memberId} />
          <GroupsSection memberId={memberId} />
          <DownloadsSection memberId={memberId} />
        </div>
      )}

      {/* ── Holistic Goals — the shared 1:1 space with their assigned pastor ── */}
      {activeTab === 'goals' && (
        <div>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Add Goal</p>
            <input
              value={newGoalTitle}
              onChange={e => setNewGoalTitle(e.target.value)}
              placeholder="Goal — e.g. Grow in consistent prayer"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <textarea
              value={newGoalDescription}
              onChange={e => setNewGoalDescription(e.target.value)}
              placeholder="Any detail or context (optional)"
              rows={3}
              style={{ ...inputStyle, resize: 'none', marginBottom: 10 }}
            />
            <button
              onClick={handleAddGoal}
              disabled={!newGoalTitle.trim() || savingGoal}
              style={{
                padding: '8px 18px', background: S.gold, border: 'none', borderRadius: 2,
                color: S.dark, fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
                fontFamily: S.font.body, opacity: (!newGoalTitle.trim() || savingGoal) ? 0.5 : 1,
              }}
            >
              {savingGoal ? 'Saving…' : 'Save Goal'}
            </button>
          </div>

          {goals.length === 0 && (
            <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic' }}>No goals yet.</p>
          )}

          {goals.map(g => (
            <div key={g.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{g.title}</p>
                <select
                  value={g.status}
                  onChange={e => handleGoalStatus(g, e.target.value as Goal['status'])}
                  style={{ background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 11, padding: '3px 8px', fontFamily: S.font.body }}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {g.description && (
                <p style={{ margin: '0 0 10px', fontSize: 13, color: S.soft, lineHeight: 1.6 }}>{g.description}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 999, background: S.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${g.progress}%`, background: S.gold }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={g.progress}
                  onChange={e => handleGoalProgress(g, Number(e.target.value))}
                  style={{ width: 90 }}
                />
                <span style={{ fontSize: 12, color: S.gold, minWidth: 32, textAlign: 'right' }}>{g.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pastoral Notes ── */}
      {activeTab === 'notes' && (
        <div>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Add Note</p>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Private pastoral note — never visible to the member…"
              rows={4}
              style={{ ...inputStyle, resize: 'none', fontStyle: 'italic', marginBottom: 10 }}
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || savingNote}
              style={{
                padding: '8px 20px', background: newNote.trim() ? S.gold : 'rgba(198,167,94,0.2)',
                border: 'none', borderRadius: 2, color: newNote.trim() ? S.dark : S.muted,
                fontSize: 11, fontWeight: 'bold', cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                fontFamily: S.font.body, letterSpacing: '0.08em',
              }}
            >
              {savingNote ? 'Saving…' : 'Save Note'}
            </button>
          </div>

          {notes.length === 0 && (
            <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic' }}>No pastoral notes yet.</p>
          )}

          {notes.map(n => (
            <div key={n.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 10, color: S.soft }}>
                  {n.pastor?.full_name ?? 'Pastor'} · {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.note); }}
                    style={{ background: 'none', border: 'none', color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, padding: 0 }}
                  >Edit</button>
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, padding: 0 }}
                  >Delete</button>
                </div>
              </div>
              {editingNoteId === n.id ? (
                <div>
                  <textarea
                    value={editingNoteText}
                    onChange={e => setEditingNoteText(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'none', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSaveEditNote(n.id)}
                      style={{ padding: '6px 14px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}
                    >Save</button>
                    <button
                      onClick={() => setEditingNoteId(null)}
                      style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: S.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{n.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
