'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SubmitRequestModalProps {
  onClose: () => void;
  onSubmitted: () => void;
}

const CATEGORIES = ['Healing', 'Family', 'Provision', 'Guidance', 'Protection', 'Relationships', 'Work', 'Other'];

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

export default function SubmitRequestModal({ onClose, onSubmitted }: SubmitRequestModalProps) {
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = category && content.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from('prayer_requests').insert({
        user_id: user?.id ?? null,
        content: content.trim(),
        category,
        is_anonymous: isAnonymous,
        status: 'pending',
      });
      if (err) throw err;
      onSubmitted();
    } catch {
      setError('Could not submit your request. Please try again.');
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
          Submit a Prayer Request
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: S.soft, fontStyle: 'italic' }}>
          Your request will be reviewed before it appears on the wall.
        </p>

        <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft }}>Category</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '4px 14px',
                borderRadius: 20,
                background: category === c ? S.goldDim : 'transparent',
                border: `1px solid ${category === c ? S.goldBorder : S.border}`,
                color: category === c ? S.gold : S.muted,
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: S.font.body,
                letterSpacing: '0.06em',
                transition: 'all 0.2s',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft }}>Your Request</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share what you need prayer for…"
          rows={5}
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
          <span style={{ fontSize: 12, color: S.soft }}>Submit anonymously</span>
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
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
