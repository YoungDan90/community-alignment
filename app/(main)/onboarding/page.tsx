'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { requestPermission, subscribeUser, needsIOSInstallForPush } from '@/lib/notifications/push';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const TOTAL_STEPS = 4;

const WELCOME_VERSE = {
  reference: 'Joshua 1:8',
  text: 'This Book of the Law shall not depart from your mouth, but you shall meditate on it day and night, so that you may be careful to do according to all that is written in it.',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [translation, setTranslation] = useState<'nkjv' | 'nlt'>('nkjv');
  const [notifState, setNotifState] = useState<'idle' | 'loading' | 'done' | 'denied' | 'needs_ios_install'>('idle');
  const [saving, setSaving] = useState(false);

  const savePreferences = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ preferred_translation: translation }).eq('id', user.id);
        await supabase.from('notification_preferences').upsert({ user_id: user.id, push_enabled: notifState === 'done' });
      }
    } catch { /* best-effort */ }
    setSaving(false);
  };

  const handleNext = async () => {
    if (step === TOTAL_STEPS) {
      await savePreferences();
      router.push('/selah');
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleEnableNotifications = async () => {
    // On iOS Safari, the Notification API doesn't exist at all until the
    // site has been added to the home screen — requestPermission() would
    // just report "denied" here, which is misleading. Catch that case
    // first and show the real instructions instead.
    if (needsIOSInstallForPush()) {
      setNotifState('needs_ios_install');
      return;
    }
    setNotifState('loading');
    const permission = await requestPermission();
    if (permission === 'granted') {
      await subscribeUser();
      setNotifState('done');
    } else {
      setNotifState('denied');
    }
  };

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 24px',
        maxWidth: 480,
        margin: '0 auto',
        fontFamily: S.font.body,
      }}
    >
      {/* Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ height: 2, background: S.border, borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: S.gold, borderRadius: 1, transition: 'width 0.4s ease' }} />
        </div>
        <p style={{ marginTop: 6, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step content */}
      <div style={{ flex: 1 }}>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div>
            <span style={{ fontSize: 44, color: S.gold, display: 'block', marginBottom: 20 }}>✦</span>
            <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display, lineHeight: 1.2 }}>
              Welcome to Community,<br />Alignment Church
            </h1>
            <p style={{ margin: '0 0 20px', fontSize: 15, color: S.soft, fontStyle: 'italic', lineHeight: 1.7 }}>
              This is your space to encounter the Word, pray with your church, and walk in what God speaks.
            </p>
            <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />
              <p style={{ margin: '0 0 4px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>{WELCOME_VERSE.reference}</p>
              <p style={{ margin: 0, fontSize: 14, color: S.text, fontFamily: S.font.display, fontStyle: 'italic', lineHeight: 1.75 }}>
                &ldquo;{WELCOME_VERSE.text}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Step 2 — Translation */}
        {step === 2 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
              Choose your preferred translation
            </h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
              This sets how the weekly verse appears. You can always switch mid-session.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(['nkjv', 'nlt'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTranslation(t)}
                  style={{
                    padding: '18px 20px', textAlign: 'left',
                    background: translation === t ? S.goldDim : S.card,
                    border: `1px solid ${translation === t ? S.goldBorder : S.border}`,
                    borderRadius: 3, cursor: 'pointer',
                    transition: 'all 0.2s', minHeight: 44,
                  }}
                >
                  <p style={{ margin: '0 0 2px', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: translation === t ? S.gold : S.soft }}>
                    {t.toUpperCase()}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: S.muted, fontStyle: 'italic' }}>
                    {t === 'nkjv' ? 'New King James Version — traditional, precise language' : 'New Living Translation — natural, contemporary language'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Notifications */}
        {step === 3 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
              Stay connected to the Word
            </h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
              Daily notifications invite you to Selah, Word to Walk, and community prayer — never intrusive, always purposeful.
            </p>

            {notifState === 'done' ? (
              <div style={{ background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: '16px 18px' }}>
                <p style={{ margin: 0, fontSize: 14, color: S.gold, fontFamily: S.font.display, fontStyle: 'italic' }}>
                  ✦ Notifications enabled. You&rsquo;ll hear from us when it matters.
                </p>
              </div>
            ) : notifState === 'needs_ios_install' ? (
              <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: S.text, lineHeight: 1.6 }}>
                  On iPhone, notifications only work once this is added to your Home Screen:
                </p>
                <p style={{ margin: 0, fontSize: 13, color: S.soft, lineHeight: 1.7 }}>
                  Tap the <strong style={{ color: S.gold }}>Share</strong> icon in Safari, then <strong style={{ color: S.gold }}>&ldquo;Add to Home Screen.&rdquo;</strong> Open it from there and come back to this step to enable notifications.
                </p>
              </div>
            ) : notifState === 'denied' ? (
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px' }}>
                <p style={{ margin: 0, fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
                  Notifications blocked. You can enable them in your browser settings later.
                </p>
              </div>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={notifState === 'loading'}
                style={{
                  width: '100%', padding: '14px',
                  background: S.gold, border: 'none', borderRadius: 2,
                  color: S.dark, fontSize: 14, fontWeight: 'bold',
                  cursor: notifState === 'loading' ? 'wait' : 'pointer',
                  fontFamily: S.font.body, letterSpacing: '0.08em', minHeight: 44,
                }}
              >
                {notifState === 'loading' ? 'Requesting permission…' : 'Enable Notifications'}
              </button>
            )}
          </div>
        )}

        {/* Step 4 — First Selah */}
        {step === 4 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
              Your first Selah Moment
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
              A 5-minute stillness with the Word that welcomed you. When you&rsquo;re ready, begin.
            </p>
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '18px 20px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>{WELCOME_VERSE.reference}</p>
              <p style={{ margin: 0, fontSize: 14, color: S.text, fontFamily: S.font.display, fontStyle: 'italic', lineHeight: 1.75 }}>
                &ldquo;{WELCOME_VERSE.text.slice(0, 100)}&hellip;&rdquo;
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: S.muted, fontStyle: 'italic', textAlign: 'center' }}>
              Clicking &ldquo;Begin&rdquo; will take you to Selah with this verse pre-loaded.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {step > 1 ? (
          <button onClick={() => setStep((s) => s - 1)} className="pf-btn pf-btn--quiet">← Back</button>
        ) : <div />}

        <button onClick={handleNext} disabled={saving} className="pf-btn">
          {saving ? 'Saving…' : step === TOTAL_STEPS ? 'Begin Selah ✦' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
