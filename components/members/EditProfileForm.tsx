'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  member_status: string | null;
  join_date: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
  family_id: string | null;
  church_id: string | null;
}

interface Props {
  profile: Profile;
  onSaved: (updated: Partial<Profile>) => void;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
  padding: '10px 14px', color: S.text, fontSize: 14, fontFamily: S.font.body,
  outline: 'none', boxSizing: 'border-box',
};

const ROLES = ['member', 'prophetic_team', 'pastor', 'admin'];
const STATUSES = ['visitor', 'attendee', 'member', 'leader'];

export default function EditProfileForm({ profile, onSaved }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [birthday, setBirthday] = useState(profile.birthday ?? '');
  const [memberStatus, setMemberStatus] = useState(profile.member_status ?? 'attendee');
  const [role, setRole] = useState(profile.role ?? 'member');
  const [joinDate, setJoinDate] = useState(profile.join_date ?? '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
      showToast('Avatar updated.');
    } catch {
      showToast('Failed to upload avatar.');
    }
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const updates: Partial<Profile> = {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        birthday: birthday || null,
        member_status: memberStatus,
        role,
        join_date: joinDate || null,
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw error;
      onSaved(updates);
      showToast('Profile saved.');
    } catch {
      showToast('Failed to save profile.');
    }
    setSaving(false);
  };

  const initials = fullName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div>
      {toast && (
        <div style={{
          marginBottom: 16, padding: '10px 14px',
          background: S.goldDim, border: `1px solid ${S.goldBorder}`,
          borderRadius: 2, fontSize: 13, color: S.gold, fontStyle: 'italic',
        }}>
          ✦ {toast}
        </div>
      )}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: avatarUrl ? 'transparent' : S.goldDim,
          border: `1px solid ${S.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: S.gold, overflow: 'hidden', flexShrink: 0,
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: S.font.display }}>{initials}</span>
          }
        </div>
        <div>
          <label style={{
            display: 'inline-block', padding: '7px 14px',
            background: 'transparent', border: `1px solid ${S.border}`,
            borderRadius: 2, color: S.soft, fontSize: 10, cursor: 'pointer',
            fontFamily: S.font.body, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {uploadingAvatar ? 'Uploading…' : 'Upload Photo'}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
          </label>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: S.soft, fontStyle: 'italic' }}>JPG or PNG, max 5MB</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="First and last name" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Member Status</label>
            <select value={memberStatus} onChange={e => setMemberStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Platform Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {ROLES.map(r => <option key={r} value={r}>{r === 'prophetic_team' ? 'Prophetic Team' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44…" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, Postcode" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Birthday</label>
            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.soft, marginBottom: 6 }}>Join Date</label>
            <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 20, padding: '11px 28px',
          background: saving ? 'rgba(198,167,94,0.3)' : S.gold,
          border: 'none', borderRadius: 2,
          color: saving ? S.muted : S.dark,
          fontSize: 13, fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer',
          fontFamily: S.font.body, letterSpacing: '0.06em', transition: 'all 0.2s',
        }}
      >
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </div>
  );
}
