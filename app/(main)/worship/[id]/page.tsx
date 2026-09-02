'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

const KEYS = ['Ab', 'A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G'];

interface Plan {
  id: string;
  service_date: string;
  title: string | null;
  theme: string | null;
  youtube_playlist_url: string | null;
  notes: string | null;
  status: string;
}

interface PlanSong {
  id: string;
  position: number;
  key_for_service: string | null;
  song_notes: string | null;
  songs: { id: string; title: string; artist: string | null; default_key: string | null; youtube_url: string | null } | null;
}

interface TeamMember {
  id: string;
  role_in_plan: string | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface Song {
  id: string;
  title: string;
  artist: string | null;
  default_key: string | null;
}

export default function ServicePlanPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [songs, setSongs] = useState<PlanSong[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [allMembers, setAllMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPastor, setIsPastor] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [addingSong, setAddingSong] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [songNotes, setSongNotes] = useState('');

  const [addingTeam, setAddingTeam] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberRole, setMemberRole] = useState('');

  const [editingNotes, setEditingNotes] = useState(false);
  const [planNotes, setPlanNotes] = useState('');

  const [editingSongId, setEditingSongId] = useState('');
  const [editSongKey, setEditSongKey] = useState('');
  const [editSongNotes, setEditSongNotes] = useState('');

  const [publishingStatus, setPublishingStatus] = useState('');

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roles } = await supabase.rpc('get_my_roles');
    setIsPastor((roles ?? []).some((r: string) => r === 'pastor' || r === 'admin'));

    const [planRes, songsRes, teamRes, allSongsRes] = await Promise.allSettled([
      supabase.from('service_plans').select('id, service_date, title, theme, youtube_playlist_url, notes, status').eq('id', id).maybeSingle(),
      supabase.from('service_plan_songs').select('id, position, key_for_service, song_notes, songs(id, title, artist, default_key, youtube_url)').eq('plan_id', id).order('position'),
      supabase.from('service_plan_team').select('id, role_in_plan, profiles(id, full_name, avatar_url)').eq('plan_id', id),
      supabase.from('songs').select('id, title, artist, default_key').order('title'),
    ]);

    if (planRes.status === 'fulfilled' && planRes.value.data) {
      const p = planRes.value.data;
      setPlan(p);
      setPlanNotes(p.notes ?? '');
    }
    if (songsRes.status === 'fulfilled') {
      const raw = songsRes.value.data ?? [];
      setSongs(raw.map((r: Record<string, unknown>) => ({
        ...r,
        songs: Array.isArray(r.songs) ? (r.songs[0] ?? null) : r.songs,
      })) as PlanSong[]);
    }
    if (teamRes.status === 'fulfilled') {
      const raw = teamRes.value.data ?? [];
      setTeam(raw.map((r: Record<string, unknown>) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : r.profiles,
      })) as TeamMember[]);
    }
    if (allSongsRes.status === 'fulfilled') setAllSongs(allSongsRes.value.data ?? []);

    // Load Worship Team members for the "add to plan" dropdown
    const { data: worshipTeam } = await supabase.from('serving_teams').select('id').eq('name', 'Worship Team').maybeSingle();
    if (worshipTeam?.id) {
      const { data: wMembers } = await supabase
        .from('team_members')
        .select('profiles:member_id(id, full_name)')
        .eq('team_id', worshipTeam.id);
      const members = (wMembers ?? []).map((r: Record<string, unknown>) => {
        const p = Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : r.profiles;
        return p as { id: string; full_name: string | null } | null;
      }).filter(Boolean) as { id: string; full_name: string | null }[];
      if (members.length > 0) {
        setAllMembers(members);
        setLoading(false);
        return;
      }
    }
    // Fallback: all profiles if worship team is unpopulated
    const { data: allProfiles } = await supabase.from('profiles').select('id, full_name').order('full_name');
    setAllMembers(allProfiles ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const addSong = async () => {
    if (!selectedSongId) return;
    const supabase = createClient();
    const nextPos = songs.length + 1;
    await supabase.from('service_plan_songs').insert({
      plan_id: id, song_id: selectedSongId, position: nextPos,
      key_for_service: selectedKey || null, song_notes: songNotes.trim() || null,
    });
    setAddingSong(false); setSelectedSongId(''); setSelectedKey(''); setSongNotes('');
    load();
  };

  const removeSong = async (psId: string) => {
    const supabase = createClient();
    await supabase.from('service_plan_songs').delete().eq('id', psId);
    setSongs(prev => prev.filter(s => s.id !== psId));
  };

  const moveSong = async (psId: string, dir: 'up' | 'down') => {
    const idx = songs.findIndex(s => s.id === psId);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= songs.length) return;
    const supabase = createClient();
    const a = songs[idx], b = songs[swapIdx];
    await Promise.all([
      supabase.from('service_plan_songs').update({ position: b.position }).eq('id', a.id),
      supabase.from('service_plan_songs').update({ position: a.position }).eq('id', b.id),
    ]);
    const newSongs = [...songs];
    newSongs[idx] = { ...a, position: b.position };
    newSongs[swapIdx] = { ...b, position: a.position };
    setSongs(newSongs.sort((x, y) => x.position - y.position));
  };

  const startEditSong = (ps: PlanSong) => {
    setEditingSongId(ps.id);
    setEditSongKey(ps.key_for_service ?? '');
    setEditSongNotes(ps.song_notes ?? '');
  };

  const saveEditSong = async (psId: string) => {
    const supabase = createClient();
    await supabase.from('service_plan_songs').update({ key_for_service: editSongKey || null, song_notes: editSongNotes.trim() || null }).eq('id', psId);
    setSongs(prev => prev.map(s => s.id === psId ? { ...s, key_for_service: editSongKey || null, song_notes: editSongNotes.trim() || null } : s));
    setEditingSongId('');
  };

  const addTeamMember = async () => {
    if (!selectedMemberId) return;
    const supabase = createClient();
    await supabase.from('service_plan_team').insert({ plan_id: id, member_id: selectedMemberId, role_in_plan: memberRole.trim() || null });
    setAddingTeam(false); setSelectedMemberId(''); setMemberRole('');
    load();
  };

  const removeTeamMember = async (tmId: string) => {
    const supabase = createClient();
    await supabase.from('service_plan_team').delete().eq('id', tmId);
    setTeam(prev => prev.filter(t => t.id !== tmId));
  };

  const saveNotes = async () => {
    const supabase = createClient();
    await supabase.from('service_plans').update({ notes: planNotes.trim() || null }).eq('id', id);
    setPlan(prev => prev ? { ...prev, notes: planNotes.trim() || null } : prev);
    setEditingNotes(false);
  };

  const toggleStatus = async () => {
    if (!plan) return;
    const newStatus = plan.status === 'published' ? 'draft' : 'published';
    setPublishingStatus(newStatus);
    const supabase = createClient();
    await supabase.from('service_plans').update({ status: newStatus }).eq('id', id);
    setPlan(prev => prev ? { ...prev, status: newStatus } : prev);
    setPublishingStatus('');
  };

  const deletePlan = async () => {
    if (!confirm('Delete this service plan? This cannot be undone.')) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('service_plan_songs').delete().eq('plan_id', id);
    await supabase.from('service_plan_team').delete().eq('plan_id', id);
    await supabase.from('service_plans').delete().eq('id', id);
    router.push('/worship');
  };

  const shareWhatsApp = () => {
    if (!plan) return;
    const lines: string[] = [];
    lines.push(`*${plan.title ?? formatDate(plan.service_date)}*`);
    lines.push(formatDate(plan.service_date));
    if (plan.theme) lines.push(`_Theme: ${plan.theme}_`);
    lines.push('');
    if (songs.length > 0) {
      lines.push('*Songs:*');
      songs.forEach((ps, i) => {
        const s = ps.songs;
        if (!s) return;
        const key = ps.key_for_service ?? s.default_key;
        lines.push(`${i + 1}. ${s.title}${key ? ` (${key})` : ''}${s.artist ? ` — ${s.artist}` : ''}`);
      });
    }
    if (team.length > 0) {
      lines.push('');
      lines.push('*Team:*');
      team.forEach(t => {
        const name = t.profiles?.full_name ?? 'Unknown';
        lines.push(t.role_in_plan ? `• ${name} — ${t.role_in_plan}` : `• ${name}`);
      });
    }
    if (plan.notes) {
      lines.push('');
      lines.push(`*Notes:* ${plan.notes}`);
    }
    if (plan.youtube_playlist_url) {
      lines.push('');
      lines.push(`*Playlist:* ${plan.youtube_playlist_url}`);
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const inputStyle: React.CSSProperties = {
    background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '8px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  if (loading) {
    return (
      <div className="pf-page pf-page--wide">
        <div className="pf-skel" style={{ height: 30, width: 280, marginBottom: 20 }} />
        {[0, 1, 2].map((i) => <div key={i} className="pf-skel" style={{ height: 120, borderRadius: 6, marginBottom: 14 }} />)}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="pf-page">
        <div className="pf-empty">
          <span className="pf-empty-icon" aria-hidden="true">🎵</span>
          Plan not found.
        </div>
      </div>
    );
  }

  const playlistEmbedId = (() => {
    if (!plan.youtube_playlist_url) return null;
    const m = plan.youtube_playlist_url.match(/[?&]list=([^&]+)/);
    return m ? m[1] : null;
  })();

  return (
    <div className="pf-page pf-page--wide">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Link href="/worship" style={{ color: S.soft, fontSize: 12, textDecoration: 'none' }}>← Worship</Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: S.soft }}>{formatDate(plan.service_date)}</p>
              <h1 style={{ margin: '4px 0 0', fontSize: 28, fontFamily: S.font.display, color: S.textLight, fontWeight: 400 }}>{plan.title ?? 'Untitled Service'}</h1>
              {plan.theme && <p style={{ margin: '4px 0 0', fontSize: 14, color: S.gold, fontStyle: 'italic' }}>&ldquo;{plan.theme}&rdquo;</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                padding: '3px 10px', borderRadius: 2, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                background: plan.status === 'published' ? 'rgba(72,160,110,0.15)' : S.goldDim,
                border: `1px solid ${plan.status === 'published' ? 'rgba(72,160,110,0.3)' : S.goldBorder}`,
                color: plan.status === 'published' ? '#48a06e' : S.gold,
              }}>
                {plan.status}
              </span>
              <button onClick={shareWhatsApp} style={{ padding: '7px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {copied ? 'Copied!' : 'Share'}
              </button>
              {isPastor && (
                <>
                  <button onClick={toggleStatus} disabled={!!publishingStatus} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {publishingStatus ? '…' : plan.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={deletePlan} disabled={deleting} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 2, color: '#e05555', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: deleting ? 0.4 : 1 }}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>Worship Team</p>
            {isPastor && !addingTeam && (
              <button onClick={() => setAddingTeam(true)} style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '3px 10px' }}>+ Add</button>
            )}
          </div>

          {team.length === 0 && !addingTeam && (
            <p style={{ margin: 0, fontSize: 12, color: S.soft }}>No team members assigned yet.</p>
          )}

          {team.map(tm => (
            <div key={tm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${S.border}` }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: S.text }}>{tm.profiles?.full_name ?? 'Unknown'}</p>
                {tm.role_in_plan && <p style={{ margin: '1px 0 0', fontSize: 11, color: S.soft }}>{tm.role_in_plan}</p>}
              </div>
              {isPastor && (
                <button onClick={() => removeTeamMember(tm.id)} style={{ background: 'none', border: 'none', color: '#e05555', fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}>Remove</button>
              )}
            </div>
          ))}

          {addingTeam && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} style={inputStyle}>
                <option value="">Select member…</option>
                {allMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
              </select>
              <input value={memberRole} onChange={e => setMemberRole(e.target.value)} placeholder="Role (e.g. Keys, Vocals, Drums)" style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addTeamMember} style={{ padding: '7px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Add</button>
                <button onClick={() => setAddingTeam(false)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Songs Section */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>Song List</p>
            {isPastor && !addingSong && (
              <button onClick={() => setAddingSong(true)} style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '3px 10px' }}>+ Add Song</button>
            )}
          </div>

          {songs.length === 0 && !addingSong && (
            <p style={{ margin: 0, fontSize: 12, color: S.soft }}>No songs added yet.</p>
          )}

          {songs.map((ps, idx) => {
            const s = ps.songs;
            if (!s) return null;
            const key = ps.key_for_service ?? s.default_key;
            return (
              <div key={ps.id} style={{ borderBottom: `1px solid ${S.border}`, padding: '10px 0' }}>
                {editingSongId === ps.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: S.textLight, fontWeight: 500 }}>{s.title}</p>
                    <div>
                      <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.soft }}>Key for Service</p>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {KEYS.map(k => (
                          <button key={k} onClick={() => setEditSongKey(editSongKey === k ? '' : k)}
                            style={{ padding: '3px 8px', border: `1px solid ${editSongKey === k ? S.goldBorder : S.border}`, borderRadius: 2, background: editSongKey === k ? S.goldDim : 'transparent', color: editSongKey === k ? S.gold : S.soft, fontSize: 11, cursor: 'pointer' }}>
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input value={editSongNotes} onChange={e => setEditSongNotes(e.target.value)} placeholder="Notes (optional)" style={inputStyle} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => saveEditSong(ps.id)} style={{ padding: '6px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingSongId('')} style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => moveSong(ps.id, 'up')} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? S.border : S.soft, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12, lineHeight: 1, padding: '1px 4px' }}>▲</button>
                      <button onClick={() => moveSong(ps.id, 'down')} disabled={idx === songs.length - 1} style={{ background: 'none', border: 'none', color: idx === songs.length - 1 ? S.border : S.soft, cursor: idx === songs.length - 1 ? 'default' : 'pointer', fontSize: 12, lineHeight: 1, padding: '1px 4px' }}>▼</button>
                    </div>
                    <span style={{ fontSize: 11, color: S.soft, minWidth: 18, textAlign: 'right' }}>{idx + 1}.</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 14, color: S.textLight, fontWeight: 500 }}>{s.title}</p>
                        {key && <span style={{ padding: '1px 6px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 10, color: S.gold }}>{key}</span>}
                        {s.youtube_url && <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, textDecoration: 'none', color: S.soft }}>▶</a>}
                      </div>
                      {s.artist && <p style={{ margin: '1px 0 0', fontSize: 11, color: S.soft }}>{s.artist}</p>}
                      {ps.song_notes && <p style={{ margin: '3px 0 0', fontSize: 11, color: S.text, fontStyle: 'italic' }}>{ps.song_notes}</p>}
                    </div>
                    {isPastor && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => startEditSong(ps)} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 11, cursor: 'pointer', padding: '2px 4px' }}>Edit</button>
                        <button onClick={() => removeSong(ps.id)} style={{ background: 'none', border: 'none', color: '#e05555', fontSize: 11, cursor: 'pointer', padding: '2px 4px' }}>✕</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {addingSong && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select value={selectedSongId} onChange={e => setSelectedSongId(e.target.value)} style={inputStyle}>
                <option value="">Select song…</option>
                {allSongs.map(s => <option key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ''}{s.default_key ? ` (${s.default_key})` : ''}</option>)}
              </select>
              <div>
                <p style={{ margin: '0 0 5px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.soft }}>Key for Service</p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {KEYS.map(k => (
                    <button key={k} onClick={() => setSelectedKey(selectedKey === k ? '' : k)}
                      style={{ padding: '3px 8px', border: `1px solid ${selectedKey === k ? S.goldBorder : S.border}`, borderRadius: 2, background: selectedKey === k ? S.goldDim : 'transparent', color: selectedKey === k ? S.gold : S.soft, fontSize: 11, cursor: 'pointer' }}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <input value={songNotes} onChange={e => setSongNotes(e.target.value)} placeholder="Notes for this song (optional)" style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addSong} style={{ padding: '7px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Add to Plan</button>
                <button onClick={() => setAddingSong(false)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>Notes</p>
            {isPastor && !editingNotes && (
              <button onClick={() => setEditingNotes(true)} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 11, cursor: 'pointer', padding: 0 }}>Edit</button>
            )}
          </div>
          {editingNotes ? (
            <div>
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, marginBottom: 8 }} placeholder="Notes for this service…" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveNotes} style={{ padding: '7px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingNotes(false)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: plan.notes ? S.text : S.soft, lineHeight: 1.6, fontStyle: plan.notes ? 'normal' : 'italic' }}>
              {plan.notes ?? 'No notes added.'}
            </p>
          )}
        </div>

        {/* YouTube Playlist Embed */}
        {playlistEmbedId && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            <p style={{ margin: 0, padding: '12px 16px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, borderBottom: `1px solid ${S.border}` }}>Playlist</p>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/videoseries?list=${playlistEmbedId}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                title="Worship Playlist"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
