'use client';

import { useState } from 'react';

export interface BibleVerse {
  reference: string;
  text: string;
  translation: string;
}

interface VerseDisplayProps {
  verse: BibleVerse;
  seriesLabel?: string;
  showToggle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function VerseDisplay({
  verse,
  seriesLabel,
  showToggle = true,
  size = 'md',
}: VerseDisplayProps) {
  const [activeTranslation, setActiveTranslation] = useState<'nkjv' | 'nlt'>(
    verse.translation.toLowerCase() as 'nkjv' | 'nlt',
  );
  const [texts, setTexts] = useState<Record<string, string>>({
    [verse.translation.toLowerCase()]: verse.text,
  });
  const [loading, setLoading] = useState(false);

  const fontSize = { sm: 13, md: 15, lg: 18 }[size];
  const refSize = { sm: 11, md: 13, lg: 14 }[size];

  const switchTranslation = async (t: 'nkjv' | 'nlt') => {
    if (t === activeTranslation) return;
    setActiveTranslation(t);

    if (texts[t]) return; // already fetched

    setLoading(true);
    try {
      const res = await fetch(
        `/api/bible/verse?reference=${encodeURIComponent(verse.reference)}&translation=${t}`,
      );
      const data = await res.json();
      if (res.ok && data.verse?.text) {
        setTexts((prev) => ({ ...prev, [t]: data.verse.text }));
      }
    } catch {
      // silently keep current text
    } finally {
      setLoading(false);
    }
  };

  const displayText = texts[activeTranslation] ?? verse.text;

  return (
    <div
      style={{
        background: '#0b1118',
        border: '1px solid rgba(198,167,94,0.25)',
        borderRadius: 3,
        padding: size === 'sm' ? '14px 18px' : '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {/* Gold top accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(to right, #c6a75e, transparent)',
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 10,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div>
          {seriesLabel && (
            <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3a5570' }}>
              {seriesLabel}
            </p>
          )}
          <p style={{ margin: 0, fontSize: refSize, color: '#c6a75e', letterSpacing: '0.05em' }}>
            {verse.reference}
          </p>
        </div>

        {/* Translation toggle */}
        {showToggle && (
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid #162030',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {(['nkjv', 'nlt'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTranslation(t)}
                style={{
                  padding: '4px 12px',
                  background: activeTranslation === t ? 'rgba(198,167,94,0.15)' : 'none',
                  border: 'none',
                  color: activeTranslation === t ? '#c6a75e' : '#3a5570',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Verse text */}
      <p
        style={{
          margin: 0,
          fontSize,
          color: loading ? '#6a8aaa' : '#ddd0b8',
          lineHeight: 1.85,
          fontStyle: 'italic',
          transition: 'color 0.2s',
        }}
      >
        &ldquo;{loading ? 'Loading…' : displayText}&rdquo;
      </p>

      {/* Translation label */}
      <p style={{ margin: '10px 0 0', fontSize: 10, color: '#3a5570', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        {activeTranslation.toUpperCase()}
      </p>
    </div>
  );
}
