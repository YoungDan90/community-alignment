'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  member_status: string | null;
  phone: string | null;
  birthday: string | null;
  join_date: string | null;
  preferred_translation: string | null;
  created_at: string;
}

interface Stats {
  wtwCompletions: number;
  selahSessions: number;
  prayerRequests: number;
  testimonies: number;
  lastActive: string | null;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const ROLE_LABELS: Record<string, string> = {
  member: 'Member', prophetic_team: 'Prophetic Team', pastor: 'Pastor', admin: 'Senior Leader',
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [stats, setStats] = useState<Stats>({ wtwCompletions: 0, selahSessions: 0, prayerRequests: 0, testimonies: 0, lastActive: null });

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [translation, setTranslation] = useState<'nkjv' | 'nlt'>('nkjv');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setEmail(user.email ?? '');

      const [profileRes, wtwRes, selahRes, prayerRes, testimonyRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('meditations').select('id, completed_at').eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('selah_sessions').select('id, created_at').eq('user_id', user.id),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const p = profileRes.value.data as Profile;
        setProfile(p);
        setFullName(p.full_name ?? '');
        setPhone(p.phone ?? '');
        setBirthday(p.birthday ?? '');
        setTranslation((p.preferred_translation as 'nkjv' | 'nlt') ?? 'nkjv');
      }

      const wtwData = wtwRes.status === 'fulfilled' ? wtwRes.value.data ?? [] : [];
      const selahData = selahRes.status === 'fulfilled' ? selahRes.value.data ?? [] : [];

      const allDates = [
        ...wtwData.map((r: { completed_at?: string }) => r.completed_at),
        ...selahData.map((r: { created_at: string }) => r.created_at),
      ].filter(Boolean).sort().reverse();

      setStats({
        wtwCompletions: wtwData.length,
        selahSessions: selahData.length,
        prayerRequests: prayerRes.status === 'fulfilled' ? prayerRes.value.count ?? 0 : 0,
        testimonies: testimonyRes.status === 'fulfilled' ? testimonyRes.value.count ?? 0 : 0,
        lastActive: allDates[0] ?? null,
      });

      setLoading(false);
    })();
  }, [router]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        birthday: birthday || null,
        preferred_translation: translation,
      }).eq('id', profile.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, full_name: fullName.trim() || null, phone: phone.trim() || null, birthday: birthday || null, preferred_translation: translation } : prev);
      showToast('Profile saved.');
    } catch {
      showToast('Failed to save.');
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-skel" style={{ height: 26, width: 200, marginBottom: 20 }} />
        {[0, 1, 2].map((i) => <div key={i} className="pf-skel" style={{ height: 130, borderRadius: 6, marginBottom: 14 }} />)}
      </div>
    );
  }

  const initials = fullName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="pf-page">
      {/* Header */}
      <div className="pf-head">
        <p className="pf-eyebrow">My Profile</p>
        <h1 className="pf-title">{profile?.full_name ?? 'Community Member'}</h1>
        <p className="pf-sub">
          {ROLE_LABELS[profile?.role ?? 'member']} · {profile?.member_status ?? 'attendee'}
        </p>
      </div>

      {toast && <div className="pf-banner" role="status">✦ {toast}</div>}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: S.goldDim, border: `1px solid ${S.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: S.gold, fontFamily: S.font.display, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{fullName || 'Community Member'}</p>
          <p style={{ margin: 0, fontSize: 12, color: S.soft }}>{email}</p>
        </div>
      </div>

      {/* Personal Details */}
      <div className="pf-card pf-card--accent" style={{ marginBottom: 16 }}>
        <p className="pf-card-label" style={{ marginBottom: 16 }}>Personal Details</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="pf-label" htmlFor="profile-name">Full Name</label>
            <input id="profile-name" className="pf-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="pf-label" htmlFor="profile-phone">Phone</label>
            <input id="profile-phone" className="pf-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44…" />
          </div>
          <div>
            <label className="pf-label" htmlFor="profile-birthday">Birthday</label>
            <input id="profile-birthday" className="pf-input" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} style={{ colorScheme: 'dark' }} />
          </div>
        </div>
      </div>

      {/* Translation Preference */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '20px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />
        <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted }}>Preferred Translation</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['nkjv', 'nlt'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTranslation(t)}
              style={{
                flex: 1, padding: '12px',
                background: translation === t ? S.goldDim : 'transparent',
                border: `1px solid ${translation === t ? S.goldBorder : S.border}`,
                borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <p style={{ margin: '0 0 2px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: translation === t ? S.gold : S.soft }}>{t.toUpperCase()}</p>
              <p style={{ margin: 0, fontSize: 11, color: S.muted, fontStyle: 'italic' }}>
                {t === 'nkjv' ? 'Traditional, precise' : 'Natural, contemporary'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="pf-btn"
        style={{ display: 'flex', width: '100%', marginBottom: 20 }}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      {/* Discipleship Stats */}
      <div className="pf-card pf-card--accent" style={{ marginBottom: 16 }}>
        <p className="pf-card-label" style={{ marginBottom: 14 }}>My Journey</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Word to Walk', value: stats.wtwCompletions },
            { label: 'Selah Sessions', value: stats.selahSessions },
            { label: 'Prayer Requests', value: stats.prayerRequests },
            { label: 'Testimonies', value: stats.testimonies },
          ].map(({ label, value }) => (
            <div key={label} className="pf-stat">
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {stats.lastActive && (
          <p className="pf-sub" style={{ marginTop: 12 }}>
            Last active: {new Date(stats.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* My Resources */}
      <Link href="/documents" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
        <div style={{
          padding: '12px 16px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, color: S.gold }}>📂</span>
            <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>Resources & Documents</span>
          </div>
          <span style={{ fontSize: 13, color: S.gold }}>→</span>
        </div>
      </Link>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="pf-btn pf-btn--quiet"
        style={{ display: 'flex', width: '100%' }}
      >
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
}
