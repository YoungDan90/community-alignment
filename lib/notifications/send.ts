import webpush from 'web-push';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createAdminClient } from '@/lib/supabase/admin';

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

let firebaseApp: App | null = null;

function getFirebaseApp(): App | null {
  if (firebaseApp) return firebaseApp;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) return null;

  firebaseApp = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // .env stores the key's newlines as the literal two characters
      // "\n" — Firebase's PEM parser needs real newline bytes.
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  return firebaseApp;
}

interface SubscriptionRow {
  platform: 'web' | 'fcm';
  subscription: webpush.PushSubscription | null;
  fcm_token: string | null;
}

/**
 * Sends one notification to every row in `rows`, routing web push
 * subscriptions through web-push and FCM tokens through Firebase Admin.
 * Returns how many sends succeeded. A missing Firebase config silently
 * skips FCM rows (logged once) rather than failing the whole broadcast —
 * web push keeps working for PWA users even before Firebase is set up.
 */
export async function sendToSubscriptions(
  rows: SubscriptionRow[],
  title: string,
  body: string,
  url: string,
): Promise<number> {
  const webRows = rows.filter((r) => r.platform === 'web' && r.subscription);
  const fcmRows = rows.filter((r) => r.platform === 'fcm' && r.fcm_token);

  const webResults = await Promise.allSettled(
    webRows.map((row) => webpush.sendNotification(row.subscription!, JSON.stringify({ title, body, url }))),
  );
  let sent = webResults.filter((r) => r.status === 'fulfilled').length;

  if (fcmRows.length) {
    const app = getFirebaseApp();
    if (!app) {
      console.error('[notifications] FCM rows present but Firebase env vars are not set — skipping', fcmRows.length, 'device(s)');
    } else {
      const messaging = getMessaging(app);
      const fcmResults = await Promise.allSettled(
        fcmRows.map((row) => messaging.send({
          token: row.fcm_token!,
          notification: { title, body },
          data: { url },
        })),
      );
      sent += fcmResults.filter((r) => r.status === 'fulfilled').length;

      // A token Firebase reports as unregistered belongs to an
      // uninstalled app / revoked permission — clean it up so future
      // sends don't keep paying for a dead lookup.
      const admin = createAdminClient();
      fcmResults.forEach((r, i) => {
        if (r.status === 'rejected' && String(r.reason).includes('registration-token-not-registered')) {
          admin.from('push_subscriptions').delete().eq('fcm_token', fcmRows[i].fcm_token).then(() => {});
        }
      });
    }
  }

  return sent;
}
