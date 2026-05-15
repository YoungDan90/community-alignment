'use client';

import { createClient } from '@/lib/supabase/client';

interface TopBarProps {
  role?: 'member' | 'prophetic_team' | 'pastor' | 'admin';
}

export default function TopBar({ role = 'member' }: TopBarProps) {

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div
      className="sticky top-0 z-50 border-b border-[#162030] bg-[rgba(7,12,18,0.9)] px-5 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-serif text-xl font-normal tracking-wide text-[#f0e8d4]">
            Community
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-[#c6a75e]">
            Alignment Church
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded border border-[#162030] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#6a8aaa]">
            {role}
          </span>
          <button
            onClick={handleSignOut}
            className="text-[11px] uppercase tracking-wider text-[#c6a75e] transition-colors duration-200 hover:text-[#c6a75e]"
            style={{ minHeight: 44, padding: '0 4px' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
