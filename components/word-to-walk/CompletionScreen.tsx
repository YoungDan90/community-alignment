'use client';

import { useState } from 'react';

interface JourneyStage {
  label: string;
  icon: string;
  primary: string;
  secondary: string;
}

interface CompletionScreenProps {
  commitment: string;
  journey: JourneyStage[];
  onBeginNew: () => void;
  onShareTestimony: () => void;
}

const S = {
  font: {
    display: 'var(--font-cormorant), Georgia, serif',
    body: "Georgia, 'Times New Roman', serif",
  },
  gold: '#c6a75e',
  goldDim: 'rgba(198,167,94,0.15)',
  goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0b1118',
  dark: '#070c12',
  border: '#162030',
  text: '#ddd0b8',
  textLight: '#f0e8d4',
  soft: '#6a8aaa',
  muted: '#c6a75e',
};

export default function CompletionScreen({
  commitment,
  journey,
  onBeginNew,
  onShareTestimony,
}: CompletionScreenProps) {
  const [showJourney, setShowJourney] = useState(false);

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        textAlign: 'center',
        position: 'relative',
        fontFamily: S.font.body,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, rgba(198,167,94,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <span
        style={{ fontSize: 44, color: S.gold, display: 'block', marginBottom: 20 }}
      >
        ✦
      </span>
      <h2
        style={{
          fontFamily: S.font.display,
          fontWeight: 'normal',
          fontSize: 30,
          color: S.textLight,
          margin: '0 0 10px',
          lineHeight: 1.2,
        }}
      >
        Word received.
        <br />
        Now walk.
      </h2>
      <p
        style={{
          fontSize: 14,
          color: S.soft,
          fontStyle: 'italic',
          margin: '0 0 32px',
        }}
      >
        &ldquo;Be doers of the word, and not hearers only.&rdquo; &mdash; James 1:22
      </p>

      {/* Commitment card */}
      {commitment && (
        <div
          style={{
            background: S.card,
            border: `1px solid ${S.goldBorder}`,
            borderRadius: 2,
            padding: '20px 28px',
            maxWidth: 480,
            width: '100%',
            textAlign: 'left',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(to right, ${S.gold}, transparent)`,
            }}
          />
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: S.gold,
            }}
          >
            Your Commitment
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: S.text,
              fontFamily: S.font.display,
              fontStyle: 'italic',
              lineHeight: 1.8,
            }}
          >
            {commitment}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => setShowJourney(!showJourney)}
          style={{
            padding: '11px 22px',
            background: S.goldDim,
            border: `1px solid ${S.goldBorder}`,
            borderRadius: 2,
            color: S.gold,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: S.font.body,
            letterSpacing: '0.06em',
            transition: 'all 0.2s',
          }}
        >
          {showJourney ? 'Hide Journey' : 'View Full Journey'}
        </button>
        <button
          onClick={onShareTestimony}
          style={{
            padding: '11px 22px',
            background: S.goldDim,
            border: `1px solid ${S.goldBorder}`,
            borderRadius: 2,
            color: S.gold,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: S.font.body,
            letterSpacing: '0.06em',
            transition: 'all 0.2s',
          }}
        >
          Share Testimony →
        </button>
        <button
          onClick={onBeginNew}
          style={{
            padding: '11px 22px',
            background: S.gold,
            border: 'none',
            borderRadius: 2,
            color: S.dark,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: S.font.body,
            letterSpacing: '0.06em',
            transition: 'all 0.2s',
          }}
        >
          Begin New Meditation
        </button>
      </div>

      {/* Full journey reveal */}
      {showJourney && (
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            textAlign: 'left',
            marginTop: 8,
          }}
        >
          {journey
            .filter((s) => s.primary.trim())
            .map((s, i) => (
              <div
                key={i}
                style={{
                  background: S.card,
                  border: `1px solid ${S.border}`,
                  borderRadius: 2,
                  padding: '16px 20px',
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: S.gold,
                  }}
                >
                  {s.icon} {s.label}
                </p>
                <p
                  style={{
                    margin: s.secondary ? '0 0 6px' : 0,
                    fontSize: 14,
                    color: S.text,
                    fontFamily: S.font.display,
                    fontStyle: 'italic',
                    lineHeight: 1.7,
                  }}
                >
                  {s.primary}
                </p>
                {s.secondary && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: S.soft,
                      fontFamily: S.font.display,
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                      opacity: 0.8,
                    }}
                  >
                    {s.secondary}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
