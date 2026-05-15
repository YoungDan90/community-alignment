'use client';

import { useState, useCallback, useRef } from 'react';

export interface BibleVerse {
  reference: string;
  text: string;
  translation: string;
}

interface BibleSearchProps {
  onSelect?: (verse: BibleVerse) => void;
  placeholder?: string;
}

export default function BibleSearch({
  onSelect,
  placeholder = 'Search by reference or keyword — e.g. Psalm 1:2',
}: BibleSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [pending, setPending] = useState<BibleVerse | null>(null);
  const [selected, setSelected] = useState<BibleVerse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bible/search?reference=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setPending(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleConfirm = () => {
    if (!pending) return;
    setSelected(pending);
    setResults([]);
    setQuery('');
    onSelect?.(pending);
  };

  const handleClear = () => {
    setSelected(null);
    setPending(null);
    setQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
  };

  const showDropdown = !selected && (loading || results.length > 0 || (searched && !loading));

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <style>{`
        @keyframes bible-search-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Search input */}
      {!selected && (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              background: '#0b1118',
              border: '1px solid #162030',
              borderRadius: 2,
              padding: '11px 14px',
              color: '#ddd0b8',
              fontSize: 14,
              outline: 'none',
              fontFamily: "Georgia, 'Times New Roman', serif",
              boxSizing: 'border-box',
            } as React.CSSProperties}
          />

          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#0b1118',
              border: '1px solid #162030',
              borderTop: 'none',
              borderRadius: '0 0 2px 2px',
              zIndex: 200,
              maxHeight: 320,
              overflowY: 'auto',
            } as React.CSSProperties}>
              {loading && (
                <div style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 12, color: '#c6a75e',
                    animation: 'bible-search-pulse 1.2s ease-in-out infinite',
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                  } as React.CSSProperties}>
                    ✦ Searching…
                  </span>
                </div>
              )}
              {!loading && searched && results.length === 0 && (
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#6a8aaa', fontStyle: 'italic' }}>
                    No results — try a different reference or keyword
                  </p>
                </div>
              )}
              {results.map((v, i) => {
                const isHighlighted = pending?.reference === v.reference;
                return (
                  <button
                    key={i}
                    onClick={() => setPending(isHighlighted ? null : v)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px 12px 13px',
                      background: isHighlighted ? 'rgba(198,167,94,0.06)' : 'none',
                      border: 'none',
                      borderBottom: '1px solid #162030',
                      borderLeft: isHighlighted ? '3px solid #c6a75e' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      boxSizing: 'border-box',
                      display: 'block',
                    } as React.CSSProperties}
                    onMouseEnter={(e) => { if (!isHighlighted) e.currentTarget.style.background = '#0e1622'; }}
                    onMouseLeave={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'none'; }}
                  >
                    <p style={{ margin: '0 0 3px', fontSize: 11, color: '#c6a75e', letterSpacing: '0.1em', textTransform: 'uppercase' } as React.CSSProperties}>
                      {v.reference}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: '#ddd0b8', lineHeight: 1.6, fontStyle: 'italic' }}>
                      &ldquo;{v.text.slice(0, 100)}{v.text.length > 100 ? '…' : ''}&rdquo;
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#e08888', margin: '0 0 10px', fontStyle: 'italic' }}>{error}</p>
      )}

      {/* Confirm button */}
      {pending && !selected && (
        <button
          onClick={handleConfirm}
          style={{
            width: '100%',
            padding: '11px 16px',
            background: '#c6a75e',
            border: 'none',
            borderRadius: 2,
            color: '#070c12',
            fontSize: 13,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: "Georgia, 'Times New Roman', serif",
            letterSpacing: '0.06em',
            marginBottom: 10,
            transition: 'opacity 0.2s',
          } as React.CSSProperties}
        >
          Confirm — {pending.reference}
        </button>
      )}

      {/* Confirmed verse card */}
      {selected && (
        <div style={{
          background: '#0b1118',
          border: '1px solid rgba(198,167,94,0.25)',
          borderLeft: '3px solid #c6a75e',
          borderRadius: '0 2px 2px 0',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c6a75e' } as React.CSSProperties}>
              {selected.reference}
            </p>
            <button
              onClick={handleClear}
              style={{ background: 'none', border: 'none', color: '#6a8aaa', fontSize: 11, cursor: 'pointer', padding: '0 0 0 8px', flexShrink: 0 }}
            >
              Change verse
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#ddd0b8', lineHeight: 1.8, fontStyle: 'italic' }}>
            &ldquo;{selected.text}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
