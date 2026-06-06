'use client';

import { useState, useEffect } from 'react';
import { requestPermission, subscribeUser } from '@/lib/notifications/push';

const S = {
  font: {
    display: 'var(--font-cormorant), Georgia, serif',
    body: "var(--font-jost), 'Jost', sans-serif",
  },
  gold: '#c6a75e',
  goldDim: 'rgba(198,167,94,0.15)',
  goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828',
  border: '#1e3a52',
  text: '#ddd0b8',
  textLight: '#f0e8d4',
  soft: '#6a8aaa',
  muted: '#c6a75e',
  dark: '#0f1e2e',
};

const DISMISSED_KEY = 'notification_prompt_dismissed';

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    const permission = await requestPermission();
    if (permission === 'granted') {
      await subscribeUser();
      setDone(true);
      setTimeout(() => setVisible(false), 2000);
    } else {
      setVisible(false);
    }
    setLoading(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.goldBorder}`,
        borderRadius: 3,
        padding: '16px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        fontFamily: S.font.body,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(to right, ${S.gold}, transparent)`,
        }}
      />

      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>✦</span>

      <div style={{ flex: 1 }}>
        {done ? (
          <p style={{ margin: 0, fontSize: 14, color: S.gold, fontFamily: S.font.display, fontStyle: 'italic' }}>
            Notifications enabled. You&rsquo;ll be notified when it matters.
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 2px', fontSize: 14, color: S.textLight, fontFamily: S.font.display }}>
              Stay connected to the Word
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: S.soft, fontStyle: 'italic' }}>
              Receive daily invitations to Selah, Word to Walk, and community prayer.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleEnable}
                disabled={loading}
                style={{
                  padding: '7px 16px',
                  background: S.gold, border: 'none', borderRadius: 2,
                  color: S.dark, fontSize: 11, fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  fontFamily: S.font.body, letterSpacing: '0.08em',
                  transition: 'opacity 0.2s',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Enabling…' : 'Enable Notifications'}
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  padding: '7px 14px',
                  background: 'transparent', border: `1px solid ${S.border}`,
                  borderRadius: 2, color: S.muted, fontSize: 11,
                  cursor: 'pointer', fontFamily: S.font.body,
                }}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
