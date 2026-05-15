'use client';

interface TopBarProps {
  role?: 'member' | 'prophetic_team' | 'pastor' | 'admin';
}

export default function TopBar({ role = 'member' }: TopBarProps) {
  return (
    <div className="sticky top-0 z-50 border-b border-[#162030] bg-[rgba(7,12,18,0.9)] px-5 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-serif text-xl font-normal tracking-wide text-[#f0e8d4]">
            Community
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-[#3a5570]">
            Alignment Church
          </span>
        </div>
        <span className="rounded border border-[#162030] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#6a8aaa]">
          {role}
        </span>
      </div>
    </div>
  );
}
