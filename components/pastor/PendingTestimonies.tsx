'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import TestimonyCard, { type Testimony } from '@/components/prayer-wall/TestimonyCard';

const S = {
  font: { body: "Georgia, 'Times New Roman', serif" },
  muted: '#3a5570', soft: '#6a8aaa', gold: '#c6a75e',
};

export default function PendingTestimonies() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('testimonies')
        .select('id, content, scripture_reference, is_anonymous, is_featured, status, prophetic_note, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      // Map prophetic_note → note to match TestimonyCard interface
      const mapped = (data ?? []).map((t: Record<string, unknown>) => ({
        ...t,
        note: (t.prophetic_note as string | null) ?? null,
      })) as Testimony[];
      setTestimonies(mapped);
      setLoading(false);
    })();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    setTestimonies((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    try {
      const supabase = createClient();
      await supabase.from('testimonies').update({ status }).eq('id', id);
    } catch { /* best-effort */ }
  };

  const handleFeaturedChange = async (id: string, featured: boolean) => {
    setTestimonies((prev) => prev.map((t) => t.id === id ? { ...t, is_featured: featured } : t));
    try {
      const supabase = createClient();
      await supabase.from('testimonies').update({ is_featured: featured }).eq('id', id);
    } catch { /* best-effort */ }
  };

  if (loading) return <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic', fontFamily: S.font.body }}>Loading…</p>;

  if (!testimonies.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: S.font.body }}>
        <p style={{ fontSize: 22, marginBottom: 8 }}>✦</p>
        <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic' }}>No pending testimonies. All caught up.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: S.muted, fontFamily: S.font.body }}>
        {testimonies.length} pending testimon{testimonies.length !== 1 ? 'ies' : 'y'}
      </p>
      {testimonies.map((t) => (
        <TestimonyCard
          key={t.id}
          testimony={t}
          userRole="pastor"
          onStatusChange={handleStatusChange}
          onFeaturedChange={handleFeaturedChange}
        />
      ))}
    </div>
  );
}
