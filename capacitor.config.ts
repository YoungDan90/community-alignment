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
  server: {
    url: 'https://www.alignmentchurch.uk',
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
