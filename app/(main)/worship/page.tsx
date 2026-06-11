'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateServicePlan from '@/components/worship/CreateServicePlan';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

interface Plan {
  id: string;
  service_date: string;
  title: string | null;
  theme: string | null;
  status: string;
  created_by: string;
}

export default function WorshipPage() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Plan[]>([]);
  const [past, setPast] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPastor, setIsPastor] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    setIsPastor(['pastor', 'admin'].includes(profile?.role ?? ''));

    const today = new Date().toISOString().split('T')[0];
    const [upRes, pastRes] = await Promise.allSettled([
      supabase.from('service_plans').select('id, service_date, title, theme, status, created_by').gte('service_date', today).order('service_date', { ascending: true }),
      supabase.from('service_plans').select('id, service_date, title, theme, status, created_by').lt('service_date', today).order('service_date', { ascending: false }).limit(20),
    ]);
    if (upRes.status === 'fulfilled') setUpcoming(upRes.value.data ?? []);
    if (pastRes.status === 'fulfilled') setPast(pastRes.value.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const PlanCard = ({ plan }: { plan: Plan }) => (
    <div
      onClick={() => router.push(`/worship/${plan.id}`)}
      style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, color: S.textLight, fontWeight: 500 }}>{plan.title ?? formatDate(plan.service_date)}</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 11, color: S.soft }}>{formatDate(plan.service_date)}</p>
          {plan.theme && <p style={{ margin: 0, fontSize: 11, color: S.gold, fontStyle: 'italic' }}>&ldquo;{plan.theme}&rdquo;</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 2, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          background: plan.status === 'published' ? 'rgba(72,160,110,0.15)' : S.goldDim,
          border: `1px solid ${plan.status === 'published' ? 'rgba(72,160,110,0.3)' : S.goldBorder}`,
          color: plan.status === 'published' ? '#48a06e' : S.gold,
        }}>
          {plan.status}
        </span>
        <span style={{ color: S.soft, fontSize: 16 }}>›</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: S.dark, padding: '20px 0 80px', fontFamily: S.font.body }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>Alignment Church</p>
            <h1 style={{ margin: '4px 0 0', fontSize: 32, fontFamily: S.font.display, color: S.textLight, fontWeight: 400 }}>Worship Planning</h1>
          </div>
          <Link href="/worship/songs" style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Song Library
          </Link>
        </div>

        {isPastor && !showCreate && (
          <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: '12px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 3, color: S.gold, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 24 }}>
            + New Service Plan
          </button>
        )}

        {showCreate && (
          <CreateServicePlan
            onClose={() => setShowCreate(false)}
            onCreated={(id) => { setShowCreate(false); router.push(`/worship/${id}`); }}
          />
        )}

        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>Upcoming Services</p>
          {loading ? (
            <p style={{ color: S.soft, fontSize: 13 }}>Loading…</p>
          ) : upcoming.length === 0 ? (
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: S.soft }}>No upcoming services planned.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <button
              onClick={() => setShowPast(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12 }}
            >
              <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.soft }}>Past Services ({past.length})</p>
              <span style={{ color: S.soft, fontSize: 14, transform: showPast ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
            </button>
            {showPast && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {past.map(plan => <PlanCard key={plan.id} plan={plan} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
