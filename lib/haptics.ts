import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNativeApp } from '@/lib/notifications/push';

// No-ops in every browser context (including installed PWA) — Haptics
// only has real hardware to talk to inside the native app, and calling
// it on web just throws silently. Fire-and-forget: a failed vibration
// is never worth surfacing to the user or blocking their tap on.

export function tapLight(): void {
  if (!isNativeApp()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function tapMedium(): void {
  if (!isNativeApp()) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export function tapSelection(): void {
  if (!isNativeApp()) return;
  Haptics.selectionStart().catch(() => {});
}
