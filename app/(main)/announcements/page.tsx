'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ComposeAnnouncement from '@/components/announcements/ComposeAnnouncement';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  general:  { label: 'General',  color: S.soft },
  urgent:   { label: 'Urgent',   color: '#e05555' },
  event:    { label: 'Event',    color: '#5588e0' },
  prayer:   { label: 'Prayer',   color: '#9055e0' },
  pastoral: { label: 'Pastoral', color: S.gold },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'All', members: 'Members', leaders: 'Leaders',
};

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  audience: string;
  group_id: string | null;
  is_pinned: boolean;
  created_at: string;
  expires_at: string | null;
  poster: { full_name: string | null } | null;
  group: { name: string } | null;
  isRead: boolean;
}

type FilterTab = 'all' | 'unread' | 'pinned';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPastor, setIsPastor] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [userId, setUserId] = useState('');

  const loadAnnouncements = useCallback(async (uid: string) => {
    const supabase = createClient();
    const now = new Date().toISOString();

    const { data } = await supabase
      .from('announcements')
      .select('id, title, content, type, audience, group_id, is_pinned, created_at, expires_at, poster:posted_by(full_name), group:group_id(name)')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', uid);

    const readSet = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));

    setAnnouncements((data ?? []).map((a: {
      id: string; title: string; content: string; type: string; audience: string;
      group_id: string | null; is_pinned: boolean; created_at: string; expires_at: string | null;
      poster: { full_name: string | null }[] | { full_name: string | null } | null;
      group: { name: string }[] | { name: string } | null;
    }) => ({
      ...a,
      poster: Array.isArray(a.poster) ? (a.poster[0] ?? null) : a.poster,
      group: Array.isArray(a.group) ? (a.group[0] ?? null) : a.group,
      isRead: readSet.has(a.id),
    })));
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      setIsPastor(['pastor', 'admin'].includes(profile?.role ?? ''));
      await loadAnnouncements(user.id);
      setLoading(false);
    })();
  }, [router, loadAnnouncements]);

  const handleExpand = async (ann: Announcement) => {
    if (expandedId === ann.id) { setExpandedId(null); return; }
    setExpandedId(ann.id);
    if (!ann.isRead && userId) {
      const supabase = createClient();
      await supabase.from('announcement_reads').upsert({ announcement_id: ann.id, user_id: userId });
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, isRead: true } : a));
    }
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const filtered = announcements.filter(a => {
    if (filterTab === 'unread') return !a.isRead;
    if (filterTab === 'pinned') return a.is_pinned;
    return true;
  });

  const unreadCount = announcements.filter(a => !a.isRead).length;

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 220, marginBottom: 20 }} />
      {[0, 1, 2, 3].map((i) => <div key={i} className="pf-skel" style={{ height: 84, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div className="pf-page">
      <div className="pf-head">
        <p className="pf-eyebrow">Church Announcements</p>
        <h1 className="pf-title">Announcements</h1>
        <p className="pf-sub">Stay up to date with what&rsquo;s happening.</p>
      </div>

      {isPastor && !showCompose && (
        <button
          onClick={() => setShowCompose(true)}
          className="pf-btn pf-btn--ghost"
          style={{ display: 'flex', width: '100%', marginBottom: 20 }}
        >
          + Post New Announcement
        </button>
      )}

      {showCompose && (
        <ComposeAnnouncement
          onClose={() => setShowCompose(false)}
          onPosted={async () => { setShowCompose(false); if (userId) await loadAnnouncements(userId); }}
        />
      )}

      {/* Filter tabs */}
      <div className="pf-tabs" role="tablist">
        {(['all', 'unread', 'pinned'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={filterTab === tab}
            onClick={() => setFilterTab(tab)}
            className="pf-tabbtn"
          >
            {tab === 'unread' ? 'Unread' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'unread' && unreadCount > 0 && (
              <span className="pf-badge" style={{ background: '#e05555', color: '#fff' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-icon" aria-hidden="true">📢</span>
          {filterTab === 'unread' ? 'All caught up!' : filterTab === 'pinned' ? 'No pinned announcements.' : 'No announcements yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(ann => {
            const meta = TYPE_META[ann.type] ?? TYPE_META.general;
            const isExpanded = expandedId === ann.id;
            const audienceLabel = ann.audience === 'specific_group'
              ? ann.group?.name ?? 'Group'
              : AUDIENCE_LABELS[ann.audience] ?? ann.audience;

            return (
              <div
                key={ann.id}
                onClick={() => handleExpand(ann)}
                style={{
                  background: S.card,
                  border: `1px solid ${ann.is_pinned ? S.gold + '55' : ann.isRead ? S.border : S.gold + '33'}`,
                  borderRadius: 3, padding: '14px 16px',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                {ann.is_pinned && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}88, transparent)` }} />
                )}

                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 2,
                    background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40`,
                  }}>{meta.label}</span>
                  <span style={{
                    fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 2,
                    background: S.goldDim, color: S.gold, border: `1px solid ${S.goldBorder}`,
                  }}>{audienceLabel}</span>
                  {ann.is_pinned && (
                    <span style={{ fontSize: 10, color: S.gold }}>📌</span>
                  )}
                  {!ann.isRead && (
                    <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: S.gold, flexShrink: 0 }} />
                  )}
                </div>

                <p style={{ margin: '0 0 4px', fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>
                  {ann.title}
                </p>

                {!isExpanded && (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: S.text, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {ann.content}
                  </p>
                )}

                {isExpanded && (
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: S.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {ann.content}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: 11, color: S.soft }}>
                    {ann.poster?.full_name ?? 'Church'} · {timeAgo(ann.created_at)}
                  </p>
                  {isExpanded && isPastor && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(ann.id); }}
                      style={{ background: 'transparent', border: 'none', color: '#e05555', fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, padding: '2px 6px' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
