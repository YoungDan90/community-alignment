'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/selah', label: 'Selah', icon: '✦' },
  { href: '/word-to-walk', label: 'Word', icon: '◈' },
  { href: '/prayer-wall', label: 'Prayer', icon: '🙏' },
];

const PASTOR_NAV = [
  ...NAV_ITEMS,
  { href: '/pastor', label: 'Pastor', icon: '◆' },
];

interface BottomNavProps {
  role?: 'member' | 'prophetic_team' | 'pastor' | 'admin';
}

export default function BottomNav({ role = 'member' }: BottomNavProps) {
  const pathname = usePathname();
  const items = role === 'pastor' || role === 'admin' ? PASTOR_NAV : NAV_ITEMS;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#162030] bg-[rgba(7,12,18,0.96)] pt-2 backdrop-blur-md"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-sm justify-around">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-4 py-1"
              style={{ color: active ? '#c6a75e' : '#c6a75e' }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[9px] uppercase tracking-wider">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
