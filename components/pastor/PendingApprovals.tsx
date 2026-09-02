'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PendingProfile {
  id: string;
  full_name: string | null;
  created_at: string;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e', green: '#5a8a5a',
};

export default function PendingApprovals() {
  const [pending, setPending] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setPending((data as PendingProfile[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const decide = async (id: string, status: 'approved' | 'declined') => {
    setUpdating(id);
    const prev = pending;
    setPending((p) => p.filter((m) => m.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) setPending(prev);
    setUpdating(null);
  };

  if (loading) return <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic', fontFamily: S.font.body }}>Loading…</p>;

  if (!pending.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: S.font.body }}>
        <p style={{ fontSize: 22, marginBottom: 8 }}>✦</p>
        <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic' }}>No pending accounts. All caught up.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: S.muted, fontFamily: S.font.body }}>
        {pending.length} account{pending.length !== 1 ? 's' : ''} waiting on approval — they have no app access until you decide.
      </p>
      {pending.map((m) => {
        const date = new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
          <div
            key={m.id}
            style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: '14px 16px', marginBottom: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{m.full_name || 'Unnamed signup'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: S.soft }}>Signed up {date}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => decide(m.id, 'approved')}
                  disabled={updating === m.id}
                  style={{ padding: '6px 14px', borderRadius: 2, background: 'rgba(90,138,90,0.15)', border: '1px solid rgba(90,138,90,0.3)', color: S.green, fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: S.font.body, opacity: updating === m.id ? 0.5 : 1 }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => decide(m.id, 'declined')}
                  disabled={updating === m.id}
                  style={{ padding: '6px 14px', borderRadius: 2, background: 'rgba(200,80,80,0.1)', border: '1px solid rgba(200,80,80,0.25)', color: '#e08888', fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: S.font.body, opacity: updating === m.id ? 0.5 : 1 }}
                >
                  ✕ Decline
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
