'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/notifications/push';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // The native app always loads from a live server (no offline/PWA use
    // case — see capacitor.config.ts) and registering the SW here causes
    // WKWebView to interrupt navigation: the SW's skipWaiting()+
    // clientsClaim() combo takes control mid-load, which WKWebView
    // surfaces as "Frame load interrupted" and bounces the whole page
    // out to Safari instead of rendering in the app. Any build installed
    // before this fix may have already registered one inside the app's
    // WKWebView storage — that registration persists across app updates
    // until explicitly unregistered, so it's not enough to just stop
    // registering new ones going forward.
    if (isNativeApp()) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(r => r.unregister()))
        .catch(() => {/* best-effort */});
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {/* best-effort */});
  }, []);

  return null;
}
