'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
  is_read: boolean;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      setMessages((data as ContactMessage[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const toggleRead = async (msg: ContactMessage) => {
    setToggling(msg.id);
    const supabase = createClient();
    const newVal = !msg.is_read;
    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: newVal })
      .eq('id', msg.id);
    if (!error) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: newVal } : m));
    }
    setToggling(null);
  };

  if (loading) return <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>Loading messages…</p>;

  const unread = messages.filter(m => !m.is_read).length;

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: S.muted }}>
        {messages.length} message{messages.length !== 1 ? 's' : ''}
        {unread > 0 && <span style={{ marginLeft: 8, color: S.gold }}>· {unread} unread</span>}
      </p>

      {messages.length === 0 && (
        <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic' }}>No messages yet.</p>
      )}

      {messages.map((msg) => {
        const date = new Date(msg.created_at).toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        return (
          <div
            key={msg.id}
            style={{
              background: S.card,
              border: `1px solid ${msg.is_read ? S.border : S.goldBorder}`,
              borderLeft: `3px solid ${msg.is_read ? S.border : S.gold}`,
              borderRadius: 3,
              padding: '14px 16px',
              marginBottom: 10,
              opacity: msg.is_read ? 0.75 : 1,
              transition: 'all 0.2s',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>
                    {msg.name}
                  </p>
                  {!msg.is_read && (
                    <span style={{
                      fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: S.gold, background: S.goldDim, border: `1px solid ${S.goldBorder}`,
                      padding: '1px 6px', borderRadius: 10,
                    }}>New</span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: S.soft }}>
                  <a href={`mailto:${msg.email}`} style={{ color: S.soft, textDecoration: 'none' }}>{msg.email}</a>
                  {' · '}{date}
                </p>
              </div>
              <button
                onClick={() => toggleRead(msg)}
                disabled={toggling === msg.id}
                style={{
                  padding: '4px 10px', background: 'transparent',
                  border: `1px solid ${S.border}`, borderRadius: 2,
                  color: S.soft, fontSize: 9, cursor: 'pointer',
                  fontFamily: S.font.body, letterSpacing: '0.08em',
                  textTransform: 'uppercase', flexShrink: 0,
                  opacity: toggling === msg.id ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {msg.is_read ? 'Mark unread' : 'Mark read'}
              </button>
            </div>

            {/* Subject */}
            {msg.subject && (
              <p style={{ margin: '0 0 6px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold }}>
                {msg.subject}
              </p>
            )}

            {/* Message body */}
            <p style={{
              margin: 0, fontSize: 13, color: S.text, lineHeight: 1.75,
              fontFamily: S.font.body, whiteSpace: 'pre-wrap',
            }}>
              {msg.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
