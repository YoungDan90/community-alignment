'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SwapRequestForm from '@/components/rotas/SwapRequestForm';

interface RotaSlot {
  id: string;
  role_name: string;
  status: string;
  member_id: string;
  rota: {
    id: string;
    title: string | null;
    service_date: string;
    notes: string | null;
    team: { id: string; name: string };
  };
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const STATUS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  assigned:      { text: S.muted,    bg: 'transparent',           border: S.border },
  confirmed:     { text: '#5a8a5a', bg: 'rgba(90,138,90,0.12)', border: 'rgba(90,138,90,0.3)' },
  swap_requested:{ text: S.gold,    bg: S.goldDim,               border: S.goldBorder },
  declined:      { text: '#c47a7a', bg: 'rgba(196,122,122,0.1)', border: 'rgba(196,122,122,0.3)' },
};

export default function MyRotaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<RotaSlot[]>([]);
  const [pastSlots, setPastSlots] = useState<RotaSlot[]>([]);
  const [swapSlot, setSwapSlot] = useState<RotaSlot | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('rota_slots')
        .select('id, role_name, status, member_id, rota:rota_id(id, title, service_date, notes, team:team_id(id, name))')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });

      const all = (data as unknown as RotaSlot[]) ?? [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      setSlots(all.filter(s => new Date(s.rota.service_date) >= now));
      setPastSlots(all.filter(s => new Date(s.rota.service_date) < now));
      setLoading(false);
    })();
  }, [router]);

  const handleConfirm = async (slotId: string) => {
    setConfirming(slotId);
    const supabase = createClient();
    await supabase.from('rota_slots').update({ status: 'confirmed' }).eq('id', slotId);
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'confirmed' } : s));
    showToast('Confirmed. Thank you!');
    setConfirming(null);
  };

  const handleSwapSubmitted = () => {
    setSwapSlot(null);
    setSlots(prev => prev.map(s => s.id === swapSlot?.id ? { ...s, status: 'swap_requested' } : s));
    showToast('Swap request submitted.');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ fontSize: 13, color: S.muted, fontStyle: 'italic', fontFamily: S.font.body }}>Loading…</p>
    </div>
  );

  const SlotCard = ({ slot, showActions }: { slot: RotaSlot; showActions: boolean }) => {
    const date = new Date(slot.rota.service_date);
    const dateStr = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const sc = STATUS_COLORS[slot.status] ?? STATUS_COLORS.assigned;
    return (
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.muted }}>{slot.rota.team.name}</p>
            <p style={{ margin: '0 0 4px', fontSize: 16, color: S.textLight, fontFamily: S.font.display }}>{slot.role_name}</p>
            <p style={{ margin: 0, fontSize: 12, color: S.soft }}>{dateStr}</p>
          </div>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'capitalize', color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 9px', borderRadius: 10, flexShrink: 0 }}>
            {slot.status.replace('_', ' ')}
          </span>
        </div>
        {slot.rota.notes && <p style={{ margin: '0 0 10px', fontSize: 12, color: S.soft, fontStyle: 'italic' }}>{slot.rota.notes}</p>}
        {showActions && slot.status === 'assigned' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleConfirm(slot.id)}
              disabled={confirming === slot.id}
              style={{ flex: 1, padding: '8px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              {confirming === slot.id ? '…' : 'Confirm'}
            </button>
            <button
              onClick={() => setSwapSlot(slot)}
              style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >Request Swap</button>
          </div>
        )}
        {showActions && slot.status === 'confirmed' && (
          <button
            onClick={() => setSwapSlot(slot)}
            style={{ padding: '7px 16px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 11, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >Request Swap</button>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '28px 20px', maxWidth: 680, margin: '0 auto', fontFamily: S.font.body }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>My Serving</p>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>My Rota</h1>
        <p style={{ margin: 0, fontSize: 13, color: S.soft, fontStyle: 'italic' }}>Your upcoming serving assignments.</p>
      </div>

      {toast && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 13, color: S.gold }}>✦ {toast}</div>
      )}

      {slots.length === 0 && pastSlots.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>◈</p>
          <p style={{ fontSize: 14, color: S.soft, fontStyle: 'italic' }}>You have no serving assignments yet. Your pastor will add you to a rota.</p>
        </div>
      )}

      {slots.length > 0 && (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted }}>Upcoming ({slots.length})</p>
          {slots.map(s => <SlotCard key={s.id} slot={s} showActions />)}
        </>
      )}

      {pastSlots.length > 0 && (
        <div style={{ marginTop: 28, opacity: 0.6 }}>
          <p style={{ margin: '0 0 14px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted }}>Past</p>
          {pastSlots.map(s => <SlotCard key={s.id} slot={s} showActions={false} />)}
        </div>
      )}

      {swapSlot && (
        <SwapRequestForm
          slot={swapSlot}
          onClose={() => setSwapSlot(null)}
          onSubmitted={handleSwapSubmitted}
        />
      )}
    </div>
  );
}
