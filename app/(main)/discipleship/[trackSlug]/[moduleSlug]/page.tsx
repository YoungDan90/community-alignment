'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Track, DiscipleshipModule, Lesson } from '@/lib/types';

interface LessonWithState extends Lesson {
  completed: boolean;
  locked: boolean;
}

export default function ModuleLessonsPage() {
  const router = useRouter();
  const params = useParams<{ trackSlug: string; moduleSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<Track | null>(null);
  const [mod, setMod] = useState<DiscipleshipModule | null>(null);
  const [lessons, setLessons] = useState<LessonWithState[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: trackData } = await supabase.from('tracks').select('*').eq('slug', params.trackSlug).maybeSingle();
      if (!trackData) { router.push('/discipleship'); return; }
      setTrack(trackData);

      const { data: modData } = await supabase
        .from('modules')
        .select('*')
        .eq('track_id', trackData.id)
        .eq('slug', params.moduleSlug)
        .maybeSingle();
      if (!modData) { router.push(`/discipleship/${params.trackSlug}`); return; }
      setMod(modData);

      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', modData.id)
        .order('order_index');

      const lessonIds = (lessonData ?? []).map((l: Lesson) => l.id);
      const { data: progressData } = lessonIds.length > 0
        ? await supabase.from('user_progress').select('lesson_id, completed_at').eq('user_id', user.id).in('lesson_id', lessonIds)
        : { data: [] };

      const completedSet = new Set(
        (progressData ?? []).filter((p: { completed_at: string | null }) => p.completed_at).map((p: { lesson_id: string }) => p.lesson_id),
      );

      let priorCompleted = true;
      setLessons((lessonData ?? []).map((l: Lesson) => {
        const completed = completedSet.has(l.id);
        const locked = !priorCompleted;
        priorCompleted = completed;
        return { ...l, completed, locked };
      }));

      setLoading(false);
    })();
  }, [router, params.trackSlug, params.moduleSlug]);

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
      {[0, 1, 2, 3].map(i => <div key={i} className="pf-skel" style={{ height: 60, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  if (!track || !mod) return null;

  return (
    <div className="pf-page">
      <div className="pf-head">
        <Link href={`/discipleship/${track.slug}`} className="pf-sub" style={{ textDecoration: 'none', display: 'block', marginBottom: 6 }}>
          ← {track.title}
        </Link>
        <p className="pf-eyebrow">Module</p>
        <h1 className="pf-title">{mod.title}</h1>
        {mod.description && <p className="pf-sub">{mod.description}</p>}
      </div>

      {lessons.length === 0 && (
        <div className="pf-empty">
          <span className="pf-empty-icon">✦</span>
          No lessons are available yet in this module.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lessons.map((lesson, i) => {
          const content = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--pf-text-dim)', fontFamily: 'var(--pf-serif)' }}>{i + 1}</span>
                <p style={{ margin: 0, fontSize: 15, color: lesson.locked ? 'var(--pf-text-soft)' : 'var(--pf-text-bright)', flex: 1 }}>
                  {lesson.title}
                </p>
                {lesson.completed && <span className="pf-chip">Complete</span>}
                {lesson.locked && <span className="pf-chip" style={{ opacity: 0.6 }}>🔒 Locked</span>}
              </div>
              {lesson.subtitle && !lesson.locked && (
                <p style={{ margin: '6px 0 0 26px', fontSize: 12.5, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>
                  {lesson.subtitle}
                </p>
              )}
            </>
          );

          return lesson.locked ? (
            <div key={lesson.id} className="pf-card" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              {content}
            </div>
          ) : (
            <Link key={lesson.id} href={`/discipleship/${track.slug}/${mod.slug}/${lesson.slug}`} className="pf-card pf-card--link">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
