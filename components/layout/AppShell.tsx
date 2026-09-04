'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ROLE_LABELS: Record<string, string> = {
  member: 'Member', prophetic_team: 'Prophetic Team', pastor: 'Pastor', admin: 'Senior Leader',
};

interface NavItem { href: string; label: string; icon: string; badge?: number }
interface NavGroup { label?: string; items: NavItem[] }

const MOBILE_TABS: NavItem[] = [
  { href: '/dashboard',    label: 'Home',    icon: '⌂' },
  { href: '/word-to-walk', label: 'Word',    icon: '◈' },
  { href: '/groups',       label: 'Groups',  icon: '◉' },
  { href: '/inbox',        label: 'Inbox',   icon: '✉' },
  { href: '/profile',      label: 'Profile', icon: '✦' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState('member');
  const [roles, setRoles] = useState<string[]>(['member']);
  const [status, setStatus] = useState<'pending' | 'approved' | 'declined' | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [unread, setUnread] = useState({ inbox: 0, announcements: 0 });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      const [profileRes, rolesRes, msgRes, annRes] = await Promise.all([
        supabase.from('profiles').select('role, full_name, status').eq('id', user.id).maybeSingle(),
        supabase.rpc('get_my_roles'),
        supabase.from('inbox_messages').select('id', { count: 'exact', head: true }).eq('to_id', user.id).eq('is_read', false),
        supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${now}`),
      ]);

      if (profileRes.data?.role) setRole(profileRes.data.role);
      if (rolesRes.data) setRoles(rolesRes.data as string[]);
      setStatus((profileRes.data?.status as typeof status) ?? 'approved');
      setFullName(profileRes.data?.full_name ?? null);

      let unreadAnn = 0;
      const annIds = (annRes.data ?? []).map((a: { id: string }) => a.id);
      if (annIds.length > 0) {
        const { count: readCount } = await supabase
          .from('announcement_reads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('announcement_id', annIds);
        unreadAnn = Math.max(0, annIds.length - (readCount ?? 0));
      }
      setUnread({ inbox: msgRes.count ?? 0, announcements: unreadAnn });
    })();
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // New signups start 'pending' and get no app access until a pastor/admin
  // approves them — RLS backs this up server-side, this just keeps a
  // pending/declined person from seeing any page while they wait.
  if (status === 'pending' || status === 'declined') {
    const declined = status === 'declined';
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', background: '#0f1e2e' }}>
        <div style={{ maxWidth: 420 }}>
          <p style={{ fontSize: 36, color: declined ? '#6a8aaa' : '#c6a75e', margin: '0 0 20px' }}>{declined ? '✕' : '✦'}</p>
          <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 'normal', fontSize: 24, color: '#f0e8d4', margin: '0 0 12px' }}>
            {declined ? 'Request Not Approved' : 'Your Account Is Pending Approval'}
          </h1>
          <p style={{ fontSize: 14, color: '#6a8aaa', fontStyle: 'italic', margin: '0 0 28px', lineHeight: 1.7 }}>
            {declined
              ? "Your access request wasn't approved. If you believe this is a mistake, please contact the church office directly."
              : "Thanks for signing up" + (fullName ? `, ${fullName}` : '') + ". A pastor reviews new accounts personally — you'll get access as soon as you're approved."}
          </p>
          <button
            onClick={handleSignOut}
            style={{ padding: '10px 22px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3a52', borderRadius: 2, color: '#6a8aaa', fontSize: 13, cursor: 'pointer', fontFamily: "var(--font-jost), 'Jost', sans-serif" }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const isPastor = roles.some(r => r === 'pastor' || r === 'admin');

  const groups: NavGroup[] = [
    { items: [{ href: '/dashboard', label: 'Home', icon: '⌂' }] },
    {
      label: 'Grow',
      items: [
        { href: '/selah',        label: 'Selah Moments', icon: '✦' },
        { href: '/word-to-walk', label: 'Word to Walk',  icon: '◈' },
        { href: '/discipleship', label: 'Discipleship',  icon: '🕊' },
        { href: '/one-to-one',   label: '1:1',           icon: '🤝' },
      ],
    },
    {
      label: 'Community',
      items: [
        { href: '/calendar',      label: 'Calendar',      icon: '📅' },
        { href: '/prayer-wall',   label: 'Prayer Wall',   icon: '🙏' },
        { href: '/groups',        label: 'Groups',        icon: '◉' },
        { href: '/announcements', label: 'Announcements', icon: '📢', badge: unread.announcements },
        { href: '/inbox',         label: 'Inbox',         icon: '✉', badge: unread.inbox },
        { href: '/documents',     label: 'Resources',     icon: '📂' },
      ],
    },
    {
      label: 'Serve',
      items: [
        { href: '/my-rota', label: 'My Rota', icon: '◆' },
        { href: '/worship', label: 'Worship', icon: '🎵' },
      ],
    },
    ...(isPastor
      ? [{
          label: 'Pastor',
          items: [
            { href: '/pastor',  label: 'Pastor Dashboard', icon: '◆' },
            { href: '/members', label: 'Member Directory', icon: '◉' },
            { href: '/rotas',   label: 'Serving Rotas',    icon: '📋' },
          ],
        }]
      : []),
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const tabBadge = (href: string) =>
    href === '/inbox' ? unread.inbox + unread.announcements : 0;

  return (
    <div className="pf-shell">
      {/* ── desktop sidebar ── */}
      <aside className="pf-sidebar" aria-label="Main navigation">
        <Link href="/dashboard" className="pf-brand">
          <b>Alignment</b><span>Church</span>
        </Link>

        <nav style={{ flex: '0 1 auto' }}>
          {groups.map((g, gi) => (
            <div className="pf-navgroup" key={g.label ?? gi}>
              {g.label && <p className="pf-navgroup-label">{g.label}</p>}
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="pf-navitem"
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <span className="pf-nav-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                  {!!item.badge && item.badge > 0 && (
                    <span className="pf-badge">{item.badge > 9 ? '9+' : item.badge}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="pf-sidebar-foot">
          <Link href="/profile" className="pf-navitem" aria-current={isActive('/profile') ? 'page' : undefined}>
            <span className="pf-nav-icon" aria-hidden="true">✦</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName ?? 'My Profile'}
            </span>
            <span className="pf-chip" style={{ marginLeft: 'auto', fontSize: 9 }}>{ROLE_LABELS[role] ?? role}</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="pf-navitem"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
          >
            <span className="pf-nav-icon" aria-hidden="true">→</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── main column ── */}
      <div className="pf-main">
        {/* mobile top bar */}
        <header className="pf-topbar">
          <div className="pf-topbar-inner">
            <Link href="/dashboard" className="pf-brand" style={{ padding: 0 }}>
              <b style={{ fontSize: '1.2rem' }}>Alignment</b>
              <span style={{ fontSize: '1.2rem' }}>Church</span>
            </Link>
            <span className="pf-chip">{ROLE_LABELS[role] ?? role}</span>
          </div>
        </header>

        <main className="pf-content">{children}</main>
      </div>

      {/* ── mobile bottom nav ── */}
      <nav className="pf-bottomnav" aria-label="Primary">
        <div className="pf-bottomnav-inner">
          {MOBILE_TABS.map((item) => {
            const badge = tabBadge(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="pf-tab"
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span className="pf-tab-icon" aria-hidden="true">
                  {item.icon}
                  {badge > 0 && <span className="pf-badge pf-badge--dot">{badge > 9 ? '9+' : badge}</span>}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
