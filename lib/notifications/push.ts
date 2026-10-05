import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

// True only inside the Capacitor-wrapped native app (iOS/Android store
// builds) — false for every browser context, including an installed
// PWA. Native and web push are entirely different systems; this is the
// single switch the rest of this module branches on.
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

// iOS Safari only exposes the Notification/Push APIs once the site has
// been added to the home screen (standalone display mode) — running in
// a normal Safari tab, `requestPermission()` looks "denied" even though
// the real issue is "not installed yet," which needs different guidance
// than an actual browser-level notification block.
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as "MacIntel" with touch support
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's legacy standalone flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function needsIOSInstallForPush(): boolean {
  // Inside the native app there's no "add to home screen" step — push
  // goes through APNs/FCM via the native plugin instead.
  return !isNativeApp() && isIOS() && !isStandalone();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

// Resolves once the native plugin reports a permission result or an FCM
// token registration error — PushNotifications' API is event-based, not
// promise-based, for the token itself.
function registerNativePush(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => { if (!settled) { settled = true; resolve(ok); } };

    PushNotifications.addListener('registration', async (token) => {
      try {
        const res = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken: token.value }),
        });
        finish(res.ok);
      } catch {
        finish(false);
      }
    });
    PushNotifications.addListener('registrationError', () => finish(false));

    PushNotifications.register().catch(() => finish(false));
  });
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (isNativeApp()) {
    const result = await PushNotifications.requestPermissions();
    return result.receive === 'granted' ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function subscribeUser(): Promise<boolean> {
  if (isNativeApp()) {
    return registerNativePush();
  }
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeUser(): Promise<boolean> {
  if (isNativeApp()) {
    // No per-device "delete my subscription" endpoint yet for FCM rows —
    // removing the system notification permission (done by the OS
    // settings, which the toggle can't drive directly on native) is the
    // real off switch. Best-effort: stop local listeners.
    try { await PushNotifications.removeAllListeners(); } catch { /* best-effort */ }
    return true;
  }
  try {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;
    return subscription.unsubscribe();
  } catch {
    return false;
  }
}

export async function getSubscriptionState(): Promise<'unsupported' | 'denied' | 'granted' | 'default'> {
  if (isNativeApp()) {
    const result = await PushNotifications.checkPermissions();
    if (result.receive === 'granted') return 'granted';
    if (result.receive === 'denied') return 'denied';
    return 'default';
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission;
}
