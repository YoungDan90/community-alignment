'use client';

import { useState } from 'react';
import BibleSearch from '@/components/ui/BibleSearch';

const DURATIONS = [5, 10, 15, 30];
const FOCUS_TYPES = ['Worship', 'Prayer', 'Stillness', 'Listening', 'Gratitude'];

export interface SessionConfig {
  duration: number;
  focus: string;
  translation: 'nkjv' | 'nlt';
  musicUrl: string;
  verseOverride?: { reference: string; text: string };
}

export interface ActiveVerse {
  id: string;
  reference: string;
  nkjv_text: string | null;
  nlt_text: string | null;
  sermon_series: string | null;
}

interface SelahSetupProps {
  activeVerse: ActiveVerse | null;
  onBegin: (config: SessionConfig) => void;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "Georgia, 'Times New Roman', serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0b1118', dark: '#070c12', border: '#162030',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

export default function SelahSetup({ activeVerse, onBegin }: SelahSetupProps) {
  const [duration, setDuration] = useState(10);
  const [focus, setFocus] = useState('Stillness');
  const [translation, setTranslation] = useState<'nkjv' | 'nlt'>('nkjv');
  const [musicUrl, setMusicUrl] = useState('');
  const [showVerseSearch, setShowVerseSearch] = useState(false);
  const [customVerse, setCustomVerse] = useState<{ reference: string; text: string } | null>(null);

  return (
    <div style={{ padding: '28px 20px', maxWidth: 600, margin: '0 auto', fontFamily: S.font.body }}>
      {/* Header */}
      <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>
        Selah Moments
      </p>
      <h2 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
        Focused Time with God
      </h2>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: S.soft, fontStyle: 'italic' }}>
        &ldquo;Be still and know that I am God.&rdquo; — Psalm 46:10
      </p>

      {/* Verse — week's or custom */}
      {!showVerseSearch && (activeVerse || customVerse) && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: S.card, border: `1px solid ${customVerse ? S.goldBorder : S.goldBorder}`, borderRadius: 3, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />
            {customVerse ? (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>
                  Your choice · {customVerse.reference}
                </p>
                <p style={{ margin: 0, fontSize: 15, color: S.text, fontFamily: S.font.display, fontStyle: 'italic', lineHeight: 1.75 }}>
                  &ldquo;{customVerse.text.slice(0, 120)}{customVerse.text.length > 120 ? '…' : ''}&rdquo;
                </p>
              </>
            ) : activeVerse ? (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>
                  This Week · {activeVerse.reference}
                </p>
                {activeVerse.sermon_series && (
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: S.muted, fontStyle: 'italic' }}>
                    {activeVerse.sermon_series}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 15, color: S.text, fontFamily: S.font.display, fontStyle: 'italic', lineHeight: 1.75 }}>
                  &ldquo;{(activeVerse.nkjv_text ?? '').slice(0, 120)}&hellip;&rdquo;
                </p>
              </>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <button
              onClick={() => setShowVerseSearch(true)}
              style={{ background: 'none', border: 'none', color: S.soft, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: S.font.body, letterSpacing: '0.04em' }}
            >
              Choose a different verse →
            </button>
            {customVerse && (
              <button
                onClick={() => setCustomVerse(null)}
                style={{ background: 'none', border: 'none', color: S.muted, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: S.font.body }}
              >
                Use this week&apos;s verse
              </button>
            )}
          </div>
        </div>
      )}

      {/* BibleSearch for custom verse */}
      {showVerseSearch && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 10px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>
            Choose a verse
          </p>
          <BibleSearch
            onSelect={(verse) => {
              setCustomVerse({ reference: verse.reference, text: verse.text });
              setShowVerseSearch(false);
            }}
          />
          <button
            onClick={() => setShowVerseSearch(false)}
            style={{ background: 'none', border: 'none', color: S.soft, fontSize: 12, cursor: 'pointer', padding: '8px 0 0', fontFamily: S.font.body }}
          >
            ← Cancel
          </button>
        </div>
      )}

      {/* Duration */}
      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 12 }}>
        Duration
      </label>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            style={{
              flex: 1, padding: '14px 0', cursor: 'pointer', borderRadius: 2,
              background: duration === d ? S.goldDim : S.card,
              border: `1px solid ${duration === d ? S.goldBorder : S.border}`,
              color: duration === d ? S.gold : S.soft,
              fontSize: 18, fontFamily: S.font.display, transition: 'all 0.2s',
            }}
          >
            {d}
            <span style={{ fontSize: 10, display: 'block', color: duration === d ? S.gold : S.muted, letterSpacing: '0.1em' }}>
              min
            </span>
          </button>
        ))}
      </div>

      {/* Focus */}
      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 12 }}>
        Focus
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {FOCUS_TYPES.map((f) => (
          <button
            key={f}
            onClick={() => setFocus(f)}
            style={{
              padding: '7px 18px', cursor: 'pointer', borderRadius: 20,
              background: focus === f ? S.goldDim : 'transparent',
              border: `1px solid ${focus === f ? S.goldBorder : S.border}`,
              color: focus === f ? S.gold : S.soft,
              fontSize: 13, fontFamily: S.font.body, transition: 'all 0.2s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Translation */}
      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 12 }}>
        Translation
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['nkjv', 'nlt'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTranslation(t)}
            style={{
              padding: '8px 24px', cursor: 'pointer', borderRadius: 2,
              background: translation === t ? S.goldDim : 'transparent',
              border: `1px solid ${translation === t ? S.goldBorder : S.border}`,
              color: translation === t ? S.gold : S.soft,
              fontSize: 12, fontFamily: S.font.body, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Music */}
      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 8 }}>
        Worship Music <span style={{ color: S.muted, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
      </label>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: S.muted, fontStyle: 'italic' }}>
        Paste a YouTube or Spotify link to play alongside your session
      </p>
      <input
        value={musicUrl}
        onChange={(e) => setMusicUrl(e.target.value)}
        placeholder="https://..."
        style={{
          width: '100%', background: S.card, border: `1px solid ${S.border}`, borderRadius: 2,
          padding: '10px 14px', color: S.text, fontSize: 14, fontFamily: S.font.body,
          outline: 'none', boxSizing: 'border-box', marginBottom: 28,
        }}
      />

      {/* Begin */}
      <button
        onClick={() => onBegin({ duration, focus, translation, musicUrl, verseOverride: customVerse ?? undefined })}
        style={{
          width: '100%', padding: '15px', background: S.gold, border: 'none', borderRadius: 2,
          color: '#070c12', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
          fontFamily: S.font.body, letterSpacing: '0.08em', transition: 'opacity 0.2s',
        }}
      >
        Begin Selah Moments ✦
      </button>
    </div>
  );
}
