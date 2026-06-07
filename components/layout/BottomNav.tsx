'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Home',    icon: '⌂' },
  { href: '/word-to-walk', label: 'Word',    icon: '◈' },
  { href: '/groups',       label: 'Groups',  icon: '◉' },
  { href: '/prayer-wall',  label: 'Prayer',  icon: '🙏' },
  { href: '/profile',      label: 'Profile', icon: '✦' },
];

export default function BottomNav() {
  const pathname = usePathname();

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
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '4px 12px', textDecoration: 'none',
                color: active ? '#c6a75e' : 'rgba(198,167,94,0.45)',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
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
