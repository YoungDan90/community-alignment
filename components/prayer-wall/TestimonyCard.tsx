'use client';

import { createClient } from '@/lib/supabase/client';

export interface Testimony {
  id: string;
  content: string;
  scripture_reference: string | null;
  is_anonymous: boolean;
  is_featured: boolean;
  status: string;
  note: string | null;
  created_at: string;
}

interface TestimonyCardProps {
  testimony: Testimony;
  userRole: string;
  onStatusChange: (id: string, status: string, note?: string) => void;
  onFeaturedChange: (id: string, featured: boolean) => void;
}

const S = {
  font: {
    display: 'var(--font-cormorant), Georgia, serif',
    body: "Georgia, 'Times New Roman', serif",
  },
  gold: '#c6a75e',
  goldDim: 'rgba(198,167,94,0.15)',
  goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0b1118',
  dark: '#070c12',
  border: '#162030',
  text: '#ddd0b8',
  textLight: '#f0e8d4',
  soft: '#6a8aaa',
  muted: '#3a5570',
  green: '#5a8a5a',
  greenDim: 'rgba(90,138,90,0.15)',
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending:  { bg: 'rgba(106,138,170,0.1)', border: 'rgba(106,138,170,0.3)', text: '#6a8aaa' },
  approved: { bg: S.greenDim,              border: 'rgba(90,138,90,0.3)',   text: S.green },
  declined: { bg: 'rgba(122,74,74,0.1)',   border: 'rgba(122,74,74,0.3)',   text: '#b07070' },
};

export default function TestimonyCard({
  testimony,
  userRole,
  onStatusChange,
  onFeaturedChange,
}: TestimonyCardProps) {
  const isPropheticTeam = userRole === 'prophetic_team' || userRole === 'pastor';
  const isPastor = userRole === 'pastor';
  const sc = STATUS_COLORS[testimony.status] ?? STATUS_COLORS.pending;

  const handleStatusChange = async (newStatus: string) => {
    onStatusChange(testimony.id, newStatus);
    try {
      const supabase = createClient();
      await supabase.from('testimonies').update({ status: newStatus }).eq('id', testimony.id);
    } catch { /* best-effort */ }
  };

  const handleFeatureToggle = async () => {
    const next = !testimony.is_featured;
    onFeaturedChange(testimony.id, next);
    try {
      const supabase = createClient();
      await supabase.from('testimonies').update({ is_featured: next }).eq('id', testimony.id);
    } catch { /* best-effort */ }
  };

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${testimony.is_featured ? S.goldBorder : S.border}`,
        borderRadius: 3,
        padding: '20px 20px 16px',
        marginBottom: 12,
        fontFamily: S.font.body,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {testimony.is_featured && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(198,167,94,0.12)',
              border: `1px solid ${S.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: S.gold, flexShrink: 0,
            }}
          >
            {testimony.is_anonymous ? '?' : '✦'}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: S.muted }}>
              {testimony.is_anonymous ? 'Anonymous' : 'Community Member'}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: S.muted, opacity: 0.7 }}>
              {new Date(testimony.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {testimony.is_featured && (
            <span style={{ padding: '2px 10px', borderRadius: 20, background: S.goldDim, border: `1px solid ${S.goldBorder}`, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold }}>
              Featured
            </span>
          )}
          {isPropheticTeam && (
            <span style={{ padding: '2px 10px', borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}`, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: sc.text }}>
              {testimony.status}
            </span>
          )}
        </div>
      </div>

      {/* Scripture */}
      {testimony.scripture_reference && (
        <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold }}>
          {testimony.scripture_reference}
        </p>
      )}

      {/* Content */}
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 15, color: S.text,
          fontFamily: S.font.display, fontStyle: 'italic',
          lineHeight: 1.8,
        }}
      >
        {testimony.content}
      </p>

      {/* Note (if any) */}
      {testimony.note && (
        <div
          style={{
            background: S.dark,
            border: `1px solid ${S.border}`,
            padding: '8px 12px',
            borderRadius: 2,
            marginBottom: 12,
          }}
        >
          <p style={{ margin: '0 0 2px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.muted }}>Note</p>
          <p style={{ margin: 0, fontSize: 12, color: S.soft, fontStyle: 'italic' }}>{testimony.note}</p>
        </div>
      )}

      {/* Prophetic/pastor actions */}
      {isPropheticTeam && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {testimony.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusChange('approved')}
                style={{
                  padding: '5px 14px', borderRadius: 2,
                  background: S.greenDim, border: '1px solid rgba(90,138,90,0.3)',
                  color: S.green, fontSize: 10, cursor: 'pointer',
                  fontFamily: S.font.body, letterSpacing: '0.08em',
                }}
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusChange('declined')}
                style={{
                  padding: '5px 14px', borderRadius: 2,
                  background: 'rgba(122,74,74,0.15)', border: '1px solid rgba(122,74,74,0.3)',
                  color: '#b07070', fontSize: 10, cursor: 'pointer',
                  fontFamily: S.font.body, letterSpacing: '0.08em',
                }}
              >
                Decline
              </button>
            </>
          )}
          {isPastor && testimony.status === 'approved' && (
            <button
              onClick={handleFeatureToggle}
              style={{
                padding: '5px 14px', borderRadius: 2,
                background: testimony.is_featured ? S.goldDim : 'transparent',
                border: `1px solid ${testimony.is_featured ? S.goldBorder : S.border}`,
                color: testimony.is_featured ? S.gold : S.soft,
                fontSize: 10, cursor: 'pointer',
                fontFamily: S.font.body, letterSpacing: '0.08em',
              }}
            >
              {testimony.is_featured ? '★ Featured' : '☆ Feature'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
