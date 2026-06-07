'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  posted_by: string;
  author: { full_name: string | null };
}

interface PrayerRequest {
  id: string;
  content: string;
  is_anonymous: boolean;
  status: string;
  prayer_count: number;
  created_at: string;
  user_id: string;
  author: { full_name: string | null } | null;
}

interface GroupMember {
  id: string;
  member_id: string;
  joined_at: string;
  profile: { full_name: string | null; role: string };
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

type Tab = 'announcements' | 'prayer' | 'members';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('member');
  const [, setIsMember] = useState(false);
  const [tab, setTab] = useState<Tab>('announcements');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);

  // Announcement form
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPinned, setAnnPinned] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);

  // Prayer form
  const [showPrayForm, setShowPrayForm] = useState(false);
  const [prayContent, setPrayContent] = useState('');
  const [prayAnon, setPrayAnon] = useState(false);
  const [savingPray, setSavingPray] = useState(false);

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadAnnouncements = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('group_announcements')
      .select('id, title, content, is_pinned, created_at, posted_by, author:posted_by(full_name)')
      .eq('group_id', groupId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setAnnouncements((data as unknown as Announcement[]) ?? []);
  }, [groupId]);

  const loadPrayerRequests = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('group_prayer_requests')
      .select('id, content, is_anonymous, status, prayer_count, created_at, user_id, author:user_id(full_name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    setPrayerRequests((data as unknown as PrayerRequest[]) ?? []);
  }, [groupId]);

  const loadMembers = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('group_members')
      .select('id, member_id, joined_at, profile:member_id(full_name, role)')
      .eq('group_id', groupId)
      .order('joined_at');
    setMembers((data as unknown as GroupMember[]) ?? []);
  }, [groupId]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const [profileRes, groupRes, membershipRes] = await Promise.allSettled([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('groups').select('id, name, description, type, leader_id, meeting_schedule, meeting_location').eq('id', groupId).maybeSingle(),
        supabase.from('group_members').select('id').eq('group_id', groupId).eq('member_id', user.id).maybeSingle(),
      ]);

      const role = profileRes.status === 'fulfilled' ? profileRes.value.data?.role ?? 'member' : 'member';
      setUserRole(role);

      if (groupRes.status === 'fulfilled') setGroup(groupRes.value.data as Group);
      const isPastor = ['pastor', 'admin'].includes(role);
      const member = membershipRes.status === 'fulfilled' && !!membershipRes.value.data;
      setIsMember(member || isPastor);

      if (!member && !isPastor) { router.replace('/groups'); return; }

      await Promise.all([loadAnnouncements(supabase), loadPrayerRequests(supabase), loadMembers(supabase)]);
      setLoading(false);
    })();
  }, [groupId, router, loadAnnouncements, loadPrayerRequests, loadMembers]);

  const isPastor = ['pastor', 'admin'].includes(userRole);
  const isLeader = group?.leader_id === userId || isPastor;

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim() || !userId) return;
    setSavingAnn(true);
    const supabase = createClient();
    await supabase.from('group_announcements').insert({ group_id: groupId, posted_by: userId, title: annTitle.trim(), content: annContent.trim(), is_pinned: annPinned });
    setAnnTitle(''); setAnnContent(''); setAnnPinned(false);
    setShowAnnForm(false);
    await loadAnnouncements(supabase);
    showToast('Announcement posted.');
    setSavingAnn(false);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const supabase = createClient();
    await supabase.from('group_announcements').delete().eq('id', id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    showToast('Deleted.');
  };

  const handleSubmitPrayer = async () => {
    if (!prayContent.trim() || !userId) return;
    setSavingPray(true);
    const supabase = createClient();
    await supabase.from('group_prayer_requests').insert({ group_id: groupId, user_id: userId, content: prayContent.trim(), is_anonymous: prayAnon });
    setPrayContent(''); setPrayAnon(false);
    setShowPrayForm(false);
    await loadPrayerRequests(supabase);
    showToast('Prayer request submitted.');
    setSavingPray(false);
  };

  const handlePrayed = async (req: PrayerRequest) => {
    const supabase = createClient();
    await supabase.from('group_prayer_requests').update({ prayer_count: req.prayer_count + 1 }).eq('id', req.id);
    setPrayerRequests(prev => prev.map(r => r.id === req.id ? { ...r, prayer_count: r.prayer_count + 1 } : r));
  };

  const handleMarkAnswered = async (id: string) => {
    const supabase = createClient();
    await supabase.from('group_prayer_requests').update({ status: 'answered' }).eq('id', id);
    setPrayerRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'answered' } : r));
    showToast('Marked as answered. Praise God!');
  };

  const handleRemoveMember = async (gmId: string) => {
    const supabase = createClient();
    await supabase.from('group_members').delete().eq('id', gmId);
    setMembers(prev => prev.filter(m => m.id !== gmId));
    showToast('Member removed.');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic', fontFamily: S.font.body }}>Loading…</p>
    </div>
  );

  if (!group) return null;

  const activePrayers = prayerRequests.filter(r => r.status === 'active');
  const answeredPrayers = prayerRequests.filter(r => r.status === 'answered');

  return (
    <div style={{ padding: '28px 20px', maxWidth: 680, margin: '0 auto', fontFamily: S.font.body }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/groups" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 12, color: S.soft, cursor: 'pointer' }}>← Back to Groups</span>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>{group.name}</h1>
          {group.description && <p style={{ margin: '0 0 4px', fontSize: 13, color: S.soft, fontStyle: 'italic' }}>{group.description}</p>}
          {group.meeting_schedule && <p style={{ margin: 0, fontSize: 12, color: S.muted }}>📅 {group.meeting_schedule}{group.meeting_location && ` · ${group.meeting_location}`}</p>}
        </div>
        {isPastor && (
          <Link href={`/groups/${groupId}/manage`} style={{ textDecoration: 'none' }}>
            <button style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Manage</button>
          </Link>
        )}
      </div>

      {toast && <div style={{ marginBottom: 16, padding: '10px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 13, color: S.gold }}>✦ {toast}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['announcements', 'prayer', 'members'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', background: tab === t ? S.goldDim : 'transparent', border: `1px solid ${tab === t ? S.goldBorder : S.border}`, borderRadius: 2, color: tab === t ? S.gold : S.muted, fontSize: 10, letterSpacing: '0.1em', textTransform: 'capitalize', cursor: 'pointer', fontFamily: S.font.body }}>
            {t === 'prayer' ? 'Prayer' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'members' && <span style={{ marginLeft: 4, opacity: 0.6 }}>({members.length})</span>}
          </button>
        ))}
      </div>

      {/* ── ANNOUNCEMENTS ── */}
      {tab === 'announcements' && (
        <div>
          {isLeader && (
            <div style={{ marginBottom: 16 }}>
              {!showAnnForm ? (
                <button onClick={() => setShowAnnForm(true)} style={{ padding: '8px 18px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em' }}>
                  + Post Announcement
                </button>
              ) : (
                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px' }}>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                    <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Title *" style={inputStyle} />
                    <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Content *" rows={4} style={{ ...inputStyle, resize: 'none' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={annPinned} onChange={e => setAnnPinned(e.target.checked)} />
                      <span style={{ fontSize: 12, color: S.muted }}>Pin this announcement</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowAnnForm(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
                    <button onClick={handlePostAnnouncement} disabled={!annTitle.trim() || !annContent.trim() || savingAnn} style={{ flex: 2, padding: '9px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 12, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body }}>
                      {savingAnn ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {announcements.length === 0 && <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic', textAlign: 'center', padding: '32px 0' }}>No announcements yet.</p>}

          {announcements.map(a => (
            <div key={a.id} style={{ background: S.card, border: `1px solid ${a.is_pinned ? S.goldBorder : S.border}`, borderLeft: `3px solid ${a.is_pinned ? S.gold : S.border}`, borderRadius: '0 3px 3px 0', padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div>
                  {a.is_pinned && <span style={{ fontSize: 9, letterSpacing: '0.12em', color: S.gold, textTransform: 'uppercase', marginRight: 8 }}>📌 Pinned</span>}
                  <p style={{ margin: '0 0 2px', fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{a.title}</p>
                  <p style={{ margin: 0, fontSize: 10, color: S.soft }}>
                    {a.author?.full_name ?? 'Unknown'} · {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {(a.posted_by === userId || isPastor) && (
                  <button onClick={() => handleDeleteAnnouncement(a.id)} style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, flexShrink: 0 }}>Delete</button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: S.text, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── PRAYER ── */}
      {tab === 'prayer' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            {!showPrayForm ? (
              <button onClick={() => setShowPrayForm(true)} style={{ padding: '8px 18px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em' }}>
                + Submit Prayer Request
              </button>
            ) : (
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 16 }}>
                <textarea value={prayContent} onChange={e => setPrayContent(e.target.value)} placeholder="Share your prayer request with the group…" rows={4} style={{ ...inputStyle, resize: 'none', marginBottom: 10 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
                  <input type="checkbox" checked={prayAnon} onChange={e => setPrayAnon(e.target.checked)} />
                  <span style={{ fontSize: 12, color: S.muted }}>Submit anonymously</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowPrayForm(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
                  <button onClick={handleSubmitPrayer} disabled={!prayContent.trim() || savingPray} style={{ flex: 2, padding: '9px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 12, fontWeight: 'bold', cursor: 'pointer', fontFamily: S.font.body }}>
                    {savingPray ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {activePrayers.length === 0 && <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic', textAlign: 'center', padding: '32px 0' }}>No active prayer requests.</p>}

          {activePrayers.map(r => (
            <div key={r.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 11, color: S.soft }}>
                  {r.is_anonymous ? 'Anonymous' : (r.author?.full_name ?? 'Unknown')} · {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
                <span style={{ fontSize: 11, color: S.muted }}>🙏 {r.prayer_count}</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: S.text, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{r.content}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => handlePrayed(r)} style={{ padding: '6px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.06em' }}>I am Praying</button>
                {(r.user_id === userId || isLeader) && (
                  <button onClick={() => handleMarkAnswered(r.id)} style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: '#5a8a5a', fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.06em' }}>Mark Answered</button>
                )}
              </div>
            </div>
          ))}

          {answeredPrayers.length > 0 && (
            <div style={{ marginTop: 24, opacity: 0.7 }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5a8a5a' }}>Answered Prayers ✦</p>
              {answeredPrayers.map(r => (
                <div key={r.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderLeft: '3px solid #5a8a5a', borderRadius: '0 3px 3px 0', padding: '12px 14px', marginBottom: 8 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: S.soft }}>{r.is_anonymous ? 'Anonymous' : r.author?.full_name}</p>
                  <p style={{ margin: 0, fontSize: 13, color: S.text, lineHeight: 1.7 }}>{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERS ── */}
      {tab === 'members' && (
        <div>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: S.goldDim, border: `1px solid ${S.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: S.gold, flexShrink: 0 }}>
                  {(m.profile.full_name ?? '?')[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, color: S.textLight, fontFamily: S.font.display }}>
                    {m.profile.full_name ?? 'Unnamed'}
                    {m.member_id === group?.leader_id && <span style={{ marginLeft: 6, fontSize: 12 }}>👑</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: S.soft }}>Joined {new Date(m.joined_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              {isPastor && m.member_id !== userId && (
                <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
