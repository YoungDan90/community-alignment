'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GoalComments from '@/components/goals/GoalComments';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  created_at: string;
}

const STATUS_LABEL: Record<Goal['status'], string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

export default function OneToOnePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [pastorName, setPastorName] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadGoals = async (supabase: ReturnType<typeof createClient>, uid: string) => {
    const { data } = await supabase
      .from('holistic_goals')
      .select('id, title, description, status, progress, created_at')
      .eq('member_id', uid)
      .order('created_at', { ascending: false });
    setGoals((data as Goal[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: assignment } = await supabase
        .from('pastoral_assignments')
        .select('pastor:pastor_id(full_name)')
        .eq('member_id', user.id)
        .maybeSingle();

      const pastor = assignment?.pastor as { full_name: string | null } | { full_name: string | null }[] | null;
      const pastorProfile = Array.isArray(pastor) ? pastor[0] : pastor;
      setPastorName(pastorProfile?.full_name ?? null);

      await loadGoals(supabase, user.id);
      setLoading(false);
    })();
  }, [router]);

  const handleAddGoal = async () => {
    if (!newTitle.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('holistic_goals')
      .insert({ member_id: userId, title: newTitle.trim(), description: newDescription.trim() || null, created_by: userId })
      .select('id, title, description, status, progress, created_at')
      .single();
    if (data) setGoals((prev) => [data as Goal, ...prev]);
    setNewTitle('');
    setNewDescription('');
    setShowAdd(false);
    setSaving(false);
  };

  const handleProgressChange = async (goal: Goal, progress: number) => {
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, progress } : g));
    const supabase = createClient();
    await supabase.from('holistic_goals').update({ progress }).eq('id', goal.id);
  };

  const handleStatusChange = async (goal: Goal, status: Goal['status']) => {
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status } : g));
    const supabase = createClient();
    await supabase.from('holistic_goals').update({ status }).eq('id', goal.id);
  };

  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-skel" style={{ height: 26, width: 220, marginBottom: 20 }} />
        {[0, 1].map((i) => <div key={i} className="pf-skel" style={{ height: 90, borderRadius: 6, marginBottom: 10 }} />)}
      </div>
    );
  }

  return (
    <div className="pf-page">
      <div className="pf-head">
        <p className="pf-eyebrow">1:1</p>
        <h1 className="pf-title">Your Pastoral Care</h1>
        <p className="pf-sub">
          {pastorName
            ? `Walking with ${pastorName} toward all God has called you to become.`
            : "You haven't been assigned a 1:1 pastor yet — reach out and someone will connect with you."}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="pf-card-label" style={{ margin: 0 }}>Holistic Goals</p>
        <button className="pf-btn pf-btn--sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add Goal'}
        </button>
      </div>

      {showAdd && (
        <div className="pf-card" style={{ marginBottom: 14 }}>
          <input
            className="pf-input"
            placeholder="Goal — e.g. Grow in consistent prayer"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <textarea
            className="pf-input"
            placeholder="Any detail or context (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
            style={{ marginBottom: 12 }}
          />
          <button className="pf-btn pf-btn--sm" disabled={!newTitle.trim() || saving} onClick={handleAddGoal}>
            {saving ? 'Saving…' : 'Save Goal'}
          </button>
        </div>
      )}

      {goals.length === 0 && !showAdd && (
        <div className="pf-empty">
          <span className="pf-empty-icon">✦</span>
          No goals yet. Add the first thing you&apos;re believing God for.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map((g) => (
          <div key={g.id} className="pf-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--pf-text-bright)', fontFamily: 'var(--pf-serif)' }}>{g.title}</p>
              <select
                className="pf-input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: 11, minHeight: 'auto' }}
                value={g.status}
                onChange={(e) => handleStatusChange(g, e.target.value as Goal['status'])}
              >
                {(Object.keys(STATUS_LABEL) as Goal['status'][]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            {g.description && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--pf-text-soft)', lineHeight: 1.6 }}>{g.description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="pf-progress-bar" style={{ flex: 1 }}>
                <div className="pf-progress-bar-fill" style={{ width: `${g.progress}%` }} />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={g.progress}
                onChange={(e) => handleProgressChange(g, Number(e.target.value))}
                style={{ width: 90 }}
              />
              <span style={{ fontSize: 12, color: 'var(--pf-gold)', minWidth: 32, textAlign: 'right' }}>{g.progress}%</span>
            </div>
            {userId && <GoalComments goalId={g.id} currentUserId={userId} />}
          </div>
        ))}
      </div>
    </div>
  );
}
