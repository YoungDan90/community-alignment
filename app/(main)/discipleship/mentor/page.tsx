'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface MenteeRow {
  pairingId: string;
  menteeId: string;
  menteeName: string;
  trackTitle: string | null;
  totalLessons: number;
  completedLessons: number;
}

export default function MentorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mentees, setMentees] = useState<MenteeRow[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: pairings } = await supabase
        .from('mentor_pairings')
        .select('id, mentee_id, track_id, status, mentee:mentee_id(full_name), track:track_id(title)')
        .eq('mentor_id', user.id)
        .eq('status', 'active');

      if (!pairings || pairings.length === 0) {
        router.replace('/discipleship');
        return;
      }

      type PairingRow = {
        id: string; mentee_id: string; track_id: string | null;
        mentee: { full_name: string | null } | { full_name: string | null }[] | null;
        track: { title: string } | { title: string }[] | null;
      };

      const rows = pairings as unknown as PairingRow[];

      const menteeRows: MenteeRow[] = [];
      for (const p of rows) {
        const menteeProfile = Array.isArray(p.mentee) ? p.mentee[0] : p.mentee;
        const trackInfo = Array.isArray(p.track) ? p.track[0] : p.track;

        let totalLessons = 0;
        let completedLessons = 0;
        if (p.track_id) {
          const { data: moduleData } = await supabase.from('modules').select('id').eq('track_id', p.track_id);
          const moduleIds = (moduleData ?? []).map((m: { id: string }) => m.id);
          if (moduleIds.length > 0) {
            const { data: lessonData } = await supabase.from('lessons').select('id').in('module_id', moduleIds);
            totalLessons = (lessonData ?? []).length;
            const lessonIds = (lessonData ?? []).map((l: { id: string }) => l.id);
            if (lessonIds.length > 0) {
              const { count } = await supabase
                .from('user_progress')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', p.mentee_id)
                .in('lesson_id', lessonIds)
                .not('completed_at', 'is', null);
              completedLessons = count ?? 0;
            }
          }
        }

        menteeRows.push({
          pairingId: p.id,
          menteeId: p.mentee_id,
          menteeName: menteeProfile?.full_name ?? 'Member',
          trackTitle: trackInfo?.title ?? null,
          totalLessons,
          completedLessons,
        });
      }

      setMentees(menteeRows);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
      {[0, 1].map(i => <div key={i} className="pf-skel" style={{ height: 80, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div className="pf-page">
      <div className="pf-head">
        <p className="pf-eyebrow">Discipleship</p>
        <h1 className="pf-title">My Mentees</h1>
        <p className="pf-sub">Track progress and reflections for those you&apos;re mentoring.</p>
      </div>

      {mentees.length === 0 && (
        <div className="pf-empty">
          <span className="pf-empty-icon">✦</span>
          You aren&apos;t mentoring anyone yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mentees.map(m => (
          <Link key={m.pairingId} href={`/discipleship/mentor/${m.menteeId}`} className="pf-card pf-card--link">
            <p className="pf-card-label">{m.menteeName}</p>
            {m.trackTitle && (
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>
                {m.trackTitle}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 12, color: 'var(--pf-text-soft)' }}>
              {m.completedLessons} of {m.totalLessons} lessons complete
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
