'use client';

import { useState, useEffect } from 'react';
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

export default function ManageEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly'>('none');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('events')
      .select('id, title, description, location, start_at, end_at, recurrence, recurrence_until')
      .order('start_at', { ascending: true });
    setEvents((data as EventRow[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      await loadEvents(supabase);
      setLoading(false);
    })();
  }, []);

  const resetForm = () => {
    setTitle(''); setDescription(''); setLocation('');
    setStartAt(''); setEndAt(''); setRecurrence('none'); setRecurrenceUntil('');
  };

  const handleCreate = async () => {
    if (!title.trim() || !startAt) { setError('Title and start date/time are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user!.id).maybeSingle();

      const { error: insertError } = await supabase.from('events').insert({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
        recurrence,
        recurrence_until: recurrence === 'weekly' && recurrenceUntil ? recurrenceUntil : null,
        church_id: profile?.church_id ?? null,
        created_by: user?.id ?? null,
      });
      if (insertError) throw insertError;

      resetForm();
      await loadEvents(supabase);
    } catch {
      setError('Failed to create event. Check Supabase permissions.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('events').delete().eq('id', id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) return <p style={{ fontSize: 13, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>Loading…</p>;

  return (
    <div>
      <div className="pf-card" style={{ marginBottom: 20 }}>
        <p className="pf-card-label">New Event</p>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="pf-label" htmlFor="event-title">Title</label>
            <input id="event-title" className="pf-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Baptism Service" />
          </div>
          <div>
            <label className="pf-label" htmlFor="event-description">Description (optional)</label>
            <textarea id="event-description" className="pf-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="pf-label" htmlFor="event-location">Location (optional)</label>
            <input id="event-location" className="pf-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Hall" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="pf-label" htmlFor="event-start">Starts</label>
              <input id="event-start" className="pf-input" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="pf-label" htmlFor="event-end">Ends (optional)</label>
              <input id="event-end" className="pf-input" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <div>
            <label className="pf-label" htmlFor="event-recurrence">Repeats</label>
            <select id="event-recurrence" className="pf-input" value={recurrence} onChange={(e) => setRecurrence(e.target.value as 'none' | 'weekly')}>
              <option value="none">Doesn&apos;t repeat</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          {recurrence === 'weekly' && (
            <div>
              <label className="pf-label" htmlFor="event-until">Repeat until (optional)</label>
              <input id="event-until" className="pf-input" type="date" value={recurrenceUntil} onChange={(e) => setRecurrenceUntil(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          )}
        </div>
        {error && <p role="alert" style={{ marginTop: 12, fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}
        <button onClick={handleCreate} disabled={saving} className="pf-btn" style={{ marginTop: 16 }}>
          {saving ? 'Creating…' : 'Create Event'}
        </button>
      </div>

      <p className="pf-card-label" style={{ margin: '0 0 10px' }}>Upcoming & Recurring</p>
      {events.length === 0 && <p style={{ fontSize: 13, color: 'var(--pf-text-soft)', fontStyle: 'italic' }}>No events yet.</p>}
      {events.map((ev) => (
        <div key={ev.id} className="pf-card" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--pf-text-bright)', fontFamily: 'var(--pf-serif)' }}>{ev.title}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--pf-text-soft)' }}>
              {new Date(ev.start_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {ev.recurrence === 'weekly' && ' · weekly'}
              {ev.location && ` · ${ev.location}`}
            </p>
          </div>
          <button onClick={() => handleDelete(ev.id)} className="pf-btn pf-btn--ghost pf-btn--sm" style={{ flexShrink: 0 }}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
