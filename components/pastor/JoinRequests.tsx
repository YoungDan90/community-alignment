'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface JoinRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  heard_via: string | null;
  visited: boolean | null;
  message: string | null;
  wants_call: boolean;
  status: string;
  created_at: string;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e', green: '#5a8a5a',
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  new:       { label: 'New',       color: S.gold },
  contacted: { label: 'Contacted', color: '#5588e0' },
  joined:    { label: 'Joined',    color: S.green },
  archived:  { label: 'Archived',  color: S.soft },
};

// Which status each action button transitions to, per current status.
const NEXT_ACTIONS: Record<string, { to: string; label: string }[]> = {
  new:       [{ to: 'contacted', label: 'Mark contacted' }, { to: 'archived', label: 'Archive' }],
  contacted: [{ to: 'joined', label: 'Mark joined' }, { to: 'archived', label: 'Archive' }],
  joined:    [{ to: 'archived', label: 'Archive' }],
  archived:  [{ to: 'new', label: 'Reopen' }],
};

export default function JoinRequests() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('join_requests')
        .select('*')
        .order('created_at', { ascending: false });
      setRequests((data as JoinRequest[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const setStatus = async (req: JoinRequest, status: string) => {
    setUpdating(req.id);
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status } : r));
    const supabase = createClient();
    const { error } = await supabase.from('join_requests').update({ status }).eq('id', req.id);
    if (error) {
      // revert on failure
      setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: req.status } : r));
    }
    setUpdating(null);
  };

  if (loading) return <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>Loading enquiries…</p>;

  const active = requests.filter((r) => r.status !== 'archived');
  const archived = requests.filter((r) => r.status === 'archived');
  const shown = showArchived ? archived : active;
  const newCount = requests.filter((r) => r.status === 'new').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 11, color: S.muted }}>
          {active.length} active enquir{active.length !== 1 ? 'ies' : 'y'}
          {newCount > 0 && <span style={{ marginLeft: 8, color: S.gold }}>· {newCount} new</span>}
        </p>
        {archived.length > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{ background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, padding: '5px 12px', color: S.soft, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: S.font.body }}
          >
            {showArchived ? `← Active (${active.length})` : `Archived (${archived.length})`}
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
          {showArchived ? 'No archived enquiries.' : 'No enquiries yet.'}
        </p>
      )}

      {shown.map((req) => {
        const meta = STATUS_META[req.status] ?? STATUS_META.new;
        const date = new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
          <div
            key={req.id}
            style={{
              background: S.card,
              border: `1px solid ${req.status === 'new' ? S.goldBorder : S.border}`,
              borderLeft: `3px solid ${meta.color}`,
              borderRadius: 3, padding: '14px 16px', marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                  <p style={{ margin: 0, fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{req.name}</p>
                  <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: meta.color, background: `${meta.color}20`, border: `1px solid ${meta.color}40`, padding: '1px 8px', borderRadius: 10 }}>
                    {meta.label}
                  </span>
                  {req.wants_call && (
                    <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold, background: S.goldDim, border: `1px solid ${S.goldBorder}`, padding: '1px 8px', borderRadius: 10 }}>
                      ☎ Wants a call
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: S.soft }}>
                  <a href={`mailto:${req.email}`} style={{ color: S.soft, textDecoration: 'none' }}>{req.email}</a>
                  {req.phone && <> · <a href={`tel:${req.phone}`} style={{ color: S.soft, textDecoration: 'none' }}>{req.phone}</a></>}
                  {' · '}{date}
                </p>
              </div>
            </div>

            {(req.heard_via || typeof req.visited === 'boolean') && (
              <p style={{ margin: '0 0 8px', fontSize: 11, color: S.muted }}>
                {req.heard_via && <>Heard via {req.heard_via}</>}
                {req.heard_via && typeof req.visited === 'boolean' && ' · '}
                {typeof req.visited === 'boolean' && <>{req.visited ? 'Has visited before' : 'Not yet visited'}</>}
              </p>
            )}

            {req.message && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: S.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                {req.message}
              </p>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(NEXT_ACTIONS[req.status] ?? []).map((a) => (
                <button
                  key={a.to}
                  onClick={() => setStatus(req, a.to)}
                  disabled={updating === req.id}
                  style={{
                    padding: '5px 12px', borderRadius: 2,
                    background: a.to === 'archived' ? 'transparent' : S.goldDim,
                    border: `1px solid ${a.to === 'archived' ? S.border : S.goldBorder}`,
                    color: a.to === 'archived' ? S.soft : S.gold,
                    fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: S.font.body,
                    opacity: updating === req.id ? 0.5 : 1,
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
