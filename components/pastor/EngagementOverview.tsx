'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Stats {
  memberCount: number;
  startedThisWeek: number;
  completedThisWeek: number;
  activePrayerRequests: number;
  pendingTestimonies: number;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e', green: '#5a8a5a',
};

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function StatCard({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="pf-stat" style={{ flex: '1 1 140px', padding: '18px 20px' }}>
      <b style={{ fontSize: 32 }}>{value}</b>
      <span>{label}</span>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: S.muted, fontStyle: 'italic' }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: S.soft, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, color: S.gold }}>{value} / {total} &nbsp;({pct}%)</span>
      </div>
      <div style={{ height: 4, background: S.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: S.gold, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function EngagementOverview() {
  const [stats, setStats] = useState<Stats>({ memberCount: 0, startedThisWeek: 0, completedThisWeek: 0, activePrayerRequests: 0, pendingTestimonies: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const ws = weekStart();

      const [members, started, completed, prayers, testimonies] = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('meditations').select('id', { count: 'exact', head: true }).gte('created_at', ws),
        supabase.from('meditations').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', ws),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        memberCount:         members.status === 'fulfilled'    ? (members.value.count    ?? 0) : 0,
        startedThisWeek:     started.status === 'fulfilled'    ? (started.value.count    ?? 0) : 0,
        completedThisWeek:   completed.status === 'fulfilled'  ? (completed.value.count  ?? 0) : 0,
        activePrayerRequests:prayers.status === 'fulfilled'    ? (prayers.value.count    ?? 0) : 0,
        pendingTestimonies:  testimonies.status === 'fulfilled' ? (testimonies.value.count ?? 0) : 0,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>Loading stats…</p>;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <StatCard value={stats.memberCount}          label="Total Members" />
        <StatCard value={stats.activePrayerRequests} label="Active Prayer Requests" />
        <StatCard value={stats.pendingTestimonies}   label="Pending Testimonies" sub="awaiting review" />
      </div>

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '20px 22px' }}>
        <p style={{ margin: '0 0 16px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>
          Word to Walk — This Week
        </p>
        <ProgressBar value={stats.startedThisWeek}   total={stats.memberCount} label="Started" />
        <ProgressBar value={stats.completedThisWeek} total={stats.memberCount} label="Completed" />
      </div>
    </div>
  );
}
