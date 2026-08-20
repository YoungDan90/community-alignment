'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Track } from '@/lib/types';
import ProgressBar from '@/components/discipleship/ProgressBar';

interface TrackWithProgress extends Track {
  totalLessons: number;
  completedLessons: number;
}

export default function DiscipleshipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<TrackWithProgress[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: trackData } = await supabase
        .from('tracks')
        .select('*')
        .order('order_index');

      const { data: moduleData } = await supabase
        .from('modules')
        .select('id, track_id');

      const moduleIds = (moduleData ?? []).map((m: { id: string }) => m.id);

      const { data: lessonData } = moduleIds.length > 0
        ? await supabase.from('lessons').select('id, module_id').in('module_id', moduleIds)
        : { data: [] };

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      const completedLessonIds = new Set((progressData ?? []).map((p: { lesson_id: string }) => p.lesson_id));
      const moduleToTrack: Record<string, string> = {};
      (moduleData ?? []).forEach((m: { id: string; track_id: string }) => { moduleToTrack[m.id] = m.track_id; });

      const totals: Record<string, number> = {};
      const completed: Record<string, number> = {};
      (lessonData ?? []).forEach((l: { id: string; module_id: string }) => {
        const trackId = moduleToTrack[l.module_id];
        if (!trackId) return;
        totals[trackId] = (totals[trackId] ?? 0) + 1;
        if (completedLessonIds.has(l.id)) completed[trackId] = (completed[trackId] ?? 0) + 1;
      });

      setTracks((trackData ?? []).map((t: Track) => ({
        ...t,
        totalLessons: totals[t.id] ?? 0,
        completedLessons: completed[t.id] ?? 0,
      })));
      setLoading(false);
    })();
  }, [router]);

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
      {[0, 1, 2].map(i => <div key={i} className="pf-skel" style={{ height: 100, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div className="pf-page">
      <div className="pf-head">
        <p className="pf-eyebrow">Grow</p>
        <h1 className="pf-title">Discipleship Pathway</h1>
        <p className="pf-sub">Grow in maturity, one track at a time.</p>
      </div>

      {tracks.length === 0 && (
        <div className="pf-empty">
          <span className="pf-empty-icon">✦</span>
          No tracks are available yet.
        </div>
      )}

      <div className="pf-grid2">
        {tracks.map(track => (
          <Link key={track.id} href={`/discipleship/${track.slug}`} className="pf-card pf-card--link pf-card--accent">
            <p className="pf-card-label">{track.title}</p>
            {track.description && (
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>
                {track.description}
              </p>
            )}
            <ProgressBar completed={track.completedLessons} total={track.totalLessons} />
          </Link>
        ))}
      </div>
    </div>
  );
}
