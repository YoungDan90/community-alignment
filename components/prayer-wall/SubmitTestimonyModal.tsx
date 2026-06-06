'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SubmitTestimonyModalProps {
  onClose: () => void;
  onSubmitted: () => void;
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

export default function SubmitTestimonyModal({ onClose, onSubmitted }: SubmitTestimonyModalProps) {
  const [scripture, setScripture] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = content.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from('testimonies').insert({
        user_id: user?.id ?? null,
        content: content.trim(),
        scripture_reference: scripture.trim() || null,
        is_anonymous: isAnonymous,
        status: 'pending',
      });
      if (err) throw err;
      onSubmitted();
    } catch {
      setError('Could not submit your testimony. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,12,18,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: S.card,
          border: `1px solid ${S.border}`,
          borderRadius: 4,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 480,
          position: 'relative',
          fontFamily: S.font.body,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />

        <h3 style={{ margin: '0 0 4px', fontFamily: S.font.display, fontWeight: 'normal', fontSize: 22, color: S.textLight }}>
          Share a Testimony
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: S.soft, fontStyle: 'italic' }}>
          Tell what God has done. Your testimony will be reviewed before it is published.
        </p>

        <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft }}>
          Scripture (optional)
        </p>
        <input
          value={scripture}
          onChange={(e) => setScripture(e.target.value)}
          placeholder="e.g. Psalm 34:4"
          style={{
            width: '100%',
            background: S.dark,
            border: `1px solid ${S.border}`,
            borderRadius: 2,
            padding: '10px 14px',
            color: S.text,
            fontSize: 14,
            fontFamily: S.font.display,
            fontStyle: 'italic',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 16,
          }}
        />

        <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft }}>
          Your Testimony
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did God do? How did He answer? Share honestly and specifically…"
          rows={6}
          style={{
            width: '100%',
            background: S.dark,
            border: `1px solid ${S.border}`,
            borderRadius: 2,
            padding: '12px 14px',
            color: S.text,
            fontSize: 14,
            fontFamily: S.font.display,
            fontStyle: 'italic',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            lineHeight: 1.75,
            marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            style={{
              width: 18, height: 18, borderRadius: 3,
              border: `1px solid ${isAnonymous ? S.gold : S.border}`,
              background: isAnonymous ? S.goldDim : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: S.gold, fontSize: 10, flexShrink: 0,
            }}
          >
            {isAnonymous ? '✓' : ''}
          </button>
          <span style={{ fontSize: 12, color: S.soft }}>Share anonymously</span>
        </div>

        {error && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#e07070' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', background: 'transparent', border: `1px solid ${S.border}`,
              borderRadius: 2, color: S.soft, fontSize: 13, cursor: 'pointer', fontFamily: S.font.body,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{
              padding: '10px 24px',
              background: canSubmit && !submitting ? S.gold : 'rgba(198,167,94,0.2)',
              border: 'none', borderRadius: 2,
              color: canSubmit && !submitting ? S.dark : S.muted,
              fontSize: 13, fontWeight: 'bold', cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
              fontFamily: S.font.body, letterSpacing: '0.06em', transition: 'all 0.2s',
            }}
          >
            {submitting ? 'Submitting…' : 'Share Testimony'}
          </button>
        </div>
      </div>
    </div>
  );
}
