'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

const KEYS = ['Ab', 'A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G'];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function AddSongModal({ onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [defaultKey, setDefaultKey] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '9px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
    boxSizing: 'border-box', outline: 'none',
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setSaving(false); return; }
    const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).maybeSingle();

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const { error: dbErr } = await supabase.from('songs').insert({
      church_id: profile?.church_id,
      title: title.trim(),
      artist: artist.trim() || null,
      default_key: defaultKey || null,
      youtube_url: youtubeUrl.trim() || null,
      tags: tags.length ? tags : null,
      created_by: user.id,
    });

    if (dbErr) { setError('Failed to save song.'); setSaving(false); return; }
    onSaved();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 4, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>Add Song to Library</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Title *</p>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title…" style={inputStyle} />
          </div>

          <div>
            <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Artist</p>
            <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist or band…" style={inputStyle} />
          </div>

          <div>
            <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Default Key</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => setDefaultKey(defaultKey === k ? '' : k)}
                  style={{
                    padding: '5px 12px', border: `1px solid ${defaultKey === k ? S.goldBorder : S.border}`,
                    borderRadius: 2, background: defaultKey === k ? S.goldDim : 'transparent',
                    color: defaultKey === k ? S.gold : S.soft,
                    fontSize: 12, cursor: 'pointer', fontFamily: S.font.body, fontWeight: defaultKey === k ? 600 : 400,
                    minWidth: 36, textAlign: 'center',
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>YouTube URL</p>
            <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" style={inputStyle} />
          </div>

          <div>
            <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Tags <span style={{ color: S.border, fontWeight: 300 }}>(comma-separated)</span></p>
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="communion, upbeat, reflective, opener…" style={inputStyle} />
          </div>

          {error && <p style={{ margin: 0, fontSize: 12, color: '#e05555' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: '10px 18px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', fontFamily: S.font.body, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Song'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
