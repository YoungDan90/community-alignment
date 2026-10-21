'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/notifications/push';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // The native app always loads from a live server (no offline/PWA use
    // case — see capacitor.config.ts) and registering the SW here causes
    // WKWebView to interrupt the very first navigation: the SW's
    // skipWaiting()+clientsClaim() combo takes control mid-load, which
    // WKWebView surfaces as "Frame load interrupted" and bounces the
    // whole page out to Safari instead of rendering in the app.
    if (isNativeApp()) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {/* best-effort */});
    }
  }, []);

  return null;
}
