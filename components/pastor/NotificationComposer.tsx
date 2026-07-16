'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Member { id: string; full_name: string | null; }

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};


export default function NotificationComposer() {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [url, setUrl]       = useState('/');
  const [target, setTarget] = useState('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<{ sent: number; total: number } | null>(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      setMembers((data as Member[]) ?? []);
    })();
  }, []);

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url, target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Send failed');
      setResult({ sent: json.sent ?? 0, total: json.total ?? 0 });
      setTitle(''); setBody(''); setUrl('/'); setTarget('all');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send notifications.');
    }
    setSending(false);
  };

  return (
    <div>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label className="pf-label" htmlFor="notif-title">Title</label>
          <input id="notif-title" className="pf-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title…" />
        </div>

        <div>
          <label className="pf-label" htmlFor="notif-body">Message</label>
          <textarea
            id="notif-body"
            className="pf-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want to say to the community?"
            rows={3}
          />
        </div>

        <div>
          <label className="pf-label" htmlFor="notif-url">Deep Link URL</label>
          <input id="notif-url" className="pf-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/word-to-walk" />
        </div>

        <div>
          <label className="pf-label" htmlFor="notif-target">Send To</label>
          <select id="notif-target" className="pf-input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="all">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      {(title || body) && (
        <div style={{ marginTop: 16, background: S.dark, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Preview</p>
          <p style={{ margin: '0 0 2px', fontSize: 14, color: S.textLight, fontFamily: S.font.display }}>{title || '—'}</p>
          <p style={{ margin: 0, fontSize: 12, color: S.soft, fontStyle: 'italic' }}>{body || '—'}</p>
        </div>
      )}

      {error && <p role="alert" style={{ marginTop: 10, fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

      {result && (
        <div className="pf-banner" role="status" style={{ marginTop: 10, marginBottom: 0 }}>
          ✦ Sent to {result.sent} of {result.total} subscriber{result.total !== 1 ? 's' : ''}.
        </div>
      )}

      <button onClick={handleSend} disabled={!canSend || sending} className="pf-btn" style={{ marginTop: 16 }}>
        {sending ? 'Sending…' : 'Send Notification'}
      </button>
    </div>
  );
}
