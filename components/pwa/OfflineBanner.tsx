'use client';

import { useState, useEffect } from 'react';
import { isNativeApp } from '@/lib/notifications/push';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: '#1a0f0a',
        borderBottom: '1px solid rgba(224,112,112,0.3)',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: 12,
        color: '#e07070',
        fontFamily: "var(--font-jost), 'Jost', sans-serif",
        fontStyle: 'italic',
        letterSpacing: '0.06em',
      }}
    >
      {/* Native app has no service worker/cache (see
          ServiceWorkerRegistrar.tsx), so unlike the installable PWA
          there's genuinely nothing cached to fall back to. */}
      ◈ {isNativeApp() ? 'You are offline' : 'You are offline — cached content is available'}
    </div>
  );
}
