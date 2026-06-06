'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  prophetic_team: 'Prophetic',
  pastor: 'Pastor',
  admin: 'Admin',
};

export default function TopBar() {
  const [role, setRole] = useState<string>('member');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (data?.role) setRole(data.role);
    })();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(15,30,46,0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(198,167,94,0.15)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div style={{
        maxWidth: 720, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: '1.4rem', fontWeight: 600,
            letterSpacing: '0.06em', color: '#c6a75e',
          }}>
            Alignment
          </span>
          <span style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: '1.4rem', fontWeight: 300,
            letterSpacing: '0.06em', color: '#f0e8d4',
          }}>
            Church
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-jost), sans-serif',
            fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#6a8aaa',
            padding: '3px 10px',
            border: '1px solid #1e3a52',
            borderRadius: 2,
          }}>
            {ROLE_LABELS[role] ?? role}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              fontFamily: 'var(--font-jost), sans-serif',
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(198,167,94,0.7)', background: 'none', border: 'none',
              cursor: 'pointer', minHeight: 44, padding: '0 4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c6a75e')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(198,167,94,0.7)')}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
