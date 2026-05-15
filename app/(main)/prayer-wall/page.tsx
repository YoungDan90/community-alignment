'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import PrayerRequestCard, { type PrayerRequest } from '@/components/prayer-wall/PrayerRequestCard';
import TestimonyCard, { type Testimony } from '@/components/prayer-wall/TestimonyCard';
import SubmitRequestModal from '@/components/prayer-wall/SubmitRequestModal';
import SubmitTestimonyModal from '@/components/prayer-wall/SubmitTestimonyModal';

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
};

type Tab = 'requests' | 'testimonies';

export default function PrayerWallPage() {
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [userId, setUserId] = useState<string | null>(null);
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isPropheticTeam = userRole === 'prophetic_team' || userRole === 'pastor';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get current user and role
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      let isTeam = false;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.role) {
          setUserRole(profile.role);
          isTeam = profile.role === 'prophetic_team' || profile.role === 'pastor';
        }

        // Fetch prayer IDs this user has already supported
        const { data: supported } = await supabase
          .from('prayer_support')
          .select('prayer_request_id')
          .eq('user_id', user.id);
        if (supported) {
          setPrayedIds(new Set(supported.map((s: { prayer_request_id: string }) => s.prayer_request_id)));
        }
      }

      // Fetch prayer requests
      let reqQuery = supabase
        .from('prayer_requests')
        .select('*, prophetic_responses(id, response_text, created_at)')
        .order('created_at', { ascending: false });

      if (!isTeam) {
        reqQuery = reqQuery.eq('status', 'approved') as typeof reqQuery;
      }

      const { data: reqData } = await reqQuery;
      setRequests((reqData as PrayerRequest[]) ?? []);

      // Fetch testimonies
      let testQuery = supabase
        .from('testimonies')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (!isTeam) {
        testQuery = testQuery.eq('status', 'approved') as typeof testQuery;
      }

      const { data: testData } = await testQuery;
      setTestimonies((testData as Testimony[]) ?? []);
    } catch { /* best-effort */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrayed = (id: string) => {
    setPrayedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  };

  const handleRequestStatusChange = (id: string, status: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  };

  const handleTestimonyStatusChange = (id: string, status: string) => {
    setTestimonies((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  };

  const handleTestimonyFeaturedChange = (id: string, featured: boolean) => {
    setTestimonies((prev) => prev.map((t) => t.id === id ? { ...t, is_featured: featured } : t));
  };

  const handleSubmitted = (type: 'request' | 'testimony') => {
    setShowRequestModal(false);
    setShowTestimonyModal(false);
    setSuccessMessage(
      type === 'request'
        ? 'Your prayer request has been submitted and will appear once reviewed.'
        : 'Your testimony has been submitted and will appear once reviewed.'
    );
    setTimeout(() => setSuccessMessage(''), 5000);
    fetchData();
  };

  return (
    <div
      style={{
        padding: '28px 20px',
        maxWidth: 680,
        margin: '0 auto',
        fontFamily: S.font.body,
      }}
    >
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>
          Prayer Wall
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
          Community Intercession
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: S.soft, fontStyle: 'italic' }}>
          &ldquo;Pray for one another, that you may be healed.&rdquo; &mdash; James 5:16
        </p>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div
          style={{
            background: S.goldDim, border: `1px solid ${S.goldBorder}`,
            borderRadius: 2, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: S.gold, fontStyle: 'italic',
          }}
        >
          ✦ {successMessage}
        </div>
      )}

      {/* Tab bar + submit button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['requests', 'testimonies'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 20px',
                background: tab === t ? S.goldDim : 'transparent',
                border: `1px solid ${tab === t ? S.goldBorder : S.border}`,
                borderRadius: t === 'requests' ? '2px 0 0 2px' : '0 2px 2px 0',
                color: tab === t ? S.gold : S.muted,
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: S.font.body,
                transition: 'all 0.2s',
              }}
            >
              {t === 'requests' ? 'Prayer Requests' : 'Testimonies'}
            </button>
          ))}
        </div>

        <button
          onClick={() => tab === 'requests' ? setShowRequestModal(true) : setShowTestimonyModal(true)}
          style={{
            padding: '8px 16px',
            background: S.gold, border: 'none', borderRadius: 2,
            color: S.dark, fontSize: 11, fontWeight: 'bold',
            cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em',
          }}
        >
          + {tab === 'requests' ? 'Request' : 'Testimony'}
        </button>
      </div>

      {/* Pending queue banner for prophetic team */}
      {isPropheticTeam && (
        <div
          style={{
            background: 'rgba(106,138,170,0.08)',
            border: '1px solid rgba(106,138,170,0.2)',
            borderRadius: 2, padding: '8px 14px', marginBottom: 16,
            fontSize: 11, color: S.soft, display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span>◈</span>
          <span>You are viewing all submissions including pending items. Approve or decline as needed.</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic' }}>Loading…</p>
        </div>
      ) : tab === 'requests' ? (
        requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🙏</p>
            <p style={{ fontSize: 14, color: S.soft, fontStyle: 'italic' }}>
              No prayer requests yet. Be the first to ask the community to stand with you.
            </p>
          </div>
        ) : (
          requests.map((r) => (
            <PrayerRequestCard
              key={r.id}
              request={r}
              userRole={userRole}
              userId={userId}
              prayedIds={prayedIds}
              onPrayed={handlePrayed}
              onStatusChange={handleRequestStatusChange}
            />
          ))
        )
      ) : (
        testimonies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>✦</p>
            <p style={{ fontSize: 14, color: S.soft, fontStyle: 'italic' }}>
              No testimonies yet. Share what God has done — your story builds faith in others.
            </p>
          </div>
        ) : (
          testimonies.map((t) => (
            <TestimonyCard
              key={t.id}
              testimony={t}
              userRole={userRole}
              onStatusChange={handleTestimonyStatusChange}
              onFeaturedChange={handleTestimonyFeaturedChange}
            />
          ))
        )
      )}

      {/* Modals */}
      {showRequestModal && (
        <SubmitRequestModal
          onClose={() => setShowRequestModal(false)}
          onSubmitted={() => handleSubmitted('request')}
        />
      )}
      {showTestimonyModal && (
        <SubmitTestimonyModal
          onClose={() => setShowTestimonyModal(false)}
          onSubmitted={() => handleSubmitted('testimony')}
        />
      )}
    </div>
  );
}
