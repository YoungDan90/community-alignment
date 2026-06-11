'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

const CATEGORIES: Record<string, string> = {
  general: 'General', welcome: 'Welcome', discipleship: 'Discipleship',
  forms: 'Forms', leadership: 'Leadership', safeguarding: 'Safeguarding',
  finance: 'Finance', pastoral: 'Pastoral',
};

export interface DocRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  access_level: string;
  is_featured: boolean;
  download_count: number;
  created_at: string;
  uploader: { full_name: string | null } | null;
}

function fileIcon(fileType: string | null): { icon: string; color: string } {
  if (!fileType) return { icon: '📄', color: S.soft };
  if (fileType.includes('pdf')) return { icon: '📕', color: '#e05555' };
  if (fileType.includes('word') || fileType.includes('document')) return { icon: '📘', color: '#5588e0' };
  if (fileType.includes('sheet') || fileType.includes('excel')) return { icon: '📗', color: '#55a055' };
  if (fileType.includes('image')) return { icon: '🖼️', color: '#55a0c0' };
  return { icon: '📄', color: S.soft };
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORIES_LIST = [
  { value: 'general', label: 'General' }, { value: 'welcome', label: 'Welcome' },
  { value: 'discipleship', label: 'Discipleship' }, { value: 'forms', label: 'Forms' },
  { value: 'leadership', label: 'Leadership' }, { value: 'safeguarding', label: 'Safeguarding' },
  { value: 'finance', label: 'Finance' }, { value: 'pastoral', label: 'Pastoral' },
];

const ACCESS_LEVELS = [
  { value: 'all', label: 'All' }, { value: 'members', label: 'Members' },
  { value: 'leaders', label: 'Leaders' }, { value: 'pastor', label: 'Pastor only' },
];

interface Props {
  doc: DocRecord;
  isPastor: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (updated: Partial<DocRecord> & { id: string }) => void;
}

export default function DocumentCard({ doc, isPastor, onDeleted, onUpdated }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editTitle, setEditTitle] = useState(doc.title);
  const [editDesc, setEditDesc] = useState(doc.description ?? '');
  const [editCategory, setEditCategory] = useState(doc.category);
  const [editAccess, setEditAccess] = useState(doc.access_level);
  const [editFeatured, setEditFeatured] = useState(doc.is_featured);
  const [saving, setSaving] = useState(false);

  const { icon } = fileIcon(doc.file_type);
  const isPlaceholder = doc.file_url === 'placeholder';

  const handleDownload = async () => {
    if (isPlaceholder) return;
    setDownloading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Derive storage path from file_url or file_name
    const storagePath = doc.file_url.includes('/storage/') ? doc.file_url.split('/storage/v1/object/public/documents/')[1] : doc.file_url;

    const { data: signedData } = await supabase.storage.from('documents').createSignedUrl(storagePath, 60);
    if (signedData?.signedUrl) {
      window.open(signedData.signedUrl, '_blank');
    } else {
      window.open(doc.file_url, '_blank');
    }

    if (user) {
      await supabase.from('document_downloads').insert({ document_id: doc.id, user_id: user.id });
      await supabase.from('documents').update({ download_count: doc.download_count + 1 }).eq('id', doc.id);
      onUpdated({ id: doc.id, download_count: doc.download_count + 1 });
    }
    setDownloading(false);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('documents').update({
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      category: editCategory,
      access_level: editAccess,
      is_featured: editFeatured,
      updated_at: new Date().toISOString(),
    }).eq('id', doc.id);
    onUpdated({ id: doc.id, title: editTitle.trim(), description: editDesc.trim() || null, category: editCategory, access_level: editAccess, is_featured: editFeatured });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    const supabase = createClient();
    const storagePath = doc.file_url.includes('/storage/') ? doc.file_url.split('/storage/v1/object/public/documents/')[1] : null;
    if (storagePath && !isPlaceholder) {
      await supabase.storage.from('documents').remove([storagePath]);
    }
    await supabase.from('documents').delete().eq('id', doc.id);
    onDeleted(doc.id);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.dark, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '7px 10px', color: S.text, fontSize: 12, fontFamily: S.font.body,
    boxSizing: 'border-box', outline: 'none',
  };

  if (editing) {
    return (
      <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: '14px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" style={inputStyle} />
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2} style={{ ...inputStyle, resize: 'none' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES_LIST.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={editAccess} onChange={e => setEditAccess(e.target.value)} style={inputStyle}>
              {ACCESS_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setEditFeatured(f => !f)}
              style={{
                position: 'relative', width: 32, height: 18, flexShrink: 0,
                background: editFeatured ? S.gold : S.border, border: 'none', borderRadius: 9,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <span style={{ position: 'absolute', top: 1, left: editFeatured ? 15 : 1, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
            <span style={{ fontSize: 11, color: S.text }}>Featured</span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '6px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2, color: S.gold, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: S.card,
      border: `1px solid ${doc.is_featured ? S.gold + '55' : S.border}`,
      borderRadius: 3, padding: '14px 16px', position: 'relative',
    }}>
      {doc.is_featured && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}88, transparent)` }} />
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 2,
              background: S.goldDim, color: S.gold, border: `1px solid ${S.goldBorder}`,
            }}>
              {CATEGORIES[doc.category] ?? doc.category}
            </span>
            {doc.is_featured && <span style={{ fontSize: 10 }}>⭐</span>}
            {isPlaceholder && (
              <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 2, background: 'rgba(100,100,100,0.2)', color: S.soft, border: `1px solid ${S.border}` }}>
                File not yet uploaded
              </span>
            )}
          </div>

          <p style={{ margin: '0 0 3px', fontSize: 15, color: S.textLight, fontFamily: S.font.display }}>{doc.title}</p>

          {doc.description && (
            <p style={{ margin: '0 0 6px', fontSize: 12, color: S.text, lineHeight: 1.5 }}>{doc.description}</p>
          )}

          <p style={{ margin: '0 0 10px', fontSize: 11, color: S.soft }}>
            {doc.uploader?.full_name ?? 'Church'}
            {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
            {' · '}{new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {doc.download_count > 0 ? ` · ${doc.download_count} download${doc.download_count !== 1 ? 's' : ''}` : ''}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleDownload}
              disabled={downloading || isPlaceholder}
              style={{
                padding: '7px 16px', background: isPlaceholder ? 'transparent' : S.goldDim,
                border: `1px solid ${isPlaceholder ? S.border : S.goldBorder}`,
                borderRadius: 2, color: isPlaceholder ? S.soft : S.gold,
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: (downloading || isPlaceholder) ? 'not-allowed' : 'pointer',
                fontFamily: S.font.body, opacity: downloading ? 0.6 : 1,
              }}
            >
              {downloading ? 'Opening…' : isPlaceholder ? 'No file yet' : '↓ Download'}
            </button>

            {isPastor && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: S.font.body }}
                >
                  Edit
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: '#c47a7a', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: S.font.body }}
                  >
                    Delete
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#c47a7a' }}>Confirm?</span>
                    <button onClick={handleDelete} style={{ padding: '5px 12px', background: 'rgba(224,85,85,0.15)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 2, color: '#e05555', fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>Yes</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: '5px 10px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.soft, fontSize: 10, cursor: 'pointer', fontFamily: S.font.body }}>No</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
