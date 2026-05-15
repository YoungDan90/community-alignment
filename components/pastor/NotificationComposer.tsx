'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Member { id: string; full_name: string | null; }

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "Georgia, 'Times New Roman', serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0b1118', dark: '#070c12', border: '#162030',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#3a5570',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
  padding: '10px 14px', color: S.text, fontSize: 14, fontFamily: S.font.display,
  fontStyle: 'italic', outline: 'none', boxSizing: 'border-box',
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
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title…" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want to say to the community?"
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Deep Link URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/word-to-walk" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Send To</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ ...inputStyle, fontStyle: 'normal', cursor: 'pointer' }}
          >
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

      {error && <p style={{ marginTop: 10, fontSize: 12, color: '#e07070' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 13, color: S.gold }}>
          ✦ Sent to {result.sent} of {result.total} subscriber{result.total !== 1 ? 's' : ''}.
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!canSend || sending}
        style={{
          marginTop: 16, padding: '11px 28px',
          background: canSend && !sending ? S.gold : 'rgba(198,167,94,0.2)',
          border: 'none', borderRadius: 2,
          color: canSend && !sending ? S.dark : S.muted,
          fontSize: 13, fontWeight: 'bold',
          cursor: canSend && !sending ? 'pointer' : 'not-allowed',
          fontFamily: S.font.body, letterSpacing: '0.06em', transition: 'all 0.2s',
        }}
      >
        {sending ? 'Sending…' : 'Send Notification'}
      </button>
    </div>
  );
}
