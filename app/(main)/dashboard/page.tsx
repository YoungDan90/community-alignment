'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NotificationPrompt from '@/components/notifications/NotificationPrompt';
import { subscribeUser, unsubscribeUser, needsIOSInstallForPush } from '@/lib/notifications/push';

interface ActiveVerse {
  reference: string;
  nkjv_text: string | null;
  nlt_text: string | null;
  sermon_series: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [role, setRole] = useState('member');
  const [translation, setTranslation] = useState<'nkjv' | 'nlt'>('nkjv');
  const [verse, setVerse] = useState<ActiveVerse | null>(null);
  const [journeyInProgress, setJourneyInProgress] = useState(false);
  const [nextSlot, setNextSlot] = useState<{ role_name: string; service_date: string; team_name: string } | null>(null);
  const [myGroups, setMyGroups] = useState<{ id: string; name: string; meeting_schedule: string | null }[]>([]);
  const [latestAnnouncements, setLatestAnnouncements] = useState<{ id: string; title: string; isRead: boolean }[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [featuredDocs, setFeaturedDocs] = useState<{ id: string; title: string; category: string }[]>([]);
  const [notifState, setNotifState] = useState<'unsupported' | 'denied' | 'granted' | 'default' | 'needs_ios_install'>('default');
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const [profileRes, verseRes, journeyRes, slotRes, groupsRes, annRes, msgRes, docsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, role, preferred_translation').eq('id', user.id).maybeSingle(),
        supabase.from('verses').select('reference, nkjv_text, nlt_text, sermon_series')
          .eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('meditations').select('id').eq('user_id', user.id).eq('status', 'in_progress')
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('rota_slots')
          .select('role_name, rota:rota_id!inner(service_date, team:team_id(name))')
          .eq('member_id', user.id)
          .gte('rota.service_date', today)
          .order('rota(service_date)', { ascending: true })
          .limit(1).maybeSingle(),
        supabase.from('group_members').select('group:group_id(id, name, meeting_schedule)')
          .eq('member_id', user.id).limit(2),
        supabase.from('announcements').select('id, title')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }).limit(2),
        supabase.from('inbox_messages').select('id', { count: 'exact', head: true })
          .eq('to_id', user.id).eq('is_read', false),
        supabase.from('documents').select('id, title, category')
          .eq('is_featured', true).order('created_at', { ascending: false }).limit(3),
      ]);

      const profile = profileRes.data;
      setFirstName(profile?.full_name?.split(' ')[0] ?? null);
      setRole(profile?.role ?? 'member');
      const tr = (profile?.preferred_translation as 'nkjv' | 'nlt') ?? 'nkjv';
      setTranslation(tr);

      setVerse(verseRes.data ?? null);
      setJourneyInProgress(!!journeyRes.data);

      const rota = slotRes.data?.rota as unknown as { service_date: string; team: { name: string } | { name: string }[] } | null;
      if (slotRes.data && rota?.service_date) {
        const team = Array.isArray(rota.team) ? rota.team[0] : rota.team;
        setNextSlot({ role_name: slotRes.data.role_name, service_date: rota.service_date, team_name: team?.name ?? '' });
      }

      setMyGroups(((groupsRes.data ?? []) as { group: { id: string; name: string; meeting_schedule: string | null }[] | { id: string; name: string; meeting_schedule: string | null } }[])
        .map((gm) => (Array.isArray(gm.group) ? gm.group[0] : gm.group))
        .filter(Boolean));

      const annData = annRes.data ?? [];
      if (annData.length > 0) {
        const { data: reads } = await supabase
          .from('announcement_reads').select('announcement_id')
          .eq('user_id', user.id)
          .in('announcement_id', annData.map((a: { id: string }) => a.id));
        const readSet = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));
        setLatestAnnouncements(annData.map((a: { id: string; title: string }) => ({ ...a, isRead: readSet.has(a.id) })));
      }

      setUnreadMessages(msgRes.count ?? 0);
      setFeaturedDocs(docsRes.data ?? []);
      setLoading(false);
    })();

    if (typeof window !== 'undefined') {
      if (needsIOSInstallForPush()) setNotifState('needs_ios_install');
      else if (!('Notification' in window) || !('serviceWorker' in navigator)) setNotifState('unsupported');
      else setNotifState(Notification.permission as 'denied' | 'granted' | 'default');
    }
  }, [router]);

  const handleToggleNotifications = async () => {
    setNotifLoading(true);
    if (notifState === 'granted') {
      await unsubscribeUser();
      setNotifState('default');
      localStorage.removeItem('notification_prompt_dismissed');
    } else {
      const { requestPermission } = await import('@/lib/notifications/push');
      const permission = await requestPermission();
      if (permission === 'granted') { await subscribeUser(); setNotifState('granted'); }
      else setNotifState(permission);
    }
    setNotifLoading(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const verseText = verse
    ? (translation === 'nkjv' ? verse.nkjv_text : verse.nlt_text) ?? verse.nkjv_text ?? verse.nlt_text
    : null;

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="pf-page pf-page--wide">
        <div className="pf-skel" style={{ height: 26, width: 240, marginBottom: 22 }} />
        <div className="pf-skel" style={{ height: 190, marginBottom: 14, borderRadius: 6 }} />
        <div className="pf-grid2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="pf-skel" style={{ height: 110, borderRadius: 6 }} />)}
        </div>
      </div>
    );
  }

  const hasServing = !!nextSlot;
  const hasGroup = myGroups.length > 0;
  const hasAnnouncement = latestAnnouncements.length > 0;

  return (
    <div className="pf-page pf-page--wide">

      {/* ── scene header ── */}
      <div className="pf-scene-head">
        <div className="pf-scene-row">
          <span className="pf-scene-brand"><span style={{ color: 'var(--pf-gold)' }}>✦</span> Alignment Church</span>
          <Link href="/announcements" className="pf-scene-iconbtn" aria-label="Announcements">
            🔔
            {unreadMessages > 0 && <span className="pf-badge pf-badge--dot" aria-hidden="true">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
          </Link>
        </div>
        <h1 className="pf-scene-greeting">{greeting()}{firstName ? `, ${firstName}.` : '.'}</h1>
      </div>

      <NotificationPrompt />

      {/* ── hero: today's verse, one focused action ── */}
      <section className="pf-hero" style={{ marginBottom: 24 }} aria-labelledby="verse-heading">
        <p className="pf-hero-label" id="verse-heading">
          ✦ Today&rsquo;s Verse{verse?.sermon_series ? ` · ${verse.sermon_series}` : ''}
        </p>
        {verse && verseText ? (
          <>
            <p className="pf-hero-quote">&ldquo;{verseText}&rdquo;</p>
            <p className="pf-hero-meta">{verse.reference.toUpperCase()} · {translation.toUpperCase()}</p>
          </>
        ) : (
          <p className="pf-hero-quote" style={{ fontSize: 15 }}>No verse assigned this week yet — begin with your own passage.</p>
        )}
        <Link href="/selah" className="pf-btn">Begin Today&rsquo;s Selah</Link>
        <div style={{ marginTop: 10 }}>
          <Link href="/word-to-walk" className="pf-section-action" style={{ display: 'inline-block' }}>
            {journeyInProgress ? '◈ Continue your Word to Walk journey →' : '◈ Word to Walk →'}
          </Link>
        </div>
      </section>

      {/* ── this week: horizontal carousel ── */}
      <div className="pf-section-head" style={{ padding: '0 4px' }}>
        <p className="pf-section-label">This Week</p>
      </div>
      <div className="pf-carousel" style={{ marginBottom: 24 }}>
        <Link href="/my-rota" className="pf-carousel-card">
          <p className="pf-carousel-card-icon">◆</p>
          <p className="pf-carousel-card-title">Serving</p>
          {hasServing ? (
            <p className="pf-carousel-card-sub">
              {nextSlot!.role_name}<br />
              {new Date(nextSlot!.service_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          ) : (
            <p className="pf-carousel-card-sub">No upcoming slots</p>
          )}
        </Link>

        <Link href="/groups" className="pf-carousel-card">
          <p className="pf-carousel-card-icon">◉</p>
          <p className="pf-carousel-card-title">{hasGroup ? myGroups[0].name : 'Groups'}</p>
          <p className="pf-carousel-card-sub">
            {hasGroup ? (myGroups[0].meeting_schedule ?? 'Your group') : 'Explore and join one'}
          </p>
        </Link>

        <Link href="/inbox" className={`pf-carousel-card${unreadMessages > 0 ? ' pf-carousel-card--accent' : ''}`}>
          <p className="pf-carousel-card-icon">✉</p>
          <p className="pf-carousel-card-title">Inbox</p>
          <p className="pf-carousel-card-sub" style={unreadMessages > 0 ? { color: 'var(--pf-gold)' } : undefined}>
            {unreadMessages > 0 ? `${unreadMessages} new message${unreadMessages !== 1 ? 's' : ''}` : 'No new messages'}
          </p>
        </Link>

        <Link href="/documents" className="pf-carousel-card">
          <p className="pf-carousel-card-icon">📂</p>
          <p className="pf-carousel-card-title">Resources</p>
          <p className="pf-carousel-card-sub">
            {featuredDocs.length > 0 ? featuredDocs[0].title : 'Browse the library'}
          </p>
        </Link>
      </div>

      {/* ── explore: icon-grid shortcuts ── */}
      <p className="pf-section-label" style={{ padding: '0 4px', marginBottom: 10 }}>Explore</p>
      <nav className="pf-explore" aria-label="Explore" style={{ marginBottom: 22 }}>
        <Link href="/prayer-wall" className="pf-explore-item">
          <span className="pf-explore-icon" aria-hidden="true">🙏</span>
          <span className="pf-explore-label">Prayer<br />Wall</span>
        </Link>
        <Link href="/documents" className="pf-explore-item">
          <span className="pf-explore-icon" aria-hidden="true">📂</span>
          <span className="pf-explore-label">Resources</span>
        </Link>
        <Link href="/calendar" className="pf-explore-item">
          <span className="pf-explore-icon" aria-hidden="true">📅</span>
          <span className="pf-explore-label">Calendar</span>
        </Link>
        <Link href="/my-rota" className="pf-explore-item">
          <span className="pf-explore-icon" aria-hidden="true">◆</span>
          <span className="pf-explore-label">My Rota</span>
        </Link>
        {(role === 'pastor' || role === 'admin') && (
          <Link href="/pastor" className="pf-explore-item">
            <span className="pf-explore-icon" aria-hidden="true">◈</span>
            <span className="pf-explore-label">Pastor<br />Dashboard</span>
          </Link>
        )}
      </nav>

      {/* ── latest announcement strip ── */}
      {hasAnnouncement && (
        <Link href="/announcements" className="pf-notice-strip" style={{ marginBottom: 14 }}>
          <span aria-hidden="true" style={{ fontSize: 14 }}>📢</span>
          <span className="pf-notice-strip-text">{latestAnnouncements[0].title}</span>
          {!latestAnnouncements[0].isRead && <span className="pf-badge" aria-label="unread">•</span>}
        </Link>
      )}

      {/* ── push toggle ── */}
      {notifState !== 'unsupported' && (
        <div className="pf-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 13, letterSpacing: '0.05em' }}>Push Notifications</p>
            <p className="pf-sub">
              {notifState === 'granted' ? 'You will receive updates from the church' :
               notifState === 'denied' ? 'Blocked — enable in browser settings' :
               notifState === 'needs_ios_install' ? 'Add this to your Home Screen first (Share → Add to Home Screen)' :
               'Tap to receive church updates'}
            </p>
          </div>
          <button
            onClick={handleToggleNotifications}
            disabled={notifLoading || notifState === 'denied' || notifState === 'needs_ios_install'}
            role="switch"
            aria-checked={notifState === 'granted'}
            aria-label="Push notifications"
            style={{
              position: 'relative', width: 44, height: 24, flexShrink: 0,
              background: notifState === 'granted' ? 'var(--pf-gold)' : 'var(--pf-border)',
              border: 'none', borderRadius: 12,
              cursor: (notifState === 'denied' || notifState === 'needs_ios_install') ? 'not-allowed' : 'pointer',
              transition: 'background 0.25s', opacity: notifLoading ? 0.6 : 1,
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: notifState === 'granted' ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.25s',
            }} />
          </button>
        </div>
      )}
    </div>
  );
}
