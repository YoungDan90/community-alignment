'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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

  const isPastorMode = myRole === 'pastor' || myRole === 'admin';

  return (
    <div className="pf-card pf-card--accent">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="pf-card-label" style={{ margin: 0 }}>New Message</p>
        <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--pf-text-soft)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="pf-label" htmlFor="compose-to">To</label>
          <select id="compose-to" className="pf-input" value={toId} onChange={e => setToId(e.target.value)}>
            {isPastorMode && <option value="">Select member…</option>}
            {recipients.map(r => (
              <option key={r.id} value={r.id}>
                {isPastorMode ? `${r.full_name ?? r.id} (${r.role})` : `${r.full_name ?? 'Pastor'} (Pastor)`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="pf-label" htmlFor="compose-subject">Subject</label>
          <input
            id="compose-subject"
            className="pf-input"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Optional subject…"
          />
        </div>

        <div>
          <label className="pf-label" htmlFor="compose-message">Message</label>
          <textarea
            id="compose-message"
            className="pf-input"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your message…"
            rows={5}
          />
        </div>

        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSend} disabled={sending} className="pf-btn">
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}
