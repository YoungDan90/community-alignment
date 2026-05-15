'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ActiveVerse {
  id: string;
  reference: string;
  sermon_series: string | null;
  week_start: string;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "Georgia, 'Times New Roman', serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0b1118', dark: '#070c12', border: '#162030',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
  padding: '10px 14px', color: S.text, fontSize: 14, fontFamily: S.font.display,
  fontStyle: 'italic', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
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

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Sermon Series</label>
          <input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="e.g. Rooted — A Series on the Word" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Verse Reference</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onBlur={lookupVerse}
              placeholder="e.g. John 15:5"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={lookupVerse}
              disabled={fetching || !reference.trim()}
              style={{
                padding: '10px 16px', background: S.goldDim, border: `1px solid ${S.goldBorder}`,
                borderRadius: 2, color: S.gold, fontSize: 11, cursor: 'pointer',
                fontFamily: S.font.body, whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {fetching ? '…' : 'Look up'}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>NKJV Text</label>
          <textarea value={nkjvText} onChange={(e) => setNkjvText(e.target.value)} rows={3} placeholder="Verse text (NKJV)…" style={{ ...inputStyle, resize: 'none' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>NLT Text</label>
          <textarea value={nltText} onChange={(e) => setNltText(e.target.value)} rows={3} placeholder="Verse text (NLT)…" style={{ ...inputStyle, resize: 'none' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Selah Playlist URL <span style={{ color: S.muted }}>(optional)</span></label>
          <input value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/…" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Week Start</label>
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)}
            style={{ ...inputStyle, fontStyle: 'normal', colorScheme: 'dark' }} />
        </div>
      </div>

      {error && <p style={{ marginTop: 12, fontSize: 12, color: '#e07070' }}>{error}</p>}

      <button
        onClick={handlePublish}
        disabled={saving}
        style={{
          marginTop: 20, padding: '11px 28px',
          background: saving ? 'rgba(198,167,94,0.2)' : S.gold,
          border: 'none', borderRadius: 2,
          color: saving ? S.muted : S.dark,
          fontSize: 13, fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer',
          fontFamily: S.font.body, letterSpacing: '0.06em', transition: 'all 0.2s',
        }}
      >
        {saving ? 'Publishing…' : 'Publish Verse ✦'}
      </button>
    </div>
  );
}
