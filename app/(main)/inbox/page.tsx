'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ComposeMessage from '@/components/announcements/ComposeMessage';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

interface Message {
  id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  from_id: string;
  to_id: string;
  sender: { full_name: string | null; id: string } | null;
  recipient: { full_name: string | null; id: string } | null;
}

type InboxTab = 'inbox' | 'sent';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Avatar({ name }: { name: string | null }) {
  const letter = (name ?? '?')[0].toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: S.goldDim, border: `1px solid ${S.goldBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, color: S.gold,
    }}>
      {letter}
    </div>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InboxTab>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; subject: string | null } | null>(null);
  const [userId, setUserId] = useState('');

  const loadMessages = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('inbox_messages')
      .select('id, subject, content, is_read, created_at, from_id, to_id, sender:from_id(full_name, id), recipient:to_id(full_name, id)')
      .or(`to_id.eq.${uid},from_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    setMessages((data ?? []).map((m: {
      id: string; subject: string | null; content: string; is_read: boolean; created_at: string;
      from_id: string; to_id: string;
      sender: { full_name: string | null; id: string }[] | { full_name: string | null; id: string } | null;
      recipient: { full_name: string | null; id: string }[] | { full_name: string | null; id: string } | null;
    }) => ({
      ...m,
      sender: Array.isArray(m.sender) ? (m.sender[0] ?? null) : m.sender,
      recipient: Array.isArray(m.recipient) ? (m.recipient[0] ?? null) : m.recipient,
    })));
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      await loadMessages(user.id);
      setLoading(false);
    })();
  }, [router, loadMessages]);

  const handleExpand = async (msg: Message) => {
    if (expandedId === msg.id) { setExpandedId(null); return; }
    setExpandedId(msg.id);
    if (!msg.is_read && msg.to_id === userId) {
      const supabase = createClient();
      await supabase.from('inbox_messages').update({ is_read: true }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const inbox = messages.filter(m => m.to_id === userId);
  const sent = messages.filter(m => m.from_id === userId);
  const displayed = tab === 'inbox' ? inbox : sent;
  const unreadCount = inbox.filter(m => !m.is_read).length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: S.font.body }}>
      <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>Loading…</p>
    </div>
  );

  return (
    <div style={{ padding: '28px 20px', maxWidth: 680, margin: '0 auto', fontFamily: S.font.body }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>
          Messages
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
          Inbox
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
          Messages between you and the church.
        </p>
      </div>

      {/* Announcements link */}
      <a
        href="/announcements"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', marginBottom: 16,
          background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2,
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>
          📢 Church Announcements
        </span>
        <span style={{ fontSize: 12, color: S.gold }}>→</span>
      </a>

      {!showCompose && !replyTo && (
        <button
          onClick={() => setShowCompose(true)}
          style={{
            display: 'block', width: '100%', padding: '11px', marginBottom: 16,
            background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2,
            color: S.soft, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: S.font.body,
          }}
        >
          + Compose Message
        </button>
      )}

      {showCompose && (
        <div style={{ marginBottom: 16 }}>
          <ComposeMessage
            onClose={() => setShowCompose(false)}
            onSent={async () => { setShowCompose(false); await loadMessages(userId); }}
          />
        </div>
      )}

      {replyTo && (
        <div style={{ marginBottom: 16 }}>
          <ComposeMessage
            defaultToId={replyTo.id}
            defaultSubject={replyTo.subject ? `Re: ${replyTo.subject}` : undefined}
            onClose={() => setReplyTo(null)}
            onSent={async () => { setReplyTo(null); await loadMessages(userId); }}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['inbox', 'sent'] as InboxTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', border: `1px solid ${tab === t ? S.goldBorder : S.border}`,
              borderRadius: 2, background: tab === t ? S.goldDim : 'transparent',
              color: tab === t ? S.gold : S.soft,
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: S.font.body, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'inbox' && unreadCount > 0 && (
              <span style={{
                background: S.gold, color: S.dark, borderRadius: '50%',
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, lineHeight: 1, fontWeight: 600,
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
            {tab === 'inbox' ? 'Your inbox is empty.' : 'No sent messages.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(msg => {
            const isExpanded = expandedId === msg.id;
            const isUnread = !msg.is_read && msg.to_id === userId;
            const otherPerson = tab === 'inbox' ? msg.sender : msg.recipient;

            return (
              <div
                key={msg.id}
                onClick={() => handleExpand(msg)}
                style={{
                  background: S.card,
                  border: `1px solid ${isUnread ? S.gold + '44' : S.border}`,
                  borderRadius: 3, padding: '14px 16px',
                  cursor: 'pointer', transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Avatar name={otherPerson?.full_name ?? null} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 13, color: isUnread ? S.textLight : S.text, fontWeight: isUnread ? 500 : 400 }}>
                        {otherPerson?.full_name ?? (tab === 'inbox' ? 'Church' : 'Member')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: S.gold, flexShrink: 0 }} />}
                        <span style={{ fontSize: 11, color: S.soft, flexShrink: 0 }}>{timeAgo(msg.created_at)}</span>
                      </div>
                    </div>
                    {msg.subject && (
                      <p style={{ margin: '0 0 2px', fontSize: 12, color: S.text, fontWeight: isUnread ? 500 : 400 }}>
                        {msg.subject}
                      </p>
                    )}
                    {!isExpanded && (
                      <p style={{ margin: 0, fontSize: 12, color: S.soft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.content}
                      </p>
                    )}
                    {isExpanded && (
                      <>
                        <p style={{ margin: '8px 0 12px', fontSize: 13, color: S.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </p>
                        {tab === 'inbox' && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setReplyTo({ id: msg.from_id, subject: msg.subject });
                              setShowCompose(false);
                              setExpandedId(null);
                            }}
                            style={{
                              padding: '7px 16px', background: S.goldDim, border: `1px solid ${S.goldBorder}`,
                              borderRadius: 2, color: S.gold, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                              cursor: 'pointer', fontFamily: S.font.body,
                            }}
                          >
                            Reply
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
