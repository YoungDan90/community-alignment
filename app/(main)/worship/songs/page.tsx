'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import AddSongModal from '@/components/worship/AddSongModal';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

const KEYS = ['All', 'Ab', 'A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G'];

interface Song {
  id: string;
  title: string;
  artist: string | null;
  default_key: string | null;
  youtube_url: string | null;
  tags: string[] | null;
  created_by: string;
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [keyFilter, setKeyFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPastor, setIsPastor] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editData, setEditData] = useState<Partial<Song>>({});

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    setIsPastor(['pastor', 'admin'].includes(profile?.role ?? ''));
    const { data } = await supabase.from('songs').select('*').order('title');
    setSongs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = songs.filter(s => {
    const matchSearch = search === '' || s.title.toLowerCase().includes(search.toLowerCase()) || (s.artist ?? '').toLowerCase().includes(search.toLowerCase());
    const matchKey = keyFilter === 'All' || s.default_key === keyFilter;
    return matchSearch && matchKey;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this song?')) return;
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from('songs').delete().eq('id', id);
    setSongs(prev => prev.filter(s => s.id !== id));
    setDeletingId('');
  };

  const startEdit = (song: Song) => {
    setEditingId(song.id);
    setEditData({ title: song.title, artist: song.artist ?? '', default_key: song.default_key ?? '', youtube_url: song.youtube_url ?? '', tags: song.tags ?? [] });
  };

  const saveEdit = async (id: string) => {
    const supabase = createClient();
    const updates: Record<string, unknown> = {
      title: (editData.title as string).trim(),
      artist: (editData.artist as string).trim() || null,
      default_key: (editData.default_key as string) || null,
      youtube_url: (editData.youtube_url as string).trim() || null,
    };
    await supabase.from('songs').update(updates).eq('id', id);
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...updates } as Song : s));
    setEditingId('');
  };

  const inputStyle: React.CSSProperties = {
    background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '5px 8px', color: S.text, fontSize: 12, fontFamily: S.font.body,
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: S.dark, padding: '20px 0 80px', fontFamily: S.font.body }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Link href="/worship" style={{ color: S.soft, fontSize: 12, textDecoration: 'none' }}>← Worship</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold }}>Song Library</p>
            <h1 style={{ margin: '4px 0 0', fontSize: 28, fontFamily: S.font.display, color: S.textLight, fontWeight: 400 }}>All Songs</h1>
          </div>
          {isPastor && (
            <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
              + Add Song
            </button>
          )}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search songs or artists…"
          style={{ ...inputStyle, width: '100%', padding: '10px 14px', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {KEYS.map(k => (
            <button
              key={k}
              onClick={() => setKeyFilter(k)}
              style={{
                padding: '4px 10px', border: `1px solid ${keyFilter === k ? S.goldBorder : S.border}`,
                borderRadius: 2, background: keyFilter === k ? S.goldDim : 'transparent',
                color: keyFilter === k ? S.gold : S.soft, fontSize: 11, cursor: 'pointer',
              }}
            >
              {k}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: S.soft, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: S.soft, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No songs found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(song => (
              <div key={song.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '14px 16px' }}>
                {editingId === song.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={editData.title as string} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="Title" />
                    <input value={editData.artist as string} onChange={e => setEditData(p => ({ ...p, artist: e.target.value }))} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="Artist" />
                    <input value={editData.youtube_url as string} onChange={e => setEditData(p => ({ ...p, youtube_url: e.target.value }))} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="YouTube URL" />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {KEYS.filter(k => k !== 'All').map(k => (
                        <button key={k} onClick={() => setEditData(p => ({ ...p, default_key: (p.default_key as string) === k ? '' : k }))}
                          style={{ padding: '3px 8px', border: `1px solid ${(editData.default_key as string) === k ? S.goldBorder : S.border}`, borderRadius: 2, background: (editData.default_key as string) === k ? S.goldDim : 'transparent', color: (editData.default_key as string) === k ? S.gold : S.soft, fontSize: 11, cursor: 'pointer' }}>
                          {k}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => saveEdit(song.id)} style={{ padding: '6px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingId('')} style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                        <p style={{ margin: 0, fontSize: 15, color: S.textLight, fontWeight: 500 }}>{song.title}</p>
                        {song.default_key && (
                          <span style={{ padding: '1px 7px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 10, color: S.gold, letterSpacing: '0.05em' }}>{song.default_key}</span>
                        )}
                      </div>
                      {song.artist && <p style={{ margin: '0 0 6px', fontSize: 12, color: S.soft }}>{song.artist}</p>}
                      {song.tags && song.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                          {song.tags.map((t, i) => (
                            <span key={i} style={{ padding: '1px 6px', background: 'rgba(30,58,82,0.5)', border: `1px solid ${S.border}`, borderRadius: 2, fontSize: 10, color: S.soft }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {song.youtube_url && (
                        <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 18, textDecoration: 'none' }} title="Watch on YouTube">▶</a>
                      )}
                      {isPastor && (
                        <>
                          <button onClick={() => startEdit(song)} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}>Edit</button>
                          <button onClick={() => handleDelete(song.id)} disabled={deletingId === song.id} style={{ background: 'none', border: 'none', color: '#e05555', fontSize: 11, cursor: 'pointer', padding: '2px 6px', opacity: deletingId === song.id ? 0.4 : 1 }}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddSongModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}
