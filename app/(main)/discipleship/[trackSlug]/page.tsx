'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Track, DiscipleshipModule } from '@/lib/types';
import ProgressBar from '@/components/discipleship/ProgressBar';

interface ModuleWithProgress extends DiscipleshipModule {
  totalLessons: number;
  completedLessons: number;
}

export default function TrackModulesPage() {
  const router = useRouter();
  const params = useParams<{ trackSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<Track | null>(null);
  const [modules, setModules] = useState<ModuleWithProgress[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: trackData } = await supabase
        .from('tracks')
        .select('*')
        .eq('slug', params.trackSlug)
        .maybeSingle();

      if (!trackData) { router.push('/discipleship'); return; }
      setTrack(trackData);

      const { data: moduleData } = await supabase
        .from('modules')
        .select('*')
        .eq('track_id', trackData.id)
        .order('order_index');

      const moduleIds = (moduleData ?? []).map((m: DiscipleshipModule) => m.id);

      const { data: lessonData } = moduleIds.length > 0
        ? await supabase.from('lessons').select('id, module_id').in('module_id', moduleIds)
        : { data: [] };

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      const completedLessonIds = new Set((progressData ?? []).map((p: { lesson_id: string }) => p.lesson_id));

      const totals: Record<string, number> = {};
      const completed: Record<string, number> = {};
      (lessonData ?? []).forEach((l: { id: string; module_id: string }) => {
        totals[l.module_id] = (totals[l.module_id] ?? 0) + 1;
        if (completedLessonIds.has(l.id)) completed[l.module_id] = (completed[l.module_id] ?? 0) + 1;
      });

      setModules((moduleData ?? []).map((m: DiscipleshipModule) => ({
        ...m,
        totalLessons: totals[m.id] ?? 0,
        completedLessons: completed[m.id] ?? 0,
      })));
      setLoading(false);
    })();
  }, [router, params.trackSlug]);

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
      {[0, 1, 2].map(i => <div key={i} className="pf-skel" style={{ height: 90, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  if (!track) return null;

  return (
    <div className="pf-page">
      <div className="pf-head">
        <Link href="/discipleship" className="pf-sub" style={{ textDecoration: 'none', display: 'block', marginBottom: 6 }}>
          ← All Tracks
        </Link>
        <p className="pf-eyebrow">Track</p>
        <h1 className="pf-title">{track.title}</h1>
        {track.description && <p className="pf-sub">{track.description}</p>}
      </div>

      {modules.length === 0 && (
        <div className="pf-empty">
          <span className="pf-empty-icon">✦</span>
          No modules are available yet in this track.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modules.map(mod => (
          <Link key={mod.id} href={`/discipleship/${track.slug}/${mod.slug}`} className="pf-card pf-card--link">
            <p className="pf-card-label">{mod.title}</p>
            {mod.description && (
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>
                {mod.description}
              </p>
            )}
            <ProgressBar completed={mod.completedLessons} total={mod.totalLessons} />
          </Link>
        ))}
      </div>
    </div>
  );
}
