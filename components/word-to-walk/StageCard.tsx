'use client';

export interface WTWStageConfig {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  secondary: string;
  placeholder: string;
}

export interface WTWVerse {
  id: string;
  reference: string;
  nkjv_text: string | null;
  nlt_text: string | null;
  sermon_series: string | null;
}

interface StageCardProps {
  stage: WTWStageConfig;
  stageIndex: number;
  totalStages: number;
  verse: WTWVerse | null;
  translation: 'nkjv' | 'nlt';
  onTranslationChange: (t: 'nkjv' | 'nlt') => void;
  primaryValue: string;
  onPrimaryChange: (v: string) => void;
  secondaryValue: string;
  onSecondaryChange: (v: string) => void;
  showVerseAnchor: boolean;
  animating: boolean;
  // Stage-specific extras
  isShared?: boolean;
  onSharedChange?: (v: boolean) => void;
}

const S = {
  font: {
    display: 'var(--font-cormorant), Georgia, serif',
    body: "var(--font-jost), 'Jost', sans-serif",
  },
  gold: '#c6a75e',
  goldDim: 'rgba(198,167,94,0.15)',
  goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828',
  dark: '#0f1e2e',
  border: '#1e3a52',
  text: '#ddd0b8',
  textLight: '#f0e8d4',
  soft: '#6a8aaa',
  muted: '#c6a75e',
};

export default function StageCard({
  stage,
  stageIndex,
  totalStages,
  verse,
  translation,
  onTranslationChange,
  primaryValue,
  onPrimaryChange,
  secondaryValue,
  onSecondaryChange,
  showVerseAnchor,
  animating,
  isShared,
  onSharedChange,
}: StageCardProps) {
  const verseText =
    translation === 'nkjv' ? verse?.nkjv_text : verse?.nlt_text;

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 3,
        padding: '28px 28px 24px',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        fontFamily: S.font.body,
      }}
    >
      {/* Stage header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 28, color: S.gold, lineHeight: 1 }}>
          {stage.icon}
        </span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: S.muted,
            }}
          >
            Step {stageIndex + 1} of {totalStages}
          </p>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 'normal',
              color: S.textLight,
              fontFamily: S.font.display,
            }}
          >
            {stage.label}
          </h2>
        </div>
      </div>

      {/* Gold accent */}
      <div
        style={{
          height: 1,
          width: 40,
          background: S.gold,
          marginBottom: 20,
          opacity: 0.6,
        }}
      />

      {/* Verse anchor (stages 1–6) */}
      {showVerseAnchor && verse && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['nkjv', 'nlt'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTranslationChange(t)}
                style={{
                  padding: '3px 12px',
                  cursor: 'pointer',
                  borderRadius: 20,
                  background: translation === t ? S.goldDim : 'transparent',
                  border: `1px solid ${translation === t ? S.goldBorder : S.border}`,
                  color: translation === t ? S.gold : S.muted,
                  fontSize: 10,
                  fontFamily: S.font.body,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div
            style={{
              background: S.dark,
              border: `1px solid ${S.border}`,
              borderLeft: `3px solid ${S.gold}`,
              padding: '11px 14px',
              borderRadius: '0 2px 2px 0',
            }}
          >
            <p
              style={{
                margin: '0 0 2px',
                fontSize: 10,
                color: S.gold,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {verse.reference} &middot; {translation.toUpperCase()}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: S.soft,
                fontFamily: S.font.display,
                fontStyle: 'italic',
                lineHeight: 1.65,
              }}
            >
              &ldquo;
              {(verseText ?? '').slice(0, 120)}
              &hellip;&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Primary prompt + textarea */}
      <label
        style={{
          display: 'block',
          fontSize: 11,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: S.soft,
          marginBottom: 10,
        }}
      >
        {stage.prompt}
      </label>
      <textarea
        value={primaryValue}
        onChange={(e) => onPrimaryChange(e.target.value)}
        placeholder={stage.placeholder}
        rows={stageIndex === 0 ? 3 : 4}
        style={{
          width: '100%',
          background: S.dark,
          border: `1px solid ${S.border}`,
          borderRadius: 2,
          padding: '12px 14px',
          color: S.text,
          fontSize: 15,
          fontFamily: S.font.display,
          fontStyle: 'italic',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          lineHeight: 1.75,
          marginBottom: 16,
        }}
      />

      {/* Secondary reflective question + textarea */}
      <label
        style={{
          display: 'block',
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: S.muted,
          marginBottom: 8,
        }}
      >
        {stage.secondary}
      </label>
      <textarea
        value={secondaryValue}
        onChange={(e) => onSecondaryChange(e.target.value)}
        placeholder="Optional reflection…"
        rows={2}
        style={{
          width: '100%',
          background: S.dark,
          border: `1px solid ${S.border}`,
          borderRadius: 2,
          padding: '10px 14px',
          color: S.text,
          fontSize: 13,
          fontFamily: S.font.display,
          fontStyle: 'italic',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          lineHeight: 1.65,
          opacity: 0.8,
        }}
      />

      {/* Identify hint */}
      {stage.id === 'identify' && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background: S.goldDim,
            border: `1px solid ${S.goldBorder}`,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: S.gold, fontSize: 12 }}>🙏</span>
          <span style={{ fontSize: 12, color: S.soft }}>
            You can turn this into an anonymous prayer request after completing your journey.
          </span>
        </div>
      )}

      {/* Do — share toggle */}
      {stage.id === 'do' && (
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            onClick={() => onSharedChange?.(!isShared)}
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              border: `1px solid ${isShared ? S.gold : S.border}`,
              background: isShared ? S.goldDim : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: S.gold,
              fontSize: 10,
              flexShrink: 0,
            }}
          >
            {isShared ? '✓' : ''}
          </button>
          <span style={{ fontSize: 12, color: S.soft }}>
            Share this journey with the community (your commitment stays private)
          </span>
        </div>
      )}

      {/* Review hint */}
      {stage.id === 'review' && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background: S.goldDim,
            border: `1px solid ${S.goldBorder}`,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: S.gold, fontSize: 12 }}>✦</span>
          <span style={{ fontSize: 12, color: S.soft }}>
            You can submit a testimony after completing your journey.
          </span>
        </div>
      )}
    </div>
  );
}
