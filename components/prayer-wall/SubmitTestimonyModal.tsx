'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SubmitTestimonyModalProps {
  onClose: () => void;
  onSubmitted: () => void;
}

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
        verse_reference: scripture.trim() || null,
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
    <div className="pf-modal-overlay" onClick={onClose}>
      <div
        className="pf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="testimony-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="pf-modal-title" id="testimony-modal-title">Share a Testimony</h3>
        <p className="pf-sub" style={{ marginBottom: 24 }}>
          Tell what God has done. Your testimony will be reviewed before it is published.
        </p>

        <div className="pf-field">
          <label className="pf-label" htmlFor="testimony-scripture">Scripture (optional)</label>
          <input
            id="testimony-scripture"
            className="pf-input"
            value={scripture}
            onChange={(e) => setScripture(e.target.value)}
            placeholder="e.g. Psalm 34:4"
            style={{ fontFamily: 'var(--pf-serif)', fontStyle: 'italic' }}
          />
        </div>

        <div className="pf-field">
          <label className="pf-label" htmlFor="testimony-content">Your Testimony</label>
          <textarea
            id="testimony-content"
            className="pf-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did God do? How did He answer? Share honestly and specifically…"
            rows={6}
            style={{ fontFamily: 'var(--pf-serif)', fontStyle: 'italic', lineHeight: 1.75 }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--pf-gold)' }}
          />
          <span style={{ fontSize: 13, color: 'var(--pf-text-soft)' }}>Share anonymously</span>
        </label>

        {error && <p role="alert" style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="pf-btn pf-btn--quiet">Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="pf-btn">
            {submitting ? 'Submitting…' : 'Share Testimony'}
          </button>
        </div>
      </div>
    </div>
  );
}
