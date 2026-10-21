'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: string;
  meeting_schedule: string | null;
  meeting_location: string | null;
  is_active: boolean;
  leader_id: string | null;
  leader: { full_name: string | null } | null;
  member_count: number;
  is_member: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  home_group: 'Home Group', mens: "Men's", womens: "Women's",
  bible_study: 'Bible Study', fellowship: 'Fellowship', general: 'General',
};

const TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  home_group:  { text: '#c6a75e', bg: 'rgba(198,167,94,0.12)',  border: 'rgba(198,167,94,0.25)' },
  mens:        { text: '#6a8aaa', bg: 'rgba(106,138,170,0.12)', border: 'rgba(106,138,170,0.25)' },
  womens:      { text: '#c47a7a', bg: 'rgba(196,122,122,0.12)', border: 'rgba(196,122,122,0.25)' },
  bible_study: { text: '#5a8a5a', bg: 'rgba(90,138,90,0.12)',   border: 'rgba(90,138,90,0.25)' },
  fellowship:  { text: '#c6a75e', bg: 'rgba(198,167,94,0.12)',  border: 'rgba(198,167,94,0.25)' },
  general:     { text: '#6a8aaa', bg: 'rgba(106,138,170,0.12)', border: 'rgba(106,138,170,0.25)' },
};

export default function GroupsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>(['member']);
  const [joining, setJoining] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<string>('general');
  const [newSchedule, setNewSchedule] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: roles } = await supabase.rpc('get_my_roles');
      setUserRoles(roles ?? ['member']);

      await loadGroups(supabase, user.id);
      setLoading(false);
    })();
  }, [router]);

  const loadGroups = async (supabase: ReturnType<typeof createClient>, uid: string) => {
    const { data: groupData } = await supabase
      .from('groups')
      .select('id, name, description, type, meeting_schedule, meeting_location, is_active, leader_id, leader:leader_id(full_name)')
      .eq('is_active', true)
      .order('name');

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('member_id', uid);

    const { data: allMemberships } = await supabase
      .from('group_members')
      .select('group_id');

    const memberSet = new Set((memberships ?? []).map((m: { group_id: string }) => m.group_id));
    const countMap: Record<string, number> = {};
    (allMemberships ?? []).forEach((m: { group_id: string }) => { countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1; });

    setGroups((groupData ?? []).map((g: Omit<Group, 'member_count' | 'is_member' | 'leader'> & { leader: { full_name: string | null }[] | { full_name: string | null } | null }) => ({
      ...g,
      leader: Array.isArray(g.leader) ? (g.leader[0] ?? null) : g.leader,
      member_count: countMap[g.id] ?? 0,
      is_member: memberSet.has(g.id),
    })));
  };

  const handleJoin = async (groupId: string) => {
    if (!userId) return;
    setJoining(groupId);
    const supabase = createClient();
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, member_id: userId });
    if (!error) {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, is_member: true, member_count: g.member_count + 1 } : g));
      showToast('You have joined the group.');
    }
    setJoining(null);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !userId) return;
    setCreating(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', userId).maybeSingle();
    await supabase.from('groups').insert({ name: newName.trim(), description: newDesc.trim() || null, type: newType, meeting_schedule: newSchedule.trim() || null, church_id: profile?.church_id, is_active: true });
    setNewName(''); setNewDesc(''); setNewType('general'); setNewSchedule('');
    setShowCreate(false);
    await loadGroups(supabase, userId);
    showToast('Group created.');
    setCreating(false);
  };

  const isPastor = userRoles.some(r => r === 'pastor' || r === 'admin');
  const myGroups = groups.filter(g => g.is_member);
  const otherGroups = groups.filter(g => !g.is_member);

  const GroupCard = ({ g }: { g: Group }) => {
    const tc = TYPE_COLORS[g.type] ?? TYPE_COLORS.general;
    return (
      <div className="pf-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 16, color: 'var(--pf-text-bright)', fontFamily: 'var(--pf-serif)' }}>{g.name}</p>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tc.text, background: tc.bg, border: `1px solid ${tc.border}`, padding: '2px 8px', borderRadius: 10 }}>
            {TYPE_LABELS[g.type] ?? g.type}
          </span>
        </div>
        {g.description && <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--pf-text-soft)', fontStyle: 'italic', lineHeight: 1.5 }}>{g.description}</p>}
        <p style={{ margin: 0, fontSize: 11, color: 'var(--pf-gold)' }}>
          {g.member_count} member{g.member_count !== 1 ? 's' : ''}
          {g.leader && <span style={{ color: 'var(--pf-text-soft)' }}> · Led by {g.leader.full_name}</span>}
          {g.meeting_schedule && <span style={{ color: 'var(--pf-text-soft)' }}> · {g.meeting_schedule}</span>}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {g.is_member && (
            <Link href={`/groups/${g.id}`} className="pf-btn pf-btn--ghost pf-btn--sm">View Group</Link>
          )}
          {!g.is_member && (
            <button onClick={() => handleJoin(g.id)} disabled={joining === g.id} className="pf-btn pf-btn--sm">
              {joining === g.id ? '…' : 'Join'}
            </button>
          )}
          {isPastor && (
            <Link href={`/groups/${g.id}/manage`} className="pf-btn pf-btn--quiet pf-btn--sm">Manage</Link>
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 160, marginBottom: 20 }} />
      {[0, 1, 2].map((i) => <div key={i} className="pf-skel" style={{ height: 120, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div className="pf-page">
      <div className="pf-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="pf-eyebrow">Community</p>
          <h1 className="pf-title">Groups</h1>
          <p className="pf-sub">Connect with your church family.</p>
        </div>
        {isPastor && (
          <button onClick={() => setShowCreate(v => !v)} className="pf-btn pf-btn--sm" style={{ flexShrink: 0 }}>
            + Create Group
          </button>
        )}
      </div>

      {toast && <div className="pf-banner" role="status">✦ {toast}</div>}

      {/* Create group form (pastor only) */}
      {showCreate && (
        <div className="pf-card pf-card--accent" style={{ marginBottom: 20 }}>
          <p className="pf-card-label" style={{ marginBottom: 14 }}>New Group</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label className="pf-label" htmlFor="group-name">Group name *</label>
              <input id="group-name" className="pf-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Wednesday Home Group" />
            </div>
            <div>
              <label className="pf-label" htmlFor="group-desc">Description</label>
              <textarea id="group-desc" className="pf-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="pf-label" htmlFor="group-type">Type</label>
                <select id="group-type" className="pf-input" value={newType} onChange={e => setNewType(e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="pf-label" htmlFor="group-schedule">Meeting schedule</label>
                <input id="group-schedule" className="pf-input" value={newSchedule} onChange={e => setNewSchedule(e.target.value)} placeholder="e.g. Every Wednesday" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCreate(false)} className="pf-btn pf-btn--quiet" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim() || creating} className="pf-btn" style={{ flex: 2 }}>
                {creating ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Groups */}
      {myGroups.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p className="pf-card-label">My Groups ({myGroups.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myGroups.map(g => <GroupCard key={g.id} g={g} />)}
          </div>
        </div>
      )}

      {/* All Groups */}
      <div>
        <p className="pf-card-label">
          {myGroups.length > 0 ? 'Other Groups' : 'All Groups'} ({otherGroups.length})
        </p>
        {otherGroups.length === 0 && myGroups.length === 0 && (
          <div className="pf-empty">
            <span className="pf-empty-icon">✦</span>
            No groups yet.
          </div>
        )}
        {otherGroups.length === 0 && myGroups.length > 0 && (
          <p className="pf-sub">You are a member of all available groups.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {otherGroups.map(g => <GroupCard key={g.id} g={g} />)}
        </div>
      </div>
    </div>
  );
}
