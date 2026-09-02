'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import PrayerRequestCard, { type PrayerRequest } from '@/components/prayer-wall/PrayerRequestCard';
import TestimonyCard, { type Testimony } from '@/components/prayer-wall/TestimonyCard';
import SubmitRequestModal from '@/components/prayer-wall/SubmitRequestModal';
import SubmitTestimonyModal from '@/components/prayer-wall/SubmitTestimonyModal';

type Tab = 'requests' | 'testimonies';

export default function PrayerWallPage() {
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>(['member']);
  const [userId, setUserId] = useState<string | null>(null);
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isPropheticTeam = userRoles.some(r => r === 'prophetic_team' || r === 'pastor' || r === 'admin');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get current user and role
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      let isTeam = false;
      if (user) {
        const { data: roles } = await supabase.rpc('get_my_roles');
        if (roles) {
          setUserRoles(roles);
          isTeam = (roles as string[]).some(r => r === 'prophetic_team' || r === 'pastor' || r === 'admin');
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
    <div className="pf-page">
      {/* Page title */}
      <div className="pf-head">
        <p className="pf-eyebrow">Prayer Wall</p>
        <h1 className="pf-title">Community Intercession</h1>
        <p className="pf-sub">
          &ldquo;Pray for one another, that you may be healed.&rdquo; &mdash; James 5:16
        </p>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="pf-banner" role="status">✦ {successMessage}</div>
      )}

      {/* Tab bar + submit button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div className="pf-tabs" role="tablist" style={{ marginBottom: 0 }}>
          {(['requests', 'testimonies'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="pf-tabbtn"
            >
              {t === 'requests' ? 'Prayer Requests' : 'Testimonies'}
            </button>
          ))}
        </div>

        <button
          onClick={() => tab === 'requests' ? setShowRequestModal(true) : setShowTestimonyModal(true)}
          className="pf-btn pf-btn--sm"
        >
          + {tab === 'requests' ? 'Request' : 'Testimony'}
        </button>
      </div>

      {/* Pending queue banner for prophetic team */}
      {isPropheticTeam && (
        <div className="pf-banner" style={{ marginTop: 16, fontStyle: 'normal', color: 'var(--pf-text-soft)', background: 'rgba(106,138,170,0.08)', borderColor: 'rgba(106,138,170,0.25)' }}>
          <span aria-hidden="true">◈</span>
          <span>You are viewing all submissions including pending items. Approve or decline as needed.</span>
        </div>
      )}

      <div style={{ marginTop: 16 }} />

      {/* Content */}
      {loading ? (
        <div>
          {[0, 1, 2].map((i) => <div key={i} className="pf-skel" style={{ height: 120, borderRadius: 6, marginBottom: 12 }} />)}
        </div>
      ) : tab === 'requests' ? (
        requests.length === 0 ? (
          <div className="pf-empty">
            <span className="pf-empty-icon" aria-hidden="true">🙏</span>
            No prayer requests yet. Be the first to ask the community to stand with you.
          </div>
        ) : (
          requests.map((r) => (
            <PrayerRequestCard
              key={r.id}
              request={r}
              userRoles={userRoles}
              userId={userId}
              prayedIds={prayedIds}
              onPrayed={handlePrayed}
              onStatusChange={handleRequestStatusChange}
            />
          ))
        )
      ) : (
        testimonies.length === 0 ? (
          <div className="pf-empty">
            <span className="pf-empty-icon" aria-hidden="true">✦</span>
            No testimonies yet. Share what God has done — your story builds faith in others.
          </div>
        ) : (
          testimonies.map((t) => (
            <TestimonyCard
              key={t.id}
              testimony={t}
              userRoles={userRoles}
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
