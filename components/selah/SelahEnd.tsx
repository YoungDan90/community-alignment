'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SelahEndProps {
  onSave: (note: string) => void;
  saving: boolean;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
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
        <label htmlFor="selah-note" style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 10 }}>
          What did God say? <span style={{ color: S.muted, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          id="selah-note"
          className="pf-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A word, an impression, a scripture that rose up…"
          rows={5}
          style={{ fontFamily: S.font.display, fontStyle: 'italic', lineHeight: 1.75 }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={() => onSave(note)} disabled={saving} className="pf-btn" style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Save & Close'}
          </button>
          <button onClick={handleCarryIntoWTW} className="pf-btn pf-btn--ghost" style={{ flex: 1 }}>
            Carry into Word to Walk →
          </button>
        </div>
      </div>
    </div>
  );
}
