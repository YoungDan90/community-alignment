import type { CapacitorConfig } from '@capacitor/cli';

// This app is server-rendered (API routes, middleware, live Supabase
// auth) — the native shell loads the real production site rather than
// bundling a static copy. A push to Vercel updates the app for every
// installed user instantly, with no store resubmission required. The
// trade-off: the app needs network access to load, same as the website.
const config: CapacitorConfig = {
  appId: 'uk.alignmentchurch.community',
  appName: 'Community — Alignment Church',
  // No local webDir bundle — server.url below is the single source of
  // truth for what loads. Capacitor still requires *a* webDir to exist
  // at init time, so this points at a minimal placeholder (see public-shell/).
  webDir: 'public-shell',
  // Tags every request from the native shell so middleware.ts can tell it
  // apart from a mobile browser and keep it out of the marketing
  // site/auth forms even if something ever links to '/' from inside.
  appendUserAgent: 'AlignmentChurchNativeApp',
  // /login is the native app's entry point, not the marketing homepage —
  // the app is for members, not visitors. A signed-in user is bounced
  // straight to /dashboard by middleware.ts; a signed-out one sees the
  // login form immediately instead of the desktop-oriented church website.
  server: {
    url: 'https://www.alignmentchurch.uk/login',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
