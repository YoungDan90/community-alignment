'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DocumentCard, { DocRecord } from '@/components/documents/DocumentCard';
import UploadDocument from '@/components/documents/UploadDocument';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  card: '#0a1828', dark: '#0f1e2e', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', welcome: 'Welcome', discipleship: 'Discipleship',
  forms: 'Forms', leadership: 'Leadership', safeguarding: 'Safeguarding',
  finance: 'Finance', pastoral: 'Pastoral',
};

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPastor, setIsPastor] = useState(false);
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const loadDocuments = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('documents')
      .select('id, title, description, category, file_name, file_url, file_size, file_type, access_level, is_featured, download_count, created_at, uploader:uploaded_by(full_name)')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    setDocuments((data ?? []).map((d: {
      id: string; title: string; description: string | null; category: string;
      file_name: string; file_url: string; file_size: number | null; file_type: string | null;
      access_level: string; is_featured: boolean; download_count: number; created_at: string;
      uploader: { full_name: string | null }[] | { full_name: string | null } | null;
    }) => ({
      ...d,
      uploader: Array.isArray(d.uploader) ? (d.uploader[0] ?? null) : d.uploader,
    })));
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      setIsPastor(['pastor', 'admin'].includes(profile?.role ?? ''));
      await loadDocuments();
      setLoading(false);
    })();
  }, [router, loadDocuments]);

  const availableCategories = Array.from(new Set(documents.map(d => d.category)));

  const filtered = documents.filter(d => {
    const matchCat = categoryFilter === 'all' || d.category === categoryFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || (d.description ?? '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(d => d.is_featured);
  const rest = filtered.filter(d => !d.is_featured);

  const handleUpdated = (updated: Partial<DocRecord> & { id: string }) => {
    setDocuments(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
  };

  const handleDeleted = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  if (loading) return (
    <div className="pf-page">
      <div className="pf-skel" style={{ height: 26, width: 260, marginBottom: 20 }} />
      {[0, 1, 2].map((i) => <div key={i} className="pf-skel" style={{ height: 110, borderRadius: 6, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div className="pf-page">
      <div className="pf-head">
        <p className="pf-eyebrow">Church Resources</p>
        <h1 className="pf-title">Documents &amp; Resources</h1>
        <p className="pf-sub">Guides, forms, and materials for the Alignment Church community.</p>
      </div>

      {isPastor && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          className="pf-btn pf-btn--ghost"
          style={{ display: 'flex', width: '100%', marginBottom: 20 }}
        >
          + Upload Document
        </button>
      )}

      {showUpload && (
        <UploadDocument
          onClose={() => setShowUpload(false)}
          onUploaded={async () => { setShowUpload(false); await loadDocuments(); }}
        />
      )}

      {/* Search */}
      <label className="pf-label" htmlFor="doc-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search documents</label>
      <input
        id="doc-search"
        type="search"
        className="pf-input"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search documents…"
        style={{ marginBottom: 16 }}
      />

      {/* Category tabs */}
      {availableCategories.length > 0 && (
        <div className="pf-tabs" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCategoryFilter('all')}
            aria-pressed={categoryFilter === 'all'}
            className="pf-tabbtn"
            style={{ flexShrink: 0 }}
          >
            All
          </button>
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              aria-pressed={categoryFilter === cat}
              className="pf-tabbtn"
              style={{ flexShrink: 0 }}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-icon" aria-hidden="true">📂</span>
          {search ? 'No documents match your search.' : 'No documents available yet.'}
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && categoryFilter === 'all' && !search && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted }}>
                Featured
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {featured.map(doc => (
                  <DocumentCard key={doc.id} doc={doc} isPastor={isPastor} onDeleted={handleDeleted} onUpdated={handleUpdated} />
                ))}
              </div>
            </div>
          )}

          {/* All / filtered */}
          {rest.length > 0 && (
            <div>
              {featured.length > 0 && categoryFilter === 'all' && !search && (
                <p style={{ margin: '0 0 12px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted }}>
                  All Documents
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(categoryFilter !== 'all' || search ? filtered : rest).map(doc => (
                  <DocumentCard key={doc.id} doc={doc} isPastor={isPastor} onDeleted={handleDeleted} onUpdated={handleUpdated} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
