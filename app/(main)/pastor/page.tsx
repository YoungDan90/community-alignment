'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import EngagementOverview from '@/components/pastor/EngagementOverview';
import AssignVerse from '@/components/pastor/AssignVerse';
import MemberList from '@/components/pastor/MemberList';
import NotificationComposer from '@/components/pastor/NotificationComposer';
import PendingTestimonies from '@/components/pastor/PendingTestimonies';
import ContactMessages from '@/components/pastor/ContactMessages';
import JoinRequests from '@/components/pastor/JoinRequests';
import PendingApprovals from '@/components/pastor/PendingApprovals';

type Section = 'overview' | 'verse' | 'members' | 'approvals' | 'notifications' | 'testimonies' | 'messages' | 'join';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview',      label: 'Overview',      icon: '◈' },
  { id: 'verse',         label: 'Assign Verse',   icon: '✦' },
  { id: 'members',       label: 'Members',        icon: '◉' },
  { id: 'approvals',     label: 'New Accounts',   icon: '⊕' },
  { id: 'join',          label: 'Join Requests',  icon: '✚' },
  { id: 'notifications', label: 'Notifications',  icon: '◆' },
  { id: 'testimonies',   label: 'Testimonies',    icon: '↺' },
  { id: 'messages',     label: 'Messages',       icon: '✉' },
];

const SECTION_TITLES: Record<Section, { heading: string; sub: string }> = {
  overview:      { heading: 'This Week at a Glance',          sub: "Your community's engagement with the Word." },
  verse:         { heading: 'Assign This Week\'s Verse',       sub: 'Set the verse, series, and Selah playlist for the whole community.' },
  members:       { heading: 'Church Members',                  sub: 'Manage roles and send personal nudges.' },
  approvals:     { heading: 'New Account Approvals',           sub: 'Signed-up accounts have no access until approved or declined here.' },
  join:          { heading: 'Join Requests',                   sub: 'People who want to join the church — triage and follow up.' },
  notifications: { heading: 'Send a Notification',            sub: 'Compose and send a custom push notification.' },
  testimonies:   { heading: 'Pending Testimonies',            sub: 'Review, approve, and feature community testimonies.' },
  messages:      { heading: 'Contact Messages',               sub: 'Messages submitted through the Alignment Church website.' },
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

      const { data: roles } = await supabase.rpc('get_my_roles');
      if ((roles ?? []).some((r: string) => r === 'pastor' || r === 'admin')) {
        setAuthorized(true);
      } else {
        router.replace('/dashboard');
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="pf-page pf-page--wide">
        <div className="pf-skel" style={{ height: 26, width: 260, marginBottom: 20 }} />
        <div className="pf-skel" style={{ height: 36, marginBottom: 20 }} />
        <div className="pf-skel" style={{ height: 220, borderRadius: 6 }} />
      </div>
    );
  }

  if (!authorized) return null;

  const { heading, sub } = SECTION_TITLES[section];

  return (
    <div className="pf-page pf-page--wide">
      {/* Page header */}
      <div className="pf-head">
        <p className="pf-eyebrow">Pastor Dashboard</p>
        <h1 className="pf-title">{heading}</h1>
        <p className="pf-sub">{sub}</p>
      </div>

      {/* Section tabs — horizontal scroll on small screens */}
      <div
        className="pf-tabs"
        role="tablist"
        style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 24 }}
      >
        {SECTIONS.map(({ id, label, icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={section === id}
            onClick={() => setSection(id)}
            className="pf-tabbtn"
            style={{ flexShrink: 0 }}
          >
            <span aria-hidden="true" style={{ fontSize: 11 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Quick links to full-page tools */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { href: '/members', icon: '◉', label: 'Member Directory' },
          { href: '/rotas', icon: '📋', label: 'Rotas' },
          { href: '/groups', icon: '◈', label: 'Groups' },
          { href: '/announcements', icon: '📢', label: 'Announcements' },
          { href: '/documents', icon: '📂', label: 'Documents' },
          { href: '/worship', icon: '🎵', label: 'Worship' },
        ].map(({ href, icon, label }) => (
          <Link key={href} href={href} className="pf-btn pf-btn--ghost pf-btn--sm">
            <span aria-hidden="true">{icon}</span> {label}
          </Link>
        ))}
      </div>

      {/* Section content */}
      {section === 'overview'      && <EngagementOverview />}
      {section === 'verse'         && <AssignVerse />}
      {section === 'members'       && <MemberList />}
      {section === 'approvals'     && <PendingApprovals />}
      {section === 'notifications' && <NotificationComposer />}
      {section === 'testimonies'   && <PendingTestimonies />}
      {section === 'messages'      && <ContactMessages />}
      {section === 'join'          && <JoinRequests />}
    </div>
  );
}
