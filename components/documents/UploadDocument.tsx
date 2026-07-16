'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

const CATEGORIES = [
  { value: 'general',      label: 'General' },
  { value: 'welcome',      label: 'Welcome' },
  { value: 'discipleship', label: 'Discipleship' },
  { value: 'forms',        label: 'Forms' },
  { value: 'leadership',   label: 'Leadership' },
  { value: 'safeguarding', label: 'Safeguarding' },
  { value: 'finance',      label: 'Finance' },
  { value: 'pastoral',     label: 'Pastoral' },
];

const ACCESS_LEVELS = [
  { value: 'all',     label: 'All (including visitors)' },
  { value: 'members', label: 'Members' },
  { value: 'leaders', label: 'Leaders only' },
  { value: 'pastor',  label: 'Pastor only' },
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadDocument({ onClose, onUploaded }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [accessLevel, setAccessLevel] = useState('members');
  const [isFeatured, setIsFeatured] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { setError('File is too large. Maximum size is 10 MB.'); return; }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }
    setUploading(true);
    setError('');
    setProgress(10);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setUploading(false); return; }
    const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).maybeSingle();

    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${title.trim().replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    const storagePath = `${profile?.church_id ?? 'shared'}/${fileName}`;

    setProgress(30);

    const { error: storageErr } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (storageErr) {
      setError(`Upload failed: ${storageErr.message}`);
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(70);

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

    const { error: dbErr } = await supabase.from('documents').insert({
      church_id: profile?.church_id,
      uploaded_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      access_level: accessLevel,
      is_featured: isFeatured,
      file_name: file.name,
      file_url: urlData.publicUrl || storagePath,
      file_size: file.size,
      file_type: file.type,
    });

    if (dbErr) {
      setError('File uploaded but failed to save record. Contact support.');
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(100);
    setTimeout(() => { setUploading(false); onUploaded(); }, 400);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };


  return (
    <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 3, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, fontFamily: S.font.body }}>
          Upload Document
        </p>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: S.soft, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* File picker */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? S.goldBorder : S.border}`, borderRadius: 3,
            padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
            background: file ? S.goldDim : 'transparent', transition: 'all 0.2s',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {file ? (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 14, color: S.textLight, fontFamily: S.font.display }}>{file.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: S.soft }}>{formatSize(file.size)} · {file.type || 'unknown type'}</p>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: S.text }}>Click to select a file</p>
              <p style={{ margin: 0, fontSize: 11, color: S.soft }}>PDF, Word, Excel, images — max 10 MB</p>
            </div>
          )}
        </div>

        <div>
          <label className="pf-label" htmlFor="doc-title">Title</label>
          <input id="doc-title" className="pf-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
        </div>

        <div>
          <label className="pf-label" htmlFor="doc-desc">Description <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <textarea
            id="doc-desc"
            className="pf-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="pf-label" htmlFor="doc-category">Category</label>
            <select id="doc-category" className="pf-input" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="pf-label" htmlFor="doc-access">Access</label>
            <select id="doc-access" className="pf-input" value={accessLevel} onChange={e => setAccessLevel(e.target.value)}>
              {ACCESS_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setIsFeatured(f => !f)}
            style={{
              position: 'relative', width: 36, height: 20,
              background: isFeatured ? S.gold : S.border, border: 'none', borderRadius: 10,
              cursor: 'pointer', transition: 'background 0.25s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: isFeatured ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.25s',
            }} />
          </button>
          <span style={{ fontSize: 12, color: S.text, fontFamily: S.font.body }}>Feature on Resources page</span>
        </div>

        {uploading && (
          <div>
            <div style={{ background: S.border, borderRadius: 4, overflow: 'hidden', height: 4 }}>
              <div style={{ height: '100%', background: S.gold, width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: S.soft, textAlign: 'center' }}>{progress < 100 ? 'Uploading…' : 'Complete'}</p>
          </div>
        )}

        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--pf-danger)' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="pf-btn pf-btn--quiet">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || !file} className="pf-btn">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
