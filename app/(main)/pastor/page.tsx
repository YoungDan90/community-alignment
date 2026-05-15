'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import EngagementOverview from '@/components/pastor/EngagementOverview';
import AssignVerse from '@/components/pastor/AssignVerse';
import MemberList from '@/components/pastor/MemberList';
import NotificationComposer from '@/components/pastor/NotificationComposer';
import PendingTestimonies from '@/components/pastor/PendingTestimonies';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "Georgia, 'Times New Roman', serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  border: '#162030', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

type Section = 'overview' | 'verse' | 'members' | 'notifications' | 'testimonies';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview',      label: 'Overview',      icon: '◈' },
  { id: 'verse',         label: 'Assign Verse',   icon: '✦' },
  { id: 'members',       label: 'Members',        icon: '◉' },
  { id: 'notifications', label: 'Notifications',  icon: '◆' },
  { id: 'testimonies',   label: 'Testimonies',    icon: '↺' },
];

const SECTION_TITLES: Record<Section, { heading: string; sub: string }> = {
  overview:      { heading: 'This Week at a Glance',          sub: "Your community's engagement with the Word." },
  verse:         { heading: 'Assign This Week\'s Verse',       sub: 'Set the verse, series, and Selah playlist for the whole community.' },
  members:       { heading: 'Church Members',                  sub: 'Manage roles and send personal nudges.' },
  notifications: { heading: 'Send a Notification',            sub: 'Compose and send a custom push notification.' },
  testimonies:   { heading: 'Pending Testimonies',            sub: 'Review, approve, and feature community testimonies.' },
};

export default function PastorPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/dashboard'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle();
      console.log('[pastor] profile fetch result:', profile);

      if (profile?.role === 'pastor' || profile?.role === 'admin') {
        setAuthorized(true);
      } else {
        router.replace('/dashboard');
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: S.font.body }}>
        <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>Verifying access…</p>
      </div>
    );
  }

  if (!authorized) return null;

  const { heading, sub } = SECTION_TITLES[section];

  return (
    <div style={{ padding: '28px 20px', maxWidth: 680, margin: '0 auto', fontFamily: S.font.body }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>
          Pastor Dashboard
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
          {heading}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: S.soft, fontStyle: 'italic' }}>{sub}</p>
      </div>

      {/* Section tabs — horizontal scroll on small screens */}
      <div
        style={{
          display: 'flex', gap: 6, marginBottom: 24,
          overflowX: 'auto', paddingBottom: 4,
          scrollbarWidth: 'none',
        }}
      >
        {SECTIONS.map(({ id, label, icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              style={{
                padding: '7px 14px', flexShrink: 0,
                background: active ? S.goldDim : 'transparent',
                border: `1px solid ${active ? S.goldBorder : S.border}`,
                borderRadius: 2,
                color: active ? S.gold : S.muted,
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: S.font.body,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 11 }}>{icon}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      {section === 'overview'      && <EngagementOverview />}
      {section === 'verse'         && <AssignVerse />}
      {section === 'members'       && <MemberList />}
      {section === 'notifications' && <NotificationComposer />}
      {section === 'testimonies'   && <PendingTestimonies />}
    </div>
  );
}
