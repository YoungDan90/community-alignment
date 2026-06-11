'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

interface Profile { id: string; full_name: string | null; role: string }

interface Props {
  defaultToId?: string;
  defaultSubject?: string;
  onClose: () => void;
  onSent: () => void;
}

export default function ComposeMessage({ defaultToId, defaultSubject, onClose, onSent }: Props) {
  const [toId, setToId] = useState(defaultToId ?? '');
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [content, setContent] = useState('');
  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [myRole, setMyRole] = useState('member');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = profile?.role ?? 'member';
      setMyRole(role);

      if (role === 'pastor' || role === 'admin') {
        const { data } = await supabase.from('profiles').select('id, full_name, role').neq('id', user.id).order('full_name');
        setRecipients(data ?? []);
      } else {
        const { data } = await supabase.from('profiles').select('id, full_name, role').in('role', ['pastor', 'admin']).order('full_name');
        setRecipients(data ?? []);
        if (!defaultToId && data && data.length > 0) setToId(data[0].id);
      }
    })();
  }, [defaultToId]);

  const handleSend = async () => {
    if (!toId) { setError('Please select a recipient.'); return; }
    if (!content.trim()) { setError('Message cannot be empty.'); return; }
    setSending(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setSending(false); return; }
    const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).maybeSingle();

    const { error: insertErr } = await supabase.from('inbox_messages').insert({
      church_id: profile?.church_id,
      from_id: user.id,
      to_id: toId,
      subject: subject.trim() || null,
      content: content.trim(),
    });

    if (insertErr) { setError('Failed to send message.'); setSending(false); return; }

    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: subject.trim() || 'New message',
        body: content.trim().slice(0, 100),
        url: '/inbox',
        target: toId,
      }),
    });

    setSending(false);
    onSent();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '9px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
    boxSizing: 'border-box', outline: 'none',
  };

  const isPastorMode = myRole === 'pastor' || myRole === 'admin';

  return (
    <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>
          New Message
        </p>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: S.soft, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>To</p>
          {isPastorMode ? (
            <select value={toId} onChange={e => setToId(e.target.value)} style={inputStyle}>
              <option value="">Select member…</option>
              {recipients.map(r => (
                <option key={r.id} value={r.id}>{r.full_name ?? r.id} ({r.role})</option>
              ))}
            </select>
          ) : (
            <select value={toId} onChange={e => setToId(e.target.value)} style={inputStyle}>
              {recipients.map(r => (
                <option key={r.id} value={r.id}>{r.full_name ?? 'Pastor'} (Pastor)</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Subject</p>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Optional subject…"
            style={inputStyle}
          />
        </div>

        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Message</p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your message…"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {error && <p style={{ margin: 0, fontSize: 12, color: '#e05555' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '10px 24px', background: S.goldDim, border: `1px solid ${S.goldBorder}`,
              borderRadius: 2, color: S.gold, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: sending ? 'wait' : 'pointer', fontFamily: S.font.body, opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}
