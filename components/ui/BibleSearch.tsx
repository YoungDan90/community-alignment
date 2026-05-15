'use client';

import { useState, useCallback, useRef } from 'react';

export interface BibleVerse {
  reference: string;
  text: string;
  translation: string;
}

interface BibleSearchProps {
  onSelect?: (verse: BibleVerse) => void;
  defaultTranslation?: 'nkjv' | 'nlt';
}

const TRANSLATIONS: Array<'nkjv' | 'nlt'> = ['nkjv', 'nlt'];

export default function BibleSearch({
  onSelect,
  defaultTranslation = 'nkjv',
}: BibleSearchProps) {
  const [query, setQuery] = useState('');
  const [translation, setTranslation] = useState<'nkjv' | 'nlt'>(defaultTranslation);
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [selected, setSelected] = useState<BibleVerse | null>(null);
  const [opposite, setOpposite] = useState<BibleVerse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string, t: 'nkjv' | 'nlt') => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/bible/search?reference=${encodeURIComponent(q)}&translation=${t}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Search failed');
        setResults(data.results ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val, translation), 500);
  };

  const handleTranslation = (t: 'nkjv' | 'nlt') => {
    setTranslation(t);
    if (query.trim()) search(query, t);
    if (selected) fetchOpposite(selected, t);
  };

  const fetchOpposite = async (verse: BibleVerse, currentTranslation: 'nkjv' | 'nlt') => {
    const other = currentTranslation === 'nkjv' ? 'nlt' : 'nkjv';
    try {
      const res = await fetch(
        `/api/bible/verse?reference=${encodeURIComponent(verse.reference)}&translation=${other}`,
      );
      const data = await res.json();
      if (res.ok && data.verse) setOpposite(data.verse);
    } catch {
      setOpposite(null);
    }
  };

  const handleSelect = async (verse: BibleVerse) => {
    setSelected(verse);
    setResults([]);
    setQuery(verse.reference);
    onSelect?.(verse);
    await fetchOpposite(verse, translation);
  };

  const handleClear = () => {
    setSelected(null);
    setOpposite(null);
    setQuery('');
    setResults([]);
  };

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search by reference or keyword — e.g. Psalm 1:2"
            style={{
              flex: 1,
              background: '#0b1118',
              border: '1px solid #162030',
              borderRadius: 2,
              padding: '11px 14px',
              color: '#ddd0b8',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {/* Translation toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #162030',
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {TRANSLATIONS.map((t) => (
              <button
                key={t}
                onClick={() => handleTranslation(t)}
                style={{
                  padding: '8px 14px',
                  background: translation === t ? 'rgba(198,167,94,0.15)' : 'none',
                  border: 'none',
                  color: translation === t ? '#c6a75e' : '#3a5570',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown results */}
        {(results.length > 0 || loading) && !selected && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 52,
              background: '#0b1118',
              border: '1px solid #162030',
              borderTop: 'none',
              borderRadius: '0 0 2px 2px',
              zIndex: 100,
              maxHeight: 340,
              overflowY: 'auto',
            }}
          >
            {loading && (
              <div style={{ padding: '12px 16px', fontSize: 12, color: '#3a5570', fontStyle: 'italic' }}>
                Searching…
              </div>
            )}
            {results.map((v, i) => (
              <button
                key={i}
                onClick={() => handleSelect(v)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #162030',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0e1520')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <p style={{ margin: '0 0 3px', fontSize: 11, color: '#c6a75e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {v.reference} · {v.translation}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#ddd0b8', lineHeight: 1.6, fontStyle: 'italic' }}>
                  &ldquo;{v.text.slice(0, 120)}{v.text.length > 120 ? '…' : ''}&rdquo;
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#e08888', margin: '0 0 12px', fontStyle: 'italic' }}>
          {error}
        </p>
      )}

      {/* Side-by-side comparison */}
      {selected && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c6a75e' }}>
              {selected.reference}
            </p>
            <button
              onClick={handleClear}
              style={{ background: 'none', border: 'none', color: '#3a5570', fontSize: 11, cursor: 'pointer', letterSpacing: '0.08em' }}
            >
              × Clear
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: opposite ? '1fr 1fr' : '1fr', gap: 12 }}>
            {/* Primary translation */}
            <div
              style={{
                background: '#0b1118',
                border: '1px solid rgba(198,167,94,0.25)',
                borderLeft: '3px solid #c6a75e',
                borderRadius: '0 2px 2px 0',
                padding: '14px 16px',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c6a75e' }}>
                {selected.translation}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: '#ddd0b8', lineHeight: 1.8, fontStyle: 'italic' }}>
                &ldquo;{selected.text}&rdquo;
              </p>
            </div>

            {/* Opposite translation */}
            {opposite && (
              <div
                style={{
                  background: '#0b1118',
                  border: '1px solid #162030',
                  borderLeft: '3px solid #1e2e40',
                  borderRadius: '0 2px 2px 0',
                  padding: '14px 16px',
                }}
              >
                <p style={{ margin: '0 0 8px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a8aaa' }}>
                  {opposite.translation}
                </p>
                <p style={{ margin: 0, fontSize: 14, color: '#ddd0b8', lineHeight: 1.8, fontStyle: 'italic', opacity: 0.8 }}>
                  &ldquo;{opposite.text}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
