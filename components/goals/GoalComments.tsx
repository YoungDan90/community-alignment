'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: { full_name: string | null } | { full_name: string | null }[] | null;
}

export default function GoalComments({ goalId, currentUserId }: { goalId: string; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const loadComments = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('goal_comments')
      .select('id, content, created_at, author_id, author:author_id(full_name)')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: true });
    setComments((data as unknown as Comment[]) ?? []);
    setLoaded(true);
  };

  useEffect(() => {
    if (open && !loaded) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('goal_comments')
      .insert({ goal_id: goalId, author_id: currentUserId, content: newComment.trim() })
      .select('id, content, created_at, author_id, author:author_id(full_name)')
      .single();
    if (data) setComments((prev) => [...prev, data as unknown as Comment]);
    setNewComment('');
    setPosting(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('goal_comments').delete().eq('id', id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--pf-border)', paddingTop: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'none', border: 'none', color: 'var(--pf-gold)', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, fontFamily: "var(--font-jost), 'Jost', sans-serif" }}
      >
        {open ? '↑ Hide notes' : `✎ Notes${comments.length > 0 ? ` (${comments.length})` : ''}`}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {loaded && comments.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--pf-text-soft)', fontStyle: 'italic', margin: '0 0 10px' }}>
              No notes yet — leave a word of encouragement or a question.
            </p>
          )}
          {comments.map((c) => {
            const author = Array.isArray(c.author) ? c.author[0] : c.author;
            const mine = c.author_id === currentUserId;
            return (
              <div key={c.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-text-bright)', lineHeight: 1.6 }}>{c.content}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--pf-text-soft)' }}>
                    {author?.full_name ?? 'Someone'} · {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {mine && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--pf-text-soft)', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              className="pf-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a note of encouragement…"
              onKeyDown={(e) => { if (e.key === 'Enter') handlePost(); }}
              style={{ flex: 1 }}
            />
            <button className="pf-btn pf-btn--sm" disabled={!newComment.trim() || posting} onClick={handlePost}>
              {posting ? '…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
