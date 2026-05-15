'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SelahSetup, { type SessionConfig, type ActiveVerse } from '@/components/selah/SelahSetup';
import SelahTimer from '@/components/selah/SelahTimer';
import SelahEnd from '@/components/selah/SelahEnd';
import { createClient } from '@/lib/supabase/client';

const FALLBACK_VERSE: ActiveVerse = {
  id: 'fallback',
  reference: 'Psalm 1:2–3',
  nkjv_text:
    'But his delight is in the law of the LORD, and in His law he meditates day and night. He shall be like a tree planted by the rivers of water, that brings forth its fruit in its season.',
  nlt_text:
    'But they delight in the law of the LORD, meditating on it day and night. They are like trees planted along the riverbank, bearing fruit each season. Their leaves never wither, and they prosper in all they do.',
  sermon_series: 'Rooted — A Series on the Word',
};

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "Georgia, 'Times New Roman', serif" },
  gold: '#c6a75e', goldBorder: 'rgba(198,167,94,0.25)',
  border: '#162030', text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#3a5570',
};

export default function SelahPage() {
  const [phase, setPhase] = useState<'setup' | 'session' | 'end'>('setup');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [activeVerse, setActiveVerse] = useState<ActiveVerse | null>(null);
  const [verseText, setVerseText] = useState('');
  const [sessionTranslation, setSessionTranslation] = useState<'nkjv' | 'nlt'>('nkjv');
  const [timeLeft, setTimeLeft] = useState(0);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active verse from Supabase, fall back to default
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('verses')
        .select('id, reference, nkjv_text, nlt_text, sermon_series')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveVerse(data ?? FALLBACK_VERSE);
    })();
  }, []);

  // Fetch verse text for the session display
  const fetchVerseText = useCallback(async (reference: string, translation: 'nkjv' | 'nlt') => {
    // Prefer stored text from Supabase record
    if (activeVerse) {
      const stored = translation === 'nkjv' ? activeVerse.nkjv_text : activeVerse.nlt_text;
      if (stored) { setVerseText(stored); return; }
    }
    try {
      const res = await fetch(`/api/bible/verse?reference=${encodeURIComponent(reference)}`);
      const data = await res.json();
      if (data.verse?.text) setVerseText(data.verse.text);
    } catch {
      // keep existing text
    }
  }, [activeVerse]);

  // Start timer when phase becomes 'session'
  useEffect(() => {
    if (phase === 'session' && config) {
      const totalSeconds = config.duration * 60;
      setTimeLeft(totalSeconds);
      fetchVerseText(activeVerse?.reference ?? 'Psalm 1:2', config.translation);

      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setPhase('end');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, config]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleBegin = (cfg: SessionConfig) => {
    setConfig(cfg);
    setSessionTranslation(cfg.translation);
    setPhase('session');
  };

  const handleTranslationSwap = async (t: 'nkjv' | 'nlt') => {
    setSessionTranslation(t);
    if (activeVerse) await fetchVerseText(activeVerse.reference, t);
  };

  const handleEndEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('end');
  };

  const handleSave = async (note: string) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('selah_sessions').insert({
        user_id: user?.id ?? null,
        verse_id: activeVerse?.id === 'fallback' ? null : (activeVerse?.id ?? null),
        duration_minutes: config?.duration ?? 0,
        focus_type: config?.focus ?? null,
        translation: sessionTranslation,
        music_url: config?.musicUrl || null,
        session_note: note || null,
        completed: true,
      });
    } catch {
      // session save is best-effort — don't block the user
    } finally {
      setSaving(false);
      setPhase('setup');
      setConfig(null);
      setVerseText('');
    }
  };

  // ── Setup phase ───────────────────────────────────────────────
  if (phase === 'setup') {
    return <SelahSetup activeVerse={activeVerse} onBegin={handleBegin} />;
  }

  // ── End phase ─────────────────────────────────────────────────
  if (phase === 'end') {
    return <SelahEnd onSave={handleSave} saving={saving} />;
  }

  // ── Session phase ─────────────────────────────────────────────
  const totalSeconds = (config?.duration ?? 10) * 60;

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        textAlign: 'center',
        position: 'relative',
        fontFamily: S.font.body,
      }}
    >
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(198,167,94,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: S.gold, marginBottom: 8 }}>
        Selah Moments · {config?.focus}
      </p>

      {/* Timer */}
      <div style={{ margin: '24px auto' }}>
        <SelahTimer duration={totalSeconds} timeLeft={timeLeft} />
      </div>

      {/* Verse reference */}
      <p style={{ fontSize: 11, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
        {activeVerse?.reference ?? 'Psalm 1:2–3'}
      </p>

      {/* Verse text */}
      <p style={{ fontSize: 18, color: S.text, lineHeight: 1.9, fontFamily: S.font.display, fontStyle: 'italic', maxWidth: 520, margin: '0 auto 28px' }}>
        &ldquo;{verseText || (sessionTranslation === 'nkjv' ? activeVerse?.nkjv_text : activeVerse?.nlt_text) || ''}&rdquo;
      </p>

      {/* Translation toggle */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
        {(['nkjv', 'nlt'] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTranslationSwap(t)}
            style={{
              padding: '5px 16px', cursor: 'pointer', borderRadius: 20,
              background: sessionTranslation === t ? 'rgba(198,167,94,0.15)' : 'transparent',
              border: `1px solid ${sessionTranslation === t ? S.goldBorder : S.border}`,
              color: sessionTranslation === t ? S.gold : S.muted,
              fontSize: 11, fontFamily: S.font.body, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* End early */}
      <button
        onClick={handleEndEarly}
        style={{
          padding: '10px 24px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${S.border}`,
          borderRadius: 2, color: S.soft, fontSize: 13, cursor: 'pointer',
          fontFamily: S.font.body, letterSpacing: '0.06em', transition: 'all 0.2s',
        }}
      >
        End Session Early
      </button>
    </div>
  );
}
