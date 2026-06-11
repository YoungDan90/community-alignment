'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const TYPE_OPTIONS = [
  { value: 'general',  label: 'General',  color: S.soft },
  { value: 'urgent',   label: 'Urgent',   color: '#e05555' },
  { value: 'event',    label: 'Event',    color: '#5588e0' },
  { value: 'prayer',   label: 'Prayer',   color: '#9055e0' },
  { value: 'pastoral', label: 'Pastoral', color: S.gold },
];

const AUDIENCE_OPTIONS = [
  { value: 'all',            label: 'All Members' },
  { value: 'members',        label: 'Members Only' },
  { value: 'leaders',        label: 'Leaders Only' },
  { value: 'specific_group', label: 'Specific Group' },
];

const EXPIRY_OPTIONS = [
  { value: '',  label: 'Never expires' },
  { value: '7',  label: '1 week' },
  { value: '14', label: '2 weeks' },
  { value: '30', label: '1 month' },
];

interface Group { id: string; name: string }

interface Props {
  onClose: () => void;
  onPosted: () => void;
}

export default function ComposeAnnouncement({ onClose, onPosted }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [audience, setAudience] = useState('all');
  const [groupId, setGroupId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const [expiryDays, setExpiryDays] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('groups').select('id, name').eq('is_active', true).order('name');
      setGroups(data ?? []);
    })();
  }, []);

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return; }
    if (audience === 'specific_group' && !groupId) { setError('Please select a group.'); return; }
    setPosting(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setPosting(false); return; }
    const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).maybeSingle();

    const expiresAt = expiryDays
      ? new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString()
      : null;

    const { data: inserted, error: insertErr } = await supabase
      .from('announcements')
      .insert({
        church_id: profile?.church_id,
        posted_by: user.id,
        title: title.trim(),
        content: content.trim(),
        type,
        audience,
        group_id: audience === 'specific_group' ? groupId : null,
        is_pinned: isPinned,
        send_push: sendPush,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertErr) { setError('Failed to post announcement.'); setPosting(false); return; }

    if (sendPush && inserted) {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inserted.title,
          body: inserted.content.slice(0, 100),
          url: '/announcements',
        }),
      });
    }

    setPosting(false);
    onPosted();
  };

  const typeOption = TYPE_OPTIONS.find(t => t.value === type)!;
  const audienceLabel = audience === 'specific_group'
    ? groups.find(g => g.id === groupId)?.name ?? 'Group'
    : AUDIENCE_OPTIONS.find(a => a.value === audience)?.label ?? 'All';

  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '9px 12px', color: S.text, fontSize: 13, fontFamily: S.font.body,
    boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>
          New Announcement
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowPreview(p => !p)}
            style={{ background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, padding: '5px 12px', color: S.soft, fontSize: 11, cursor: 'pointer', fontFamily: S.font.body }}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: S.soft, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      </div>

      {showPreview ? (
        <AnnouncementPreview
          title={title || 'Announcement title'}
          content={content || 'Announcement content will appear here.'}
          audienceLabel={audienceLabel}
          isPinned={isPinned}
          typeColor={typeOption.color}
          typeLabel={typeOption.label}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            style={inputStyle}
          />

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your announcement…"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />

          {/* Type */}
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Type</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  style={{
                    padding: '5px 12px', border: `1px solid ${type === opt.value ? opt.color : S.border}`,
                    borderRadius: 2, background: type === opt.value ? `${opt.color}20` : 'transparent',
                    color: type === opt.value ? opt.color : S.soft,
                    fontSize: 11, cursor: 'pointer', fontFamily: S.font.body,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Audience</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {AUDIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAudience(opt.value)}
                  style={{
                    padding: '5px 12px', border: `1px solid ${audience === opt.value ? S.goldBorder : S.border}`,
                    borderRadius: 2, background: audience === opt.value ? S.goldDim : 'transparent',
                    color: audience === opt.value ? S.gold : S.soft,
                    fontSize: 11, cursor: 'pointer', fontFamily: S.font.body,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {audience === 'specific_group' && (
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
              >
                <option value="">Select a group…</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>

          {/* Expiry */}
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.soft }}>Expires</p>
            <select value={expiryDays} onChange={e => setExpiryDays(e.target.value)} style={inputStyle}>
              {EXPIRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 24 }}>
            <ToggleRow label="Pin to top" checked={isPinned} onChange={setIsPinned} />
            <ToggleRow label="Send push notification" checked={sendPush} onChange={setSendPush} />
          </div>

          {error && <p style={{ margin: 0, fontSize: 12, color: '#e05555' }}>{error}</p>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          onClick={handlePost}
          disabled={posting}
          style={{
            padding: '10px 24px', background: S.goldDim, border: `1px solid ${S.goldBorder}`,
            borderRadius: 2, color: S.gold, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: posting ? 'wait' : 'pointer', fontFamily: S.font.body, opacity: posting ? 0.6 : 1,
          }}
        >
          {posting ? 'Posting…' : 'Post Announcement'}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: 36, height: 20, flexShrink: 0,
          background: checked ? S.gold : S.border, border: 'none', borderRadius: 10,
          cursor: 'pointer', transition: 'background 0.25s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.25s',
        }} />
      </button>
      <span style={{ fontSize: 12, color: S.text, fontFamily: S.font.body }}>{label}</span>
    </div>
  );
}

const S_gold = '#c6a75e';
function AnnouncementPreview({ title, content, audienceLabel, isPinned, typeColor, typeLabel }: {
  title: string; content: string; audienceLabel: string;
  isPinned: boolean; typeColor: string; typeLabel: string;
}) {
  return (
    <div style={{
      background: S.dark,
      border: `1px solid ${isPinned ? S_gold + '55' : S.border}`,
      borderRadius: 3, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '2px 8px', borderRadius: 2,
          background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}40`,
        }}>{typeLabel}</span>
        <span style={{
          fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '2px 8px', borderRadius: 2,
          background: S.goldDim, color: S.gold, border: `1px solid ${S.goldBorder}`,
        }}>{audienceLabel}</span>
        {isPinned && (
          <span style={{
            fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 2,
            background: `${S_gold}20`, color: S_gold, border: `1px solid ${S_gold}40`,
          }}>Pinned</span>
        )}
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 15, color: S.textLight, fontFamily: 'var(--font-cormorant), Georgia, serif' }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: S.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</p>
    </div>
  );
}
