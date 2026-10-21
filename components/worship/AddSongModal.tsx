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
    <div className="pf-modal-overlay" onClick={onClose}>
      <div
        className="pf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-song-title"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="pf-modal-title" id="add-song-title" style={{ fontSize: 18 }}>Add Song to Library</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: S.soft, fontSize: 22, cursor: 'pointer', padding: 8, minWidth: 40, minHeight: 40 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="pf-field" style={{ margin: 0 }}>
            <label className="pf-label" htmlFor="song-title">Title *</label>
            <input id="song-title" className="pf-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title…" />
          </div>

          <div className="pf-field" style={{ margin: 0 }}>
            <label className="pf-label" htmlFor="song-artist">Artist</label>
            <input id="song-artist" className="pf-input" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist or band…" />
          </div>

          <div>
            <p className="pf-label">Default Key</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => setDefaultKey(defaultKey === k ? '' : k)}
                  style={{
                    padding: '8px 12px', minWidth: 40, minHeight: 40,
                    border: `1px solid ${defaultKey === k ? S.goldBorder : S.border}`,
                    borderRadius: 2, background: defaultKey === k ? S.goldDim : 'transparent',
                    color: defaultKey === k ? S.gold : S.soft,
                    fontSize: 12, cursor: 'pointer', fontFamily: S.font.body, fontWeight: defaultKey === k ? 600 : 400,
                    textAlign: 'center',
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-field" style={{ margin: 0 }}>
            <label className="pf-label" htmlFor="song-youtube">YouTube URL</label>
            <input id="song-youtube" className="pf-input" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
          </div>

          <div className="pf-field" style={{ margin: 0 }}>
            <label className="pf-label" htmlFor="song-tags">Tags <span style={{ color: S.border, fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span></label>
            <input id="song-tags" className="pf-input" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="communion, upbeat, reflective, opener…" />
          </div>

          {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} className="pf-btn pf-btn--quiet" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="pf-btn" style={{ flex: 2 }}>
              {saving ? 'Saving…' : 'Save Song'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
