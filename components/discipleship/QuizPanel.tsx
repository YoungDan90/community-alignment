'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { KnowledgeCheckQuestion } from '@/lib/types';

interface Props {
  lessonId: string;
  questions: KnowledgeCheckQuestion[];
  reflectionAnswer: string;
  onPassed: () => void;
}

const PASS_THRESHOLD = 0.8;

export default function QuizPanel({ lessonId, questions, reflectionAnswer, onPassed }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const allAnswered = questions.every(q => answers[q.id]);

  const handleSelect = (questionId: string, optionId: string) => {
    if (result) return; // no changing answers after grading, must hit retake
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);

    const correctCount = questions.filter(q => answers[q.id] === q.correct_option_id).length;
    const passed = correctCount / questions.length >= PASS_THRESHOLD;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      lesson_id: lessonId,
      score: correctCount,
      passed,
    });

    if (passed) {
      await supabase.from('user_progress').upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          completed_at: new Date().toISOString(),
          reflection_answer: reflectionAnswer || null,
        },
        { onConflict: 'user_id,lesson_id' },
      );
    }

    setResult({ score: correctCount, passed });
    setSubmitting(false);
    if (passed) onPassed();
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div>
      <p className="pf-card-label">Knowledge Check</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {questions.map((q, qi) => {
          const selected = answers[q.id];
          const isCorrect = result && selected === q.correct_option_id;
          return (
            <div key={q.id}>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--pf-text-bright)' }}>
                {qi + 1}. {q.prompt}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map(opt => {
                  const isSelected = selected === opt.id;
                  const isCorrectOption = result && opt.id === q.correct_option_id;
                  const isWrongSelected = result && isSelected && !isCorrectOption;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelect(q.id, opt.id)}
                      disabled={!!result}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        borderRadius: 'var(--pf-radius-sm)',
                        border: `1px solid ${isCorrectOption ? 'var(--pf-green)' : isWrongSelected ? 'var(--pf-danger)' : isSelected ? 'var(--pf-gold-border)' : 'var(--pf-border)'}`,
                        background: isCorrectOption ? 'rgba(116,189,147,0.12)' : isWrongSelected ? 'rgba(224,112,112,0.12)' : isSelected ? 'var(--pf-gold-dim)' : 'var(--pf-bg)',
                        color: isSelected || isCorrectOption ? 'var(--pf-text-bright)' : 'var(--pf-text)',
                        fontSize: 13.5, fontFamily: 'var(--pf-sans)',
                        cursor: result ? 'default' : 'pointer',
                      }}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>
              {result && !isCorrect && q.explanation && (
                <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!result && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="pf-btn"
          style={{ marginTop: 18, width: '100%' }}
        >
          {submitting ? 'Grading…' : 'Submit Answers'}
        </button>
      )}

      {result && !result.passed && (
        <div style={{ marginTop: 18 }}>
          <p className="pf-banner" style={{ color: 'var(--pf-danger)', background: 'rgba(224,112,112,0.1)', borderColor: 'rgba(224,112,112,0.3)' }}>
            You scored {result.score} of {questions.length}. Review the explanations above and try again.
          </p>
          <button type="button" onClick={handleRetake} className="pf-btn pf-btn--ghost" style={{ width: '100%' }}>
            Retake Quiz
          </button>
        </div>
      )}

      {result && result.passed && (
        <p className="pf-banner" style={{ marginTop: 18 }}>
          ✦ You scored {result.score} of {questions.length} — lesson complete.
        </p>
      )}
    </div>
  );
}
