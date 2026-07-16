'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SubmitRequestModalProps {
  onClose: () => void;
  onSubmitted: () => void;
}

const CATEGORIES = ['Healing', 'Family', 'Provision', 'Guidance', 'Protection', 'Relationships', 'Work', 'Other'];

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
    <div className="pf-modal-overlay" onClick={onClose}>
      <div
        className="pf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prayer-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="pf-modal-title" id="prayer-modal-title">Submit a Prayer Request</h3>
        <p className="pf-sub" style={{ marginBottom: 24 }}>
          Your request will be reviewed before it appears on the wall.
        </p>

        <p className="pf-label" style={{ marginBottom: 8 }}>Category</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }} role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className="pf-tabbtn"
              style={{ borderRadius: 20, minHeight: 32, padding: '4px 14px', textTransform: 'none', letterSpacing: '0.05em' }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="pf-field">
          <label className="pf-label" htmlFor="prayer-content">Your Request</label>
          <textarea
            id="prayer-content"
            className="pf-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share what you need prayer for…"
            rows={5}
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
          <span style={{ fontSize: 13, color: 'var(--pf-text-soft)' }}>Submit anonymously</span>
        </label>

        {error && <p role="alert" style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="pf-btn pf-btn--quiet">Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="pf-btn">
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
