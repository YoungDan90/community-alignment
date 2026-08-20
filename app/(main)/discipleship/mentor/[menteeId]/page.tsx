'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface LessonRow {
  id: string;
  title: string;
  moduleTitle: string;
  completed: boolean;
  completedAt: string | null;
  reflectionAnswer: string | null;
  quizScore: string | null;
}

// TODO(phase2): leader/teacher guide viewer belongs here for pastoral staff.
export default function MenteeDetailPage() {
  const router = useRouter();
  const params = useParams<{ menteeId: string }>();
  const [loading, setLoading] = useState(true);
  const [menteeName, setMenteeName] = useState('Member');
  const [lessons, setLessons] = useState<LessonRow[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: pairing } = await supabase
        .from('mentor_pairings')
        .select('id, track_id, mentee:mentee_id(full_name)')
        .eq('mentor_id', user.id)
        .eq('mentee_id', params.menteeId)
        .eq('status', 'active')
        .maybeSingle();

      if (!pairing) { router.replace('/discipleship/mentor'); return; }

      type MenteeInfo = { full_name: string | null } | { full_name: string | null }[] | null;
      const menteeInfo = pairing.mentee as MenteeInfo;
      const profile = Array.isArray(menteeInfo) ? menteeInfo[0] : menteeInfo;
      setMenteeName(profile?.full_name ?? 'Member');

      if (!pairing.track_id) { setLoading(false); return; }

      const { data: moduleData } = await supabase
        .from('modules')
        .select('id, title, order_index')
        .eq('track_id', pairing.track_id)
        .order('order_index');

      const moduleIds = (moduleData ?? []).map((m: { id: string }) => m.id);
      const moduleTitleMap: Record<string, string> = {};
      (moduleData ?? []).forEach((m: { id: string; title: string }) => { moduleTitleMap[m.id] = m.title; });

      const { data: lessonData } = moduleIds.length > 0
        ? await supabase.from('lessons').select('id, title, module_id, order_index').in('module_id', moduleIds).order('order_index')
        : { data: [] };

      const lessonIds = (lessonData ?? []).map((l: { id: string }) => l.id);

      const { data: progressData } = lessonIds.length > 0
        ? await supabase.from('user_progress').select('lesson_id, completed_at, reflection_answer').eq('user_id', params.menteeId).in('lesson_id', lessonIds)
        : { data: [] };

      const { data: attemptData } = lessonIds.length > 0
        ? await supabase.from('quiz_attempts').select('lesson_id, score, passed, attempted_at').eq('user_id', params.menteeId).in('lesson_id', lessonIds).order('attempted_at', { ascending: false })
        : { data: [] };

      const progressMap: Record<string, { completed_at: string | null; reflection_answer: string | null }> = {};
      (progressData ?? []).forEach((p: { lesson_id: string; completed_at: string | null; reflection_answer: string | null }) => {
        progressMap[p.lesson_id] = p;
      });

      const bestAttemptMap: Record<string, { score: number; passed: boolean }> = {};
      (attemptData ?? []).forEach((a: { lesson_id: string; score: number; passed: boolean }) => {
        if (!bestAttemptMap[a.lesson_id]) bestAttemptMap[a.lesson_id] = a;
      });

      setLessons((lessonData ?? []).map((l: { id: string; title: string; module_id: string }) => {
        const progress = progressMap[l.id];
        const attempt = bestAttemptMap[l.id];
        return {
          id: l.id,
          title: l.title,
          moduleTitle: moduleTitleMap[l.module_id] ?? '',
          completed: !!progress?.completed_at,
          completedAt: progress?.completed_at ?? null,
          reflectionAnswer: progress?.reflection_answer ?? null,
          quizScore: attempt ? `${attempt.score} (${attempt.passed ? 'passed' : 'not passed'})` : null,
        };
      }));

      setLoading(false);
    })();
  }, [router, params.menteeId]);

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
      {[0, 1, 2].map(i => <div key={i} className="pf-skel" style={{ height: 80, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div className="pf-page">
      <div className="pf-head">
        <Link href="/discipleship/mentor" className="pf-sub" style={{ textDecoration: 'none', display: 'block', marginBottom: 6 }}>
          ← My Mentees
        </Link>
        <p className="pf-eyebrow">Mentee</p>
        <h1 className="pf-title">{menteeName}</h1>
      </div>

      {lessons.length === 0 && (
        <div className="pf-empty">
          <span className="pf-empty-icon">✦</span>
          No lesson progress to show yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lessons.map(l => (
          <div key={l.id} className="pf-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pf-text-dim)' }}>
                  {l.moduleTitle}
                </p>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--pf-text-bright)' }}>{l.title}</p>
              </div>
              {l.completed && <span className="pf-chip">Complete</span>}
            </div>
            {l.quizScore && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--pf-text-soft)' }}>Quiz score: {l.quizScore}</p>
            )}
            {l.reflectionAnswer && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--pf-border-soft)' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pf-text-dim)' }}>
                  Reflection
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-text)', whiteSpace: 'pre-wrap' }}>{l.reflectionAnswer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
