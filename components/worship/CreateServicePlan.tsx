'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

interface Props {
  onClose: () => void;
  onCreated: (id: string) => void;
}

export default function CreateServicePlan({ onClose, onCreated }: Props) {
  const [serviceDate, setServiceDate] = useState('');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceDate) {
      const d = new Date(serviceDate);
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      setTitle(`Sunday Service — ${dateStr}`);
    }
  }, [serviceDate]);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '9px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
    boxSizing: 'border-box', outline: 'none',
  };

  const handleCreate = async () => {
    if (!serviceDate) { setError('Service date is required.'); return; }
    setCreating(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setCreating(false); return; }
    const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).maybeSingle();

    const { data, error: dbErr } = await supabase.from('service_plans').insert({
      church_id: profile?.church_id,
      service_date: serviceDate,
      title: title.trim() || null,
      theme: theme.trim() || null,
      youtube_playlist_url: playlistUrl.trim() || null,
      notes: notes.trim() || null,
      created_by: user.id,
    }).select('id').single();

    if (dbErr || !data) { setError('Failed to create service plan.'); setCreating(false); return; }
    onCreated(data.id);
  };

  return (
    <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>New Service Plan</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Service Date *</p>
          <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
        </div>

        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sunday Service — 15 June 2025" style={inputStyle} />
        </div>

        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Theme</p>
          <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="e.g. Faith over Fear" style={inputStyle} />
        </div>

        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>YouTube Playlist URL</p>
          <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://youtube.com/playlist?list=…" style={inputStyle} />
        </div>

        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Notes</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for this service…" rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
        </div>

        {error && <p style={{ margin: 0, fontSize: 12, color: '#e05555' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 18px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
          <button onClick={handleCreate} disabled={creating} style={{ padding: '10px 24px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: creating ? 'wait' : 'pointer', fontFamily: S.font.body, opacity: creating ? 0.6 : 1 }}>
            {creating ? 'Creating…' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
