'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Rota {
  id: string;
  title: string | null;
  service_date: string;
  notes: string | null;
  team: { id: string; name: string };
}

interface RotaSlot {
  id: string;
  role_name: string;
  status: string;
  member_id: string | null;
  profile: { full_name: string | null } | null;
}

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface Props {
  rota: Rota;
  onBack: () => void;
}

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const STATUS_COLORS: Record<string, string> = {
  assigned: S.muted, confirmed: '#5a8a5a', swap_requested: '#c6a75e', declined: '#c47a7a',
};

const inputStyle: React.CSSProperties = {
  background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
  padding: '7px 10px', color: S.text, fontSize: 12, fontFamily: S.font.body,
  outline: 'none', boxSizing: 'border-box',
};

export default function RotaDetail({ rota, onBack }: Props) {
  const [slots, setSlots] = useState<RotaSlot[]>([]);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editMember, setEditMember] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newMember, setNewMember] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    loadSlots();
    loadMembers();
  }, [rota.id]);

  const loadSlots = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('rota_slots')
      .select('id, role_name, status, member_id, profile:member_id(full_name)')
      .eq('rota_id', rota.id)
      .order('created_at');
    setSlots((data as unknown as RotaSlot[]) ?? []);
  };

  const loadMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
    setAllMembers((data as MemberOption[]) ?? []);
  };

  const startEdit = (slot: RotaSlot) => {
    setEditingId(slot.id);
    setEditRole(slot.role_name);
    setEditMember(slot.member_id ?? '');
  };

  const saveEdit = async (slotId: string) => {
    const supabase = createClient();
    await supabase.from('rota_slots').update({ role_name: editRole, member_id: editMember || null }).eq('id', slotId);
    setEditingId(null);
    await loadSlots();
    showToast('Slot updated.');
  };

  const deleteSlot = async (slotId: string) => {
    const supabase = createClient();
    await supabase.from('rota_slots').delete().eq('id', slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));
    showToast('Slot removed.');
  };

  const addSlot = async () => {
    if (!newRole.trim()) return;
    const supabase = createClient();
    await supabase.from('rota_slots').insert({ rota_id: rota.id, role_name: newRole.trim(), member_id: newMember || null });
    setNewRole(''); setNewMember('');
    await loadSlots();
    showToast('Slot added.');
  };

  const sendReminders = async () => {
    const dateStr = new Date(rota.service_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const assigned = slots.filter(s => s.member_id);
    for (const slot of assigned) {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Serving Reminder',
          body: `Reminder: you are serving as ${slot.role_name} on ${dateStr}.`,
          url: '/my-rota',
          target: slot.member_id,
        }),
      }).catch(() => {});
    }
    showToast(`Reminders sent to ${assigned.length} member${assigned.length !== 1 ? 's' : ''}.`);
  };

  const exportText = () => {
    const dateStr = new Date(rota.service_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const lines = [
      `*${rota.title ?? rota.team.name}*`,
      `📅 ${dateStr}`,
      '',
      '*Serving:*',
      ...slots.map(s => `• ${s.role_name}: ${s.profile?.full_name ?? 'TBC'}`),
    ];
    if (rota.notes) lines.push('', `_${rota.notes}_`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Copied to clipboard.'));
  };

  const dateStr = new Date(rota.service_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 12, cursor: 'pointer', fontFamily: S.font.body, marginBottom: 16, padding: 0 }}>
        ← Back to Rotas
      </button>

      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted }}>{rota.team.name}</p>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>{rota.title ?? dateStr}</h2>
        <p style={{ margin: 0, fontSize: 13, color: S.soft }}>{dateStr}</p>
        {rota.notes && <p style={{ margin: '6px 0 0', fontSize: 12, color: S.muted, fontStyle: 'italic' }}>{rota.notes}</p>}
      </div>

      {toast && (
        <div style={{ marginBottom: 14, padding: '8px 12px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 12, color: S.gold }}>
          ✦ {toast}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={sendReminders} style={{ padding: '7px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Send Reminders
        </button>
        <button onClick={exportText} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Copy for WhatsApp
        </button>
      </div>

      {/* Slots */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 3, padding: '16px 18px', marginBottom: 14 }}>
        <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted }}>Serving Slots</p>

        {slots.length === 0 && <p style={{ fontSize: 13, color: S.soft, fontStyle: 'italic', marginBottom: 12 }}>No slots yet.</p>}

        {slots.map(slot => (
          <div key={slot.id} style={{ marginBottom: 10 }}>
            {editingId === slot.id ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                <input value={editRole} onChange={e => setEditRole(e.target.value)} style={inputStyle} />
                <select value={editMember} onChange={e => setEditMember(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Unassigned</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
                </select>
                <button onClick={() => saveEdit(slot.id)} style={{ padding: '6px 10px', background: S.gold, border: 'none', borderRadius: 2, color: S.dark, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${S.border}` }}>
                <div>
                  <span style={{ fontSize: 13, color: S.textLight, fontFamily: S.font.display }}>{slot.profile?.full_name ?? <em style={{ color: S.soft }}>Unassigned</em>}</span>
                  <span style={{ margin: '0 8px', color: S.border }}>·</span>
                  <span style={{ fontSize: 12, color: S.muted }}>{slot.role_name}</span>
                  <span style={{ marginLeft: 8, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: STATUS_COLORS[slot.status] ?? S.muted }}>{slot.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button onClick={() => startEdit(slot)} style={{ background: 'none', border: 'none', color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>Edit</button>
                  <button onClick={() => deleteSlot(slot.id)} style={{ background: 'none', border: 'none', color: '#c47a7a', fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add slot */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Role name…" style={inputStyle} />
          <select value={newMember} onChange={e => setNewMember(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Assign member…</option>
            {allMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed'}</option>)}
          </select>
          <button onClick={addSlot} disabled={!newRole.trim()} style={{ padding: '7px 12px', background: newRole.trim() ? S.goldDim : 'transparent', border: `1px solid ${newRole.trim() ? S.goldBorder : S.border}`, borderRadius: 2, color: newRole.trim() ? S.gold : S.muted, fontSize: 11, cursor: newRole.trim() ? 'pointer' : 'not-allowed', fontFamily: S.font.body }}>+ Add</button>
        </div>
      </div>
    </div>
  );
}
