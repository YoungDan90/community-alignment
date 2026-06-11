'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Home',    icon: '⌂' },
  { href: '/word-to-walk', label: 'Word',    icon: '◈' },
  { href: '/groups',       label: 'Groups',  icon: '◉' },
  { href: '/inbox',        label: 'Inbox',   icon: '✉' },
  { href: '/profile',      label: 'Profile', icon: '✦' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count: msgCount } = await supabase
        .from('inbox_messages')
        .select('id', { count: 'exact', head: true })
        .eq('to_id', user.id)
        .eq('is_read', false);
      const now = new Date().toISOString();
      const { data: annData } = await supabase
        .from('announcements')
        .select('id')
        .or(`expires_at.is.null,expires_at.gt.${now}`);
      let unreadAnn = 0;
      if (annData && annData.length > 0) {
        const { count: readCount } = await supabase
          .from('announcement_reads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('announcement_id', annData.map((a: { id: string }) => a.id));
        unreadAnn = annData.length - (readCount ?? 0);
      }
      setUnreadCount((msgCount ?? 0) + (unreadAnn > 0 ? unreadAnn : 0));
    })();
  }, [pathname]);

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(15,30,46,0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(198,167,94,0.15)',
        paddingTop: 8,
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', justifyContent: 'space-around' }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const showBadge = item.href === '/inbox' && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '4px 12px', textDecoration: 'none',
                color: active ? '#c6a75e' : 'rgba(198,167,94,0.45)',
                transition: 'color 0.2s', position: 'relative',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, position: 'relative' }}>
                {item.icon}
                {showBadge && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    background: '#e05555', color: '#fff', borderRadius: '50%',
                    width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, lineHeight: 1, fontFamily: 'var(--font-jost), sans-serif',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span style={{
                fontFamily: 'var(--font-jost), sans-serif',
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: active ? 500 : 300,
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
