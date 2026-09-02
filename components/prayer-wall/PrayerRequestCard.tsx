'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PropheticResponse {
  id: string;
  response_text: string;
  created_at: string;
}

export interface PrayerRequest {
  id: string;
  content: string;
  category: string | null;
  is_anonymous: boolean;
  status: string;
  prayer_count: number;
  created_at: string;
  prophetic_responses: PropheticResponse[];
}

interface PrayerRequestCardProps {
  request: PrayerRequest;
  userRoles: string[];
  userId: string | null;
  prayedIds: Set<string>;
  onPrayed: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

const S = {
  font: {
    display: 'var(--font-cormorant), Georgia, serif',
    body: "var(--font-jost), 'Jost', sans-serif",
  },
  gold: '#c6a75e',
  goldDim: 'rgba(198,167,94,0.15)',
  goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828',
  dark: '#0f1e2e',
  border: '#1e3a52',
  text: '#ddd0b8',
  textLight: '#f0e8d4',
  soft: '#6a8aaa',
  muted: '#c6a75e',
  green: '#5a8a5a',
  greenDim: 'rgba(90,138,90,0.15)',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#6a8aaa',
  approved: '#5a8a5a',
  answered: '#c6a75e',
  declined: '#7a4a4a',
};

export default function PrayerRequestCard({
  request,
  userRoles,
  userId,
  prayedIds,
  onPrayed,
  onStatusChange,
}: PrayerRequestCardProps) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);
  const [localCount, setLocalCount] = useState(request.prayer_count);
  const hasPrayed = prayedIds.has(request.id);
  const isPropheticTeam = userRoles.some(r => r === 'prophetic_team' || r === 'pastor' || r === 'admin');

  const handlePray = async () => {
    if (hasPrayed) return;
    setLocalCount((c) => c + 1);
    onPrayed(request.id);
    try {
      const supabase = createClient();
      await supabase.rpc('increment_prayer_count', { request_id: request.id });
      await supabase.from('prayer_support').insert({
        prayer_request_id: request.id,
        user_id: userId,
      });
    } catch { /* best-effort */ }
  };

  const handleSaveResponse = async () => {
    if (!responseText.trim()) return;
    setSavingResponse(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('prophetic_responses').insert({
        prayer_request_id: request.id,
        added_by: user?.id ?? null,
        response_text: responseText.trim(),
      });
      setResponseText('');
      setShowResponseForm(false);
    } catch { /* best-effort */ }
    setSavingResponse(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    onStatusChange(request.id, newStatus);
    try {
      const supabase = createClient();
      await supabase.from('prayer_requests').update({ status: newStatus }).eq('id', request.id);
    } catch { /* best-effort */ }
  };

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 3,
        padding: '20px 20px 16px',
        marginBottom: 12,
        fontFamily: S.font.body,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Status indicator strip */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: STATUS_COLORS[request.status] ?? S.muted }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingLeft: 8 }}>
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
            {request.is_anonymous ? '?' : '✦'}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: S.muted }}>
              {request.is_anonymous ? 'Anonymous' : 'Community Member'}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: S.muted, opacity: 0.7 }}>
              {new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        {request.category && (
          <span
            style={{
              padding: '2px 10px', borderRadius: 20,
              background: S.goldDim, border: `1px solid ${S.goldBorder}`,
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold,
            }}
          >
            {request.category}
          </span>
        )}
      </div>

      {/* Content */}
      <p
        style={{
          margin: '0 0 14px', paddingLeft: 8,
          fontSize: 14, color: S.text,
          fontFamily: S.font.display, fontStyle: 'italic',
          lineHeight: 1.75,
        }}
      >
        {request.content}
      </p>

      {/* Prophetic responses */}
      {request.prophetic_responses?.length > 0 && (
        <div style={{ paddingLeft: 8, marginBottom: 12 }}>
          {request.prophetic_responses.map((r) => (
            <div
              key={r.id}
              style={{
                background: S.dark,
                borderLeft: `2px solid ${S.gold}`,
                padding: '8px 12px',
                marginBottom: 6,
                borderRadius: '0 2px 2px 0',
              }}
            >
              <p style={{ margin: '0 0 2px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.gold }}>
                Prophetic Word
              </p>
              <p style={{ margin: 0, fontSize: 13, color: S.soft, fontFamily: S.font.display, fontStyle: 'italic', lineHeight: 1.6 }}>
                {r.response_text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8 }}>
        <button
          onClick={handlePray}
          disabled={hasPrayed}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px',
            background: hasPrayed ? S.greenDim : 'transparent',
            border: `1px solid ${hasPrayed ? S.green : S.border}`,
            borderRadius: 20,
            color: hasPrayed ? S.green : S.soft,
            fontSize: 11, cursor: hasPrayed ? 'default' : 'pointer',
            fontFamily: S.font.body, letterSpacing: '0.06em',
            transition: 'all 0.2s',
          }}
        >
          🙏 {hasPrayed ? 'Praying' : "I'm Praying"} · {localCount}
        </button>

        {isPropheticTeam && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowResponseForm(!showResponseForm)}
              style={{
                padding: '5px 12px', borderRadius: 2,
                background: S.goldDim, border: `1px solid ${S.goldBorder}`,
                color: S.gold, fontSize: 10, cursor: 'pointer',
                fontFamily: S.font.body, letterSpacing: '0.08em',
              }}
            >
              + Word
            </button>
            {request.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusChange('approved')}
                  style={{
                    padding: '5px 12px', borderRadius: 2,
                    background: 'rgba(90,138,90,0.15)', border: '1px solid rgba(90,138,90,0.3)',
                    color: S.green, fontSize: 10, cursor: 'pointer',
                    fontFamily: S.font.body, letterSpacing: '0.08em',
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatusChange('declined')}
                  style={{
                    padding: '5px 12px', borderRadius: 2,
                    background: 'rgba(122,74,74,0.15)', border: '1px solid rgba(122,74,74,0.3)',
                    color: '#b07070', fontSize: 10, cursor: 'pointer',
                    fontFamily: S.font.body, letterSpacing: '0.08em',
                  }}
                >
                  Decline
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Response form */}
      {showResponseForm && (
        <div style={{ marginTop: 12, paddingLeft: 8 }}>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Write a prophetic word or scripture for this request…"
            rows={3}
            style={{
              width: '100%',
              background: S.dark,
              border: `1px solid ${S.goldBorder}`,
              borderRadius: 2,
              padding: '10px 12px',
              color: S.text,
              fontSize: 13,
              fontFamily: S.font.display,
              fontStyle: 'italic',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.65,
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowResponseForm(false)}
              style={{
                padding: '6px 14px', background: 'transparent', border: `1px solid ${S.border}`,
                borderRadius: 2, color: S.soft, fontSize: 11, cursor: 'pointer', fontFamily: S.font.body,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveResponse}
              disabled={!responseText.trim() || savingResponse}
              style={{
                padding: '6px 16px',
                background: responseText.trim() ? S.gold : 'rgba(198,167,94,0.2)',
                border: 'none', borderRadius: 2,
                color: responseText.trim() ? S.dark : S.muted,
                fontSize: 11, fontWeight: 'bold',
                cursor: responseText.trim() ? 'pointer' : 'not-allowed',
                fontFamily: S.font.body,
              }}
            >
              {savingResponse ? 'Saving…' : 'Post Word'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
