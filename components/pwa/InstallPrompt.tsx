'use client';

import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      const timer = setTimeout(() => setVisible(true), 30000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    setInstalling(true);
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    deferredPrompt.current = null;
    setInstalling(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom))',
        left: 16,
        right: 16,
        zIndex: 200,
        background: '#0a1828',
        border: '1px solid rgba(198,167,94,0.3)',
        borderRadius: 6,
        padding: '18px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        fontFamily: "var(--font-jost), 'Jost', sans-serif",
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(to right, #c6a75e, transparent)', borderRadius: '6px 6px 0 0' }} />

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: '#0f1e2e',
          border: '1px solid rgba(198,167,94,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: '#c6a75e', flexShrink: 0,
        }}>
          ✦
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 2px', fontSize: 15, color: '#f0e8d4', fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
            Add Community to your home screen
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6a8aaa', fontStyle: 'italic' }}>
            Stay connected to the Word — offline-ready, always at hand.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleInstall}
              disabled={installing}
              style={{
                padding: '9px 18px', background: '#c6a75e', border: 'none',
                borderRadius: 2, color: '#0f1e2e', fontSize: 12, fontWeight: 'bold',
                cursor: installing ? 'wait' : 'pointer',
                fontFamily: "var(--font-jost), 'Jost', sans-serif", letterSpacing: '0.06em',
                minHeight: 44,
              }}
            >
              {installing ? 'Installing…' : 'Install App'}
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '9px 16px', background: 'transparent',
                border: '1px solid #1e3a52', borderRadius: 2,
                color: '#c6a75e', fontSize: 12, cursor: 'pointer',
                fontFamily: "var(--font-jost), 'Jost', sans-serif",
                minHeight: 44,
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
