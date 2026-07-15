'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: string;
  leader_id: string | null;
  meeting_schedule: string | null;
  meeting_location: string | null;
  is_active: boolean;
}

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface GroupMember {
  id: string;
  member_id: string;
  profile: { full_name: string | null };
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

const TYPE_OPTIONS = ['general', 'home_group', 'mens', 'womens', 'bible_study', 'fellowship'] as const;
const TYPE_LABELS: Record<string, string> = {
  home_group: 'Home Group', mens: "Men's", womens: "Women's",
  bible_study: 'Bible Study', fellowship: 'Fellowship', general: 'General',
};

export default function GroupManagePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('general');
  const [schedule, setSchedule] = useState('');
  const [location, setLocation] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [addMemberId, setAddMemberId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadGroupMembers = async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('group_members')
      .select('id, member_id, profile:member_id(full_name)')
      .eq('group_id', groupId)
      .order('joined_at');
    setGroupMembers((data as unknown as GroupMember[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/dashboard'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!['pastor', 'admin'].includes(profile?.role ?? '')) { router.replace('/groups'); return; }

      const [groupRes, membersRes] = await Promise.allSettled([
        supabase.from('groups').select('*').eq('id', groupId).maybeSingle(),
        supabase.from('profiles').select('id, full_name').order('full_name'),
      ]);

      if (groupRes.status === 'fulfilled' && groupRes.value.data) {
        const g = groupRes.value.data as Group;
        setGroup(g);
        setName(g.name);
        setDesc(g.description ?? '');
        setType(g.type);
        setSchedule(g.meeting_schedule ?? '');
        setLocation(g.meeting_location ?? '');
        setLeaderId(g.leader_id ?? '');
        setIsActive(g.is_active);
      }

      if (membersRes.status === 'fulfilled') setAllMembers((membersRes.value.data as MemberOption[]) ?? []);
      await loadGroupMembers(supabase);
      setLoading(false);
    })();
  }, [groupId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('groups').update({
      name: name.trim(),
      description: desc.trim() || null,
      type,
      meeting_schedule: schedule.trim() || null,
      meeting_location: location.trim() || null,
      leader_id: leaderId || null,
      is_active: isActive,
    }).eq('id', groupId);
    if (!error) { setGroup(prev => prev ? { ...prev, name: name.trim(), description: desc.trim() || null, type, meeting_schedule: schedule.trim() || null, meeting_location: location.trim() || null, leader_id: leaderId || null, is_active: isActive } : prev); showToast('Group saved.'); }
    else showToast('Failed to save.');
    setSaving(false);
  };

  const handleAddMember = async () => {
    if (!addMemberId) return;
    const supabase = createClient();
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, member_id: addMemberId });
    if (!error) { setAddMemberId(''); await loadGroupMembers(supabase); showToast('Member added.'); }
    else showToast('Already a member or error.');
  };

  const handleRemoveMember = async (gmId: string) => {
    const supabase = createClient();
    await supabase.from('group_members').delete().eq('id', gmId);
    setGroupMembers(prev => prev.filter(m => m.id !== gmId));
    showToast('Member removed.');
  };

  const handleDelete = async () => {
    const supabase = createClient();
    await supabase.from('groups').delete().eq('id', groupId);
    router.replace('/groups');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic', fontFamily: S.font.body }}>Loading…</p>
    </div>
  );

  const notInGroup = allMembers.filter(m => !groupMembers.some(gm => gm.member_id === m.id));

  return (
    <div style={{ padding: '28px 20px', maxWidth: 680, margin: '0 auto', fontFamily: S.font.body }}>
      <div style={{ marginBottom: 20 }}>
        <Link href={`/groups/${groupId}`} style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 12, color: S.soft, cursor: 'pointer' }}>← Back to Group</span>
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>Group Management</p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>{group?.name}</h1>
      </div>

      {toast && <div style={{ marginBottom: 16, padding: '10px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 13, color: S.gold }}>✦ {toast}</div>}

      {/* Group Details */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '18px 18px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 14px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Group Details</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Leader</label>
              <select value={leaderId} onChange={e => setLeaderId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— None —</option>
                {allMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Meeting Schedule</label>
              <input value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="e.g. Every Wednesday" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Meeting Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Address or venue" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${S.border}` }}>
            <p style={{ margin: 0, fontSize: 12, color: S.text }}>Group is active</p>
            <button type="button" onClick={() => setIsActive(v => !v)} style={{ position: 'relative', width: 44, height: 24, background: isActive ? S.gold : S.border, border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'background 0.25s' }}>
              <span style={{ position: 'absolute', top: 3, left: isActive ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.25s' }} />
            </button>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ marginTop: 14, padding: '11px 28px', background: saving ? 'rgba(198,167,94,0.3)' : S.gold, border: 'none', borderRadius: 2, color: saving ? S.muted : S.dark, fontSize: 13, fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer', fontFamily: S.font.body, letterSpacing: '0.06em' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Members */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '18px 18px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 14px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Members ({groupMembers.length})</p>

        {groupMembers.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${S.border}` }}>
            <p style={{ margin: 0, fontSize: 14, color: S.textLight, fontFamily: S.font.display }}>{m.profile.full_name ?? 'Unnamed'}</p>
            <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Remove</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer', padding: '9px 12px', fontSize: 13 }}>
            <option value="">Add a member…</option>
            {notInGroup.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
          </select>
          <button onClick={handleAddMember} disabled={!addMemberId} style={{ padding: '9px 14px', background: addMemberId ? S.goldDim : 'transparent', border: `1px solid ${addMemberId ? S.goldBorder : S.border}`, borderRadius: 2, color: addMemberId ? S.gold : S.muted, fontSize: 11, cursor: addMemberId ? 'pointer' : 'not-allowed', fontFamily: S.font.body, flexShrink: 0 }}>
            + Add
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ background: S.card, border: '1px solid rgba(196,122,122,0.3)', borderRadius: 3, padding: '16px 18px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c47a7a' }}>Danger Zone</p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid rgba(196,122,122,0.4)', borderRadius: 2, color: '#c47a7a', fontSize: 12, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.06em' }}>
            Delete Group
          </button>
        ) : (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#c47a7a' }}>This will permanently delete the group and all its content. Are you sure?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '9px', background: 'rgba(196,122,122,0.15)', border: '1px solid rgba(196,122,122,0.4)', borderRadius: 2, color: '#c47a7a', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body }}>Yes, Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
