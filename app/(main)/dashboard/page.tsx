'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NotificationPrompt from '@/components/notifications/NotificationPrompt';
import { subscribeUser, unsubscribeUser, needsIOSInstallForPush } from '@/lib/notifications/push';

const serif = 'var(--pf-serif)';

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

  return (
    <div className="pf-page pf-page--wide">

      {/* ── greeting ── */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="pf-eyebrow">Welcome back</p>
          <h1 className="pf-title">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        </div>
        <p className="pf-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <NotificationPrompt />

      {/* ── weekly verse hero ── */}
      <section className="pf-card pf-card--accent" style={{ padding: '26px 26px 22px', marginBottom: 14 }} aria-labelledby="verse-heading">
        <p className="pf-card-label" id="verse-heading">
          This Week&rsquo;s Verse{verse?.sermon_series ? ` · ${verse.sermon_series}` : ''}
        </p>
        {verse && verseText ? (
          <>
            <blockquote style={{ margin: '0 0 10px', fontFamily: serif, fontStyle: 'italic', fontSize: 'clamp(17px, 2.4vw, 21px)', lineHeight: 1.75, color: 'var(--pf-text)', maxWidth: '62ch' }}>
              &ldquo;{verseText}&rdquo;
            </blockquote>
            <p style={{ margin: '0 0 18px', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pf-gold)' }}>
              {verse.reference} · {translation.toUpperCase()}
            </p>
          </>
        ) : (
          <p style={{ margin: '0 0 18px', fontStyle: 'italic', color: 'var(--pf-text-soft)' }}>
            No verse assigned this week yet — begin with your own passage.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/selah" className="pf-btn">✦ Begin Selah</Link>
          <Link href="/word-to-walk" className="pf-btn pf-btn--ghost">
            {journeyInProgress ? '◈ Continue your journey' : '◈ Word to Walk'}
          </Link>
        </div>
        {journeyInProgress && (
          <p className="pf-sub" style={{ marginTop: 12 }}>
            You have a meditation in progress — pick up where you left off.
          </p>
        )}
      </section>

      {/* ── unread inbox strip ── */}
      {unreadMessages > 0 && (
        <Link href="/inbox" className="pf-card pf-card--link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderColor: 'var(--pf-gold-border)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <span aria-hidden="true" style={{ color: 'var(--pf-gold)' }}>✉</span>
            {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''} in your inbox
          </span>
          <span aria-hidden="true" style={{ color: 'var(--pf-gold)' }}>→</span>
        </Link>
      )}

      {/* ── secondary grid ── */}
      <div className="pf-grid2" style={{ marginBottom: 14 }}>

        <Link href="/my-rota" className="pf-card pf-card--link">
          <p className="pf-card-label">Your Serving</p>
          {nextSlot ? (
            <div className="pf-row" style={{ border: 'none', padding: 0 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 15, color: 'var(--pf-text-bright)', fontFamily: serif }}>{nextSlot.role_name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--pf-text-soft)' }}>
                  {nextSlot.team_name} · {new Date(nextSlot.service_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span aria-hidden="true" style={{ color: 'var(--pf-gold)' }}>→</span>
            </div>
          ) : (
            <p className="pf-sub">No upcoming serving assignments.</p>
          )}
        </Link>

        <Link href="/groups" className="pf-card pf-card--link">
          <p className="pf-card-label">Your Groups</p>
          {myGroups.length === 0 ? (
            <p className="pf-sub">You haven&rsquo;t joined any groups yet — explore them.</p>
          ) : (
            myGroups.map((g) => (
              <div className="pf-row" key={g.id}>
                <span style={{ fontSize: 14, color: 'var(--pf-text-bright)', fontFamily: serif }}>{g.name}</span>
                {g.meeting_schedule && <span style={{ fontSize: 11, color: 'var(--pf-text-soft)' }}>{g.meeting_schedule}</span>}
              </div>
            ))
          )}
        </Link>

        <Link href="/announcements" className="pf-card pf-card--link">
          <p className="pf-card-label">Announcements</p>
          {latestAnnouncements.length === 0 ? (
            <p className="pf-sub">No announcements.</p>
          ) : (
            latestAnnouncements.map((a) => (
              <div className="pf-row" key={a.id}>
                <span style={{ fontSize: 14, color: a.isRead ? 'var(--pf-text)' : 'var(--pf-text-bright)', fontFamily: serif, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                {!a.isRead && <span className="pf-badge" aria-label="unread">•</span>}
              </div>
            ))
          )}
        </Link>

        <Link href="/documents" className="pf-card pf-card--link">
          <p className="pf-card-label">Resources</p>
          {featuredDocs.length === 0 ? (
            <p className="pf-sub">No resources yet.</p>
          ) : (
            featuredDocs.map((d) => (
              <div className="pf-row" key={d.id}>
                <span style={{ fontSize: 14, color: 'var(--pf-text-bright)', fontFamily: serif, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                <span className="pf-chip">{d.category}</span>
              </div>
            ))
          )}
        </Link>
      </div>

      {/* ── prayer wall invitation ── */}
      <Link href="/prayer-wall" className="pf-card pf-card--link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>🙏</span>
          <span>
            <span style={{ display: 'block', fontSize: 15, fontFamily: serif, color: 'var(--pf-text-bright)' }}>Prayer Wall</span>
            <span className="pf-sub">Stand with your church family in intercession.</span>
          </span>
        </span>
        <span aria-hidden="true" style={{ color: 'var(--pf-gold)' }}>→</span>
      </Link>

      {/* ── pastor shortcut ── */}
      {(role === 'pastor' || role === 'admin') && (
        <Link href="/pastor" className="pf-card pf-card--link pf-card--accent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span>
            <span style={{ display: 'block', fontSize: 15, fontFamily: serif, color: 'var(--pf-gold)' }}>◆ Pastor Dashboard</span>
            <span className="pf-sub">Verse, members, join requests &amp; notifications.</span>
          </span>
          <span aria-hidden="true" style={{ color: 'var(--pf-gold)' }}>→</span>
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
