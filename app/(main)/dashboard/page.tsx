'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NotificationPrompt from '@/components/notifications/NotificationPrompt';
import { subscribeUser, unsubscribeUser } from '@/lib/notifications/push';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const ROLE_LABELS: Record<string, string> = {
  member: 'Member', prophetic_team: 'Prophetic Team', pastor: 'Pastor', admin: 'Admin',
};

const QUICK_LINKS = [
  { href: '/selah',        icon: '✦', label: 'Selah Moments',  sub: 'Begin your morning stillness' },
  { href: '/word-to-walk', icon: '◈', label: 'Word to Walk',   sub: 'Seven-stage meditation journey' },
  { href: '/prayer-wall',  icon: '🙏', label: 'Prayer Wall',   sub: 'Intercede for the community' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]     = useState<{ email: string } | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [notifState, setNotifState] = useState<'unsupported' | 'denied' | 'granted' | 'default'>('default');
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser({ email: u.email ?? '' });
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
      setProfile(data ?? { full_name: null, role: 'member' });
      setLoading(false);
    })();

    if (typeof window !== 'undefined') {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setNotifState('unsupported');
      } else {
        setNotifState(Notification.permission as 'denied' | 'granted' | 'default');
      }
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
      if (permission === 'granted') {
        await subscribeUser();
        setNotifState('granted');
      } else {
        setNotifState(permission);
      }
    }
    setNotifLoading(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return null;

  return (
    <div style={{ padding: '28px 20px', maxWidth: 680, margin: '0 auto', fontFamily: S.font.body }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>
          Welcome back
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
          {greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
          &ldquo;The Lord&rsquo;s word is a lamp to your feet.&rdquo;
        </p>
      </div>

      {/* Notification prompt */}
      <NotificationPrompt />

      {/* Quick links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {QUICK_LINKS.map(({ href, icon, label, sub }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: S.card, border: `1px solid ${S.border}`, borderRadius: 3,
              padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
              transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: 22, color: S.gold, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{label}</p>
                <p style={{ margin: 0, fontSize: 12, color: S.muted, fontStyle: 'italic' }}>{sub}</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 14, color: S.muted }}>→</span>
            </div>
          </Link>
        ))}
        {(profile?.role === 'pastor' || profile?.role === 'admin') && (
          <Link href="/pastor" style={{ textDecoration: 'none' }}>
            <div style={{
              background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 3,
              padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 22, color: S.gold, lineHeight: 1, flexShrink: 0 }}>◆</span>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 15, color: S.gold, fontFamily: S.font.display }}>Pastor Dashboard</p>
                <p style={{ margin: 0, fontSize: 12, color: S.soft, fontStyle: 'italic' }}>Manage verse, members & notifications</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 14, color: S.gold }}>→</span>
            </div>
          </Link>
        )}
      </div>

      {/* Profile / settings */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '20px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(to right, ${S.border}, transparent)` }} />

        <p style={{ margin: '0 0 16px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted }}>
          Your Account
        </p>

        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: S.goldDim, border: `1px solid ${S.goldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: S.gold, flexShrink: 0,
          }}>
            {(profile?.full_name ?? user?.email ?? '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: 15, color: S.textLight, fontFamily: S.font.display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name ?? 'Community Member'}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 20, flexShrink: 0,
            background: S.goldDim, border: `1px solid ${S.goldBorder}`,
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold,
          }}>
            {ROLE_LABELS[profile?.role ?? 'member'] ?? profile?.role}
          </span>
        </div>

        {/* Notification toggle */}
        {notifState !== 'unsupported' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: `1px solid ${S.border}`, marginBottom: 12,
          }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: S.text, letterSpacing: '0.05em' }}>Push Notifications</p>
              <p style={{ margin: 0, fontSize: 11, color: S.soft, fontStyle: 'italic' }}>
                {notifState === 'granted' ? 'You will receive updates from the church' :
                 notifState === 'denied'  ? 'Blocked — enable in browser settings' :
                                            'Tap to receive church updates'}
              </p>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={notifLoading || notifState === 'denied'}
              style={{
                position: 'relative', width: 44, height: 24, flexShrink: 0,
                background: notifState === 'granted' ? S.gold : S.border,
                border: 'none', borderRadius: 12, cursor: notifState === 'denied' ? 'not-allowed' : 'pointer',
                transition: 'background 0.25s', opacity: notifLoading ? 0.6 : 1,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: notifState === 'granted' ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.25s',
              }} />
            </button>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: '100%', padding: '10px',
            background: 'transparent', border: `1px solid ${S.border}`,
            borderRadius: 2, color: signingOut ? S.muted : S.soft,
            fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: signingOut ? 'wait' : 'pointer',
            fontFamily: S.font.body, transition: 'color 0.2s, border-color 0.2s',
            minHeight: 44,
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = S.gold; (e.target as HTMLButtonElement).style.borderColor = S.goldBorder; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = S.soft; (e.target as HTMLButtonElement).style.borderColor = S.border; }}
        >
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
