'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SelahEndProps {
  onSave: (note: string) => void;
  saving: boolean;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "Georgia, 'Times New Roman', serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0b1118', dark: '#070c12', border: '#162030',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#3a5570',
};

export default function SelahEnd({ onSave, saving }: SelahEndProps) {
  const [note, setNote] = useState('');
  const router = useRouter();

  const handleCarryIntoWTW = () => {
    if (note.trim()) {
      sessionStorage.setItem('selah_note', note.trim());
    }
    router.push('/word-to-walk');
  };

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
        fontFamily: S.font.body,
      }}
    >
      {/* Glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(198,167,94,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <span style={{ fontSize: 44, color: S.gold, display: 'block', marginBottom: 20 }}>✦</span>
      <h2 style={{ fontFamily: S.font.display, fontWeight: 'normal', fontSize: 30, color: S.textLight, margin: '0 0 8px' }}>
        Selah.
      </h2>
      <p style={{ fontSize: 14, color: S.soft, fontStyle: 'italic', margin: '0 0 36px' }}>
        Pause. Reflect. What did God say?
      </p>

      <div style={{ width: '100%', maxWidth: 480, textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 10 }}>
          What did God say? <span style={{ color: S.muted, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A word, an impression, a scripture that rose up…"
          rows={5}
          style={{
            width: '100%', background: S.card, border: `1px solid ${S.border}`, borderRadius: 2,
            padding: '14px 16px', color: S.text, fontSize: 15, fontFamily: S.font.display,
            fontStyle: 'italic', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.75,
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => onSave(note)}
            disabled={saving}
            style={{
              flex: 1, padding: '12px 22px', background: S.gold, border: 'none', borderRadius: 2,
              color: '#070c12', fontSize: 13, fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: S.font.body, letterSpacing: '0.06em', opacity: saving ? 0.6 : 1, transition: 'opacity 0.2s',
            }}
          >
            {saving ? 'Saving…' : 'Save & Close'}
          </button>
          <button
            onClick={handleCarryIntoWTW}
            style={{
              flex: 1, padding: '12px 22px', background: S.goldDim, border: `1px solid ${S.goldBorder}`,
              borderRadius: 2, color: S.gold, fontSize: 13, cursor: 'pointer',
              fontFamily: S.font.body, letterSpacing: '0.06em', transition: 'all 0.2s',
            }}
          >
            Carry into Word to Walk →
          </button>
        </div>
      </div>
    </div>
  );
}
