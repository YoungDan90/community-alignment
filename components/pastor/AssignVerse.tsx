'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import BibleSearch, { type BibleVerse } from '@/components/ui/BibleSearch';

interface ActiveVerse {
  id: string;
  reference: string;
  sermon_series: string | null;
  week_start: string;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};


export default function AssignVerse() {
  const [active, setActive] = useState<ActiveVerse | null>(null);
  const [series, setSeries]         = useState('');
  const [reference, setReference]   = useState('');
  const [nkjvText, setNkjvText]     = useState('');
  const [nltText, setNltText]       = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [weekStart, setWeekStart]   = useState('');
  const [fetching, setFetching]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('verses')
        .select('id, reference, sermon_series, week_start')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActive(data ?? null);
    })();

    // Default week_start to next Monday
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    setWeekStart(nextMonday.toISOString().split('T')[0]);
  }, []);

  const handleVerseSelect = async (verse: BibleVerse) => {
    setReference(verse.reference);
    setNkjvText(verse.text);
    setNltText(verse.text);
    setShowSearch(false);
    // Attempt a second lookup for the other translation (best-effort)
    try {
      const res = await fetch(`/api/bible/verse?reference=${encodeURIComponent(verse.reference)}`);
      const data = await res.json();
      if (data.verse?.text) {
        setNkjvText(data.verse.text);
        setNltText(data.verse.text);
      }
    } catch { /* keep the text from search */ }
  };

  const lookupVerse = async () => {
    if (!reference.trim()) return;
    setFetching(true);
    setError('');
    try {
      const res = await fetch(`/api/bible/verse?reference=${encodeURIComponent(reference.trim())}`);
      const { verse } = await res.json();
      if (verse?.text) {
        setNkjvText(verse.text);
        setNltText(verse.text); // same source — pastor can edit NLT manually
      }
    } catch {
      setError('Could not fetch verse text. Enter it manually.');
    }
    setFetching(false);
  };

  const handlePublish = async () => {
    if (!reference.trim() || !series.trim() || !weekStart) {
      setError('Sermon series, verse reference, and week start are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from('profiles').select('church_id').eq('id', user!.id).maybeSingle();
      const church_id = profile?.church_id ?? null;

      // Deactivate current active verse
      await supabase.from('verses').update({ is_active: false }).eq('is_active', true);

      // Insert new verse
      const { data, error: insertError } = await supabase.from('verses').insert({
        reference: reference.trim(),
        nkjv_text: nkjvText.trim() || null,
        nlt_text: nltText.trim() || null,
        sermon_series: series.trim(),
        playlist_url: playlistUrl.trim() || null,
        week_start: weekStart,
        is_active: true,
        church_id,
        assigned_by: user?.id ?? null,
      }).select('id, reference, sermon_series, week_start').single();

      if (insertError) throw insertError;

      setActive(data);
      setSeries(''); setReference(''); setNkjvText(''); setNltText('');
      setPlaylistUrl(''); setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError('Failed to publish verse. Check Supabase permissions.');
    }
    setSaving(false);
  };

  return (
    <div>
      {/* Current active verse */}
      {active && (
        <div style={{ background: S.dark, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: '14px 18px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />
          <p style={{ margin: '0 0 2px', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: S.gold }}>Currently Active</p>
          <p style={{ margin: '0 0 2px', fontSize: 16, fontFamily: S.font.display, color: S.textLight }}>{active.reference}</p>
          <p style={{ margin: 0, fontSize: 12, color: S.soft, fontStyle: 'italic' }}>
            {active.sermon_series} &middot; Week of {new Date(active.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      )}

      {success && (
        <div style={{ background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: S.gold, fontStyle: 'italic' }}>
          ✦ Verse published and set as active.
        </div>
      )}

      {/* Bible verse search */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            background: showSearch ? S.goldDim : 'transparent',
            border: `1px solid ${showSearch ? S.goldBorder : S.border}`,
            borderRadius: 2, padding: '8px 16px',
            color: showSearch ? S.gold : S.soft,
            fontSize: 11, cursor: 'pointer', fontFamily: S.font.body,
            letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
          }}
        >
          {showSearch ? '↑ Hide search' : '◈ Search for a verse'}
        </button>
        {showSearch && (
          <div style={{ marginTop: 12 }}>
            <BibleSearch
              onSelect={handleVerseSelect}
              placeholder="Search by reference or keyword — e.g. John 15:5"
            />
            <p style={{ margin: '8px 0 0', fontSize: 11, color: S.soft, fontStyle: 'italic' }}>
              Text pre-fills from KJV — update NKJV/NLT fields below as needed.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label className="pf-label" htmlFor="verse-series">Sermon Series</label>
          <input id="verse-series" className="pf-input" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="e.g. Rooted — A Series on the Word" style={{ fontFamily: 'var(--pf-serif)', fontStyle: 'italic' }} />
        </div>

        <div>
          <label className="pf-label" htmlFor="verse-reference">Verse Reference</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="verse-reference"
              className="pf-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onBlur={lookupVerse}
              placeholder="e.g. John 15:5"
              style={{ flex: 1, fontFamily: 'var(--pf-serif)', fontStyle: 'italic' }}
            />
            <button
              onClick={lookupVerse}
              disabled={fetching || !reference.trim()}
              className="pf-btn pf-btn--ghost pf-btn--sm"
              style={{ flexShrink: 0, whiteSpace: 'nowrap', minHeight: 44 }}
            >
              {fetching ? '…' : 'Look up'}
            </button>
          </div>
        </div>

        <div>
          <label className="pf-label" htmlFor="verse-nkjv">NKJV Text</label>
          <textarea id="verse-nkjv" className="pf-input" value={nkjvText} onChange={(e) => setNkjvText(e.target.value)} rows={3} placeholder="Verse text (NKJV)…" style={{ fontFamily: 'var(--pf-serif)', fontStyle: 'italic', resize: 'none' }} />
        </div>

        <div>
          <label className="pf-label" htmlFor="verse-nlt">NLT Text</label>
          <textarea id="verse-nlt" className="pf-input" value={nltText} onChange={(e) => setNltText(e.target.value)} rows={3} placeholder="Verse text (NLT)…" style={{ fontFamily: 'var(--pf-serif)', fontStyle: 'italic', resize: 'none' }} />
        </div>

        <div>
          <label className="pf-label" htmlFor="verse-playlist">Selah Playlist URL <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <input id="verse-playlist" className="pf-input" value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/…" />
        </div>

        <div>
          <label className="pf-label" htmlFor="verse-week">Week Start</label>
          <input id="verse-week" className="pf-input" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      {error && <p role="alert" style={{ marginTop: 12, fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

      <button onClick={handlePublish} disabled={saving} className="pf-btn" style={{ marginTop: 20 }}>
        {saving ? 'Publishing…' : 'Publish Verse ✦'}
      </button>
    </div>
  );
}
