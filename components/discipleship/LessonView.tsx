'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Lesson, KnowledgeCheckQuestion } from '@/lib/types';
import LessonContent from './LessonContent';
import QuizPanel from './QuizPanel';

interface Props {
  trackSlug: string;
  moduleSlug: string;
  lesson: Lesson;
  questions: KnowledgeCheckQuestion[];
  existingProgress: { completed_at: string | null; reflection_answer: string | null } | null;
  nextLessonSlug: string | null;
}

export default function LessonView({ trackSlug, moduleSlug, lesson, questions, existingProgress, nextLessonSlug }: Props) {
  const [reflection, setReflection] = useState(existingProgress?.reflection_answer ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passed, setPassed] = useState(!!existingProgress?.completed_at);

  const handleSaveReflection = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_progress').upsert(
        { user_id: user.id, lesson_id: lesson.id, reflection_answer: reflection },
        { onConflict: 'user_id,lesson_id' },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  return (
    <div className="pf-page">
      <div className="pf-head">
        <p className="pf-eyebrow">{lesson.subtitle ?? 'Lesson'}</p>
        <h1 className="pf-title">{lesson.title}</h1>
        <Link href={`/discipleship/${trackSlug}/${moduleSlug}`} className="pf-sub" style={{ textDecoration: 'none' }}>
          ← Back to lessons
        </Link>
      </div>

      <div className="pf-card" style={{ marginBottom: 20 }}>
        <LessonContent content={lesson.content_md} />

        {lesson.further_reading?.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--pf-border-soft)' }}>
            <p className="pf-card-label">Further Reading</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lesson.further_reading.map((r, i) => (
                <div key={i}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-gold)', fontWeight: 600 }}>{r.reference}</p>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--pf-text-soft)' }}>{r.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {lesson.reflection_prompt && (
        <div className="pf-card pf-card--accent" style={{ marginBottom: 20 }}>
          <p className="pf-card-label">Reflection</p>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>
            {lesson.reflection_prompt}
          </p>
          <textarea
            className="pf-input"
            rows={4}
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="Share your thoughts — your mentor will be able to see this."
          />
          <button
            type="button"
            onClick={handleSaveReflection}
            disabled={saving}
            className="pf-btn pf-btn--ghost pf-btn--sm"
            style={{ marginTop: 10 }}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Reflection'}
          </button>
        </div>
      )}

      {questions.length > 0 && !passed && (
        <div className="pf-card">
          <QuizPanel
            lessonId={lesson.id}
            questions={questions}
            reflectionAnswer={reflection}
            onPassed={() => setPassed(true)}
          />
        </div>
      )}

      {passed && (
        <div className="pf-card pf-card--accent" style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--pf-text-bright)' }}>
            ✦ Lesson complete.
          </p>
          {nextLessonSlug ? (
            <Link href={`/discipleship/${trackSlug}/${moduleSlug}/${nextLessonSlug}`} className="pf-btn">
              Continue to Next Lesson
            </Link>
          ) : (
            <>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>
                You&apos;ve completed this module.
              </p>
              <Link href={`/discipleship/${trackSlug}`} className="pf-btn pf-btn--ghost">
                Back to Modules
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
