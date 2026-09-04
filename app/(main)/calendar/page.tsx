'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  recurrence: 'none' | 'weekly';
  recurrence_until: string | null;
}

interface Occurrence {
  key: string;
  title: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date | null;
}

// How far ahead to expand weekly-recurring events. Bounded rather than
// infinite so a never-ending series doesn't produce unbounded rows.
const RECURRENCE_WINDOW_WEEKS = 12;

function expandOccurrences(events: EventRow[]): Occurrence[] {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + RECURRENCE_WINDOW_WEEKS * 7 * 24 * 60 * 60 * 1000);
  const occurrences: Occurrence[] = [];

  for (const ev of events) {
    const start = new Date(ev.start_at);
    const end = ev.end_at ? new Date(ev.end_at) : null;
    const durationMs = end ? end.getTime() - start.getTime() : 0;

    if (ev.recurrence === 'none') {
      if (start >= now || (end && end >= now)) {
        occurrences.push({ key: ev.id, title: ev.title, description: ev.description, location: ev.location, start, end });
      }
      continue;
    }

    // Weekly: step forward from the original start_at until the window
    // end or recurrence_until, whichever is sooner.
    const seriesEnd = ev.recurrence_until ? new Date(ev.recurrence_until) : windowEnd;
    const cutoff = seriesEnd < windowEnd ? seriesEnd : windowEnd;
    const cursor = new Date(start);
    // Fast-forward to the first occurrence at or after now.
    while (cursor < now) cursor.setDate(cursor.getDate() + 7);
    let i = 0;
    while (cursor <= cutoff && i < 52) {
      occurrences.push({
        key: `${ev.id}-${cursor.toISOString()}`,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        start: new Date(cursor),
        end: durationMs ? new Date(cursor.getTime() + durationMs) : null,
      });
      cursor.setDate(cursor.getDate() + 7);
      i += 1;
    }
  }

  return occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function groupByDay(occurrences: Occurrence[]): { label: string; items: Occurrence[] }[] {
  const groups: { label: string; items: Occurrence[] }[] = [];
  for (const occ of occurrences) {
    const label = occ.start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(occ);
    else groups.push({ label, items: [occ] });
  }
  return groups;
}

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('events')
        .select('id, title, description, location, start_at, end_at, recurrence, recurrence_until')
        .order('start_at', { ascending: true });

      setOccurrences(expandOccurrences((data as EventRow[]) ?? []));
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
        {[0, 1].map((i) => <div key={i} className="pf-skel" style={{ height: 70, borderRadius: 6, marginBottom: 10 }} />)}
      </div>
    );
  }

  const groups = groupByDay(occurrences);

  return (
    <div className="pf-page">
      <div className="pf-head">
        <p className="pf-eyebrow">Calendar</p>
        <h1 className="pf-title">What&apos;s Coming Up</h1>
        <p className="pf-sub">Church events over the next {RECURRENCE_WINDOW_WEEKS} weeks.</p>
      </div>

      {groups.length === 0 && (
        <div className="pf-empty">
          <span className="pf-empty-icon">✦</span>
          Nothing on the calendar yet.
        </div>
      )}

      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 18 }}>
          <p className="pf-card-label" style={{ margin: '0 0 8px' }}>{g.label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map((occ) => (
              <div key={occ.key} className="pf-card">
                <p style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--pf-text-bright)', fontFamily: 'var(--pf-serif)' }}>{occ.title}</p>
                <p style={{ margin: occ.description ? '0 0 8px' : 0, fontSize: 12, color: 'var(--pf-text-soft)' }}>
                  {occ.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  {occ.end && ` – ${occ.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                  {occ.location && ` · ${occ.location}`}
                </p>
                {occ.description && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-text-soft)', lineHeight: 1.6 }}>{occ.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
