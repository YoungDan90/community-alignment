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

type Mode = 'browse' | 'search';

const BIBLE_BOOKS: { name: string; chapters: number }[] = [
  { name: 'Genesis', chapters: 50 }, { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 }, { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 }, { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 }, { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 }, { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 }, { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 }, { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 }, { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 }, { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 }, { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 }, { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 }, { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 }, { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 }, { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 }, { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 }, { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 }, { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 }, { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 }, { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 }, { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 }, { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 }, { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 }, { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 }, { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 }, { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 }, { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 }, { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 }, { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 }, { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 }, { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 }, { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 }, { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
];

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a1828',
  border: '1px solid #1e3a52',
  borderRadius: 2,
  padding: '10px 14px',
  color: '#ddd0b8',
  fontSize: 14,
  outline: 'none',
  cursor: 'pointer',
  fontFamily: "var(--font-jost), 'Jost', sans-serif",
  colorScheme: 'dark',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c6a75e'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

export default function BibleSearch({
  onSelect,
  placeholder = 'Search by reference or keyword — e.g. Psalm 1:2',
}: BibleSearchProps) {
  const [mode, setMode] = useState<Mode>('browse');

  // Browse state
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNum, setVerseNum] = useState('');
  const [chapterVerses, setChapterVerses] = useState<{ num: number; text: string }[]>([]);
  const [loadingChapter, setLoadingChapter] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Shared
  const [pending, setPending] = useState<BibleVerse | null>(null);
  const [selected, setSelected] = useState<BibleVerse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bookData = BIBLE_BOOKS.find((b) => b.name === book);

  // ── Browse ──────────────────────────────────────────────────────
  const fetchChapter = useCallback(async (bookName: string, chapterNum: string) => {
    if (!bookName || !chapterNum) return;
    setLoadingChapter(true);
    setChapterVerses([]);
    setVerseNum('');
    setPending(null);
    setError(null);
    try {
      const ref = `${bookName} ${chapterNum}`;
      const res = await fetch(`/api/bible/search?reference=${encodeURIComponent(ref)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load chapter');
      const verses = (data.results ?? []).map((v: BibleVerse) => ({
        num: parseInt(v.reference.split(':')[1] ?? '1'),
        text: v.text,
      }));
      setChapterVerses(verses);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chapter');
    } finally {
      setLoadingChapter(false);
    }
  }, []);

  const handleBookChange = (val: string) => {
    setBook(val);
    setChapter('');
    setVerseNum('');
    setChapterVerses([]);
    setPending(null);
  };

  const handleChapterChange = (val: string) => {
    setChapter(val);
    setVerseNum('');
    setPending(null);
    if (val) fetchChapter(book, val);
  };

  const handleVerseChange = (val: string) => {
    setVerseNum(val);
    const v = chapterVerses.find((cv) => cv.num === parseInt(val));
    if (v) {
      setPending({ reference: `${book} ${chapter}:${val}`, text: v.text, translation: 'KJV' });
    }
  };

  // ── Search ──────────────────────────────────────────────────────
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

  // ── Shared ──────────────────────────────────────────────────────
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
    setBook(''); setChapter(''); setVerseNum(''); setChapterVerses([]);
    setQuery(''); setResults([]); setSearched(false);
    setError(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setPending(null);
    setError(null);
  };

  const showSearchDropdown = mode === 'search' && !selected && (loading || results.length > 0 || (searched && !loading));

  // ── Confirmed verse — same for both modes ───────────────────────
  if (selected) {
    return (
      <div style={{
        background: '#0a1828', border: '1px solid rgba(198,167,94,0.25)',
        borderLeft: '3px solid #c6a75e', borderRadius: '0 2px 2px 0', padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c6a75e' } as React.CSSProperties}>
            {selected.reference}
          </p>
          <button onClick={handleClear} style={{ background: 'none', border: 'none', color: '#6a8aaa', fontSize: 11, cursor: 'pointer', padding: '0 0 0 8px' }}>
            Change verse
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#ddd0b8', lineHeight: 1.8, fontStyle: 'italic' }}>
          &ldquo;{selected.text}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif" }}>
      <style>{`
        @keyframes bible-search-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .bible-select option { background: #0a1828; color: #ddd0b8; }
      `}</style>

      {/* Mode tabs */}
      <div style={{ display: 'flex', marginBottom: 14, border: '1px solid #1e3a52', borderRadius: 2, overflow: 'hidden' }}>
        {(['browse', 'search'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '9px',
              background: mode === m ? 'rgba(198,167,94,0.12)' : 'transparent',
              border: 'none',
              borderRight: m === 'browse' ? '1px solid #1e3a52' : 'none',
              color: mode === m ? '#c6a75e' : '#6a8aaa',
              fontSize: 11, cursor: 'pointer',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              fontFamily: "var(--font-jost), 'Jost', sans-serif",
              transition: 'all 0.15s',
            } as React.CSSProperties}
          >
            {m === 'browse' ? '◈ Browse' : '✦ Search'}
          </button>
        ))}
      </div>

      {/* ── Browse mode ── */}
      {mode === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Book */}
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a8aaa', marginBottom: 6 } as React.CSSProperties}>
              Book
            </label>
            <select
              value={book}
              onChange={(e) => handleBookChange(e.target.value)}
              className="bible-select"
              style={selectStyle}
            >
              <option value="">Select a book…</option>
              <option value="" disabled style={{ color: '#c6a75e', fontSize: 10 }}>── Old Testament ──</option>
              {BIBLE_BOOKS.slice(0, 39).map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
              <option value="" disabled style={{ color: '#c6a75e', fontSize: 10 }}>── New Testament ──</option>
              {BIBLE_BOOKS.slice(39).map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Chapter */}
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a8aaa', marginBottom: 6 } as React.CSSProperties}>
              Chapter
            </label>
            <select
              value={chapter}
              onChange={(e) => handleChapterChange(e.target.value)}
              disabled={!book}
              className="bible-select"
              style={{ ...selectStyle, opacity: book ? 1 : 0.4 }}
            >
              <option value="">{book ? 'Select a chapter…' : '—'}</option>
              {bookData && Array.from({ length: bookData.chapters }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
          </div>

          {/* Verse */}
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a8aaa', marginBottom: 6 } as React.CSSProperties}>
              Verse
            </label>
            {loadingChapter ? (
              <div style={{ padding: '10px 14px', border: '1px solid #1e3a52', borderRadius: 2 }}>
                <span style={{ fontSize: 12, color: '#c6a75e', animation: 'bible-search-pulse 1.2s ease-in-out infinite', letterSpacing: '0.15em', textTransform: 'uppercase' } as React.CSSProperties}>
                  ✦ Loading verses…
                </span>
              </div>
            ) : (
              <select
                value={verseNum}
                onChange={(e) => handleVerseChange(e.target.value)}
                disabled={chapterVerses.length === 0}
                className="bible-select"
                style={{ ...selectStyle, opacity: chapterVerses.length > 0 ? 1 : 0.4 }}
              >
                <option value="">{chapterVerses.length > 0 ? 'Select a verse…' : chapter ? '—' : '—'}</option>
                {chapterVerses.map((v) => (
                  <option key={v.num} value={String(v.num)}>
                    {v.num} — {v.text.slice(0, 60)}{v.text.length > 60 ? '…' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Preview card when verse selected (pre-confirm) */}
          {pending && (
            <div style={{
              background: '#0f1e2e', border: '1px solid rgba(198,167,94,0.2)',
              borderLeft: '2px solid #c6a75e', borderRadius: '0 2px 2px 0', padding: '12px 14px',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, color: '#c6a75e', letterSpacing: '0.12em', textTransform: 'uppercase' } as React.CSSProperties}>
                {pending.reference}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#ddd0b8', lineHeight: 1.7, fontStyle: 'italic' }}>
                &ldquo;{pending.text}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Search mode ── */}
      {mode === 'search' && (
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={placeholder}
            autoFocus
            style={{
              width: '100%', background: '#0a1828', border: '1px solid #1e3a52',
              borderRadius: 2, padding: '11px 14px', color: '#ddd0b8', fontSize: 14,
              outline: 'none', fontFamily: "var(--font-jost), 'Jost', sans-serif",
              boxSizing: 'border-box',
            } as React.CSSProperties}
          />

          {showSearchDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#0a1828', border: '1px solid #1e3a52',
              borderTop: 'none', borderRadius: '0 0 2px 2px',
              zIndex: 200, maxHeight: 300, overflowY: 'auto',
            } as React.CSSProperties}>
              {loading && (
                <div style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, color: '#c6a75e', animation: 'bible-search-pulse 1.2s ease-in-out infinite', letterSpacing: '0.2em', textTransform: 'uppercase' } as React.CSSProperties}>
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
                      width: '100%', textAlign: 'left', padding: '12px 16px 12px 13px',
                      background: isHighlighted ? 'rgba(198,167,94,0.06)' : 'none',
                      border: 'none', borderBottom: '1px solid #1e3a52',
                      borderLeft: isHighlighted ? '3px solid #c6a75e' : '3px solid transparent',
                      cursor: 'pointer', transition: 'background 0.15s',
                      boxSizing: 'border-box', display: 'block',
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
        <p style={{ fontSize: 12, color: '#e08888', margin: '10px 0 0', fontStyle: 'italic' }}>{error}</p>
      )}

      {/* Confirm button */}
      {pending && (
        <button
          onClick={handleConfirm}
          style={{
            width: '100%', marginTop: 12, padding: '11px 16px',
            background: '#c6a75e', border: 'none', borderRadius: 2,
            color: '#0f1e2e', fontSize: 13, fontWeight: 'bold',
            cursor: 'pointer', fontFamily: "var(--font-jost), 'Jost', sans-serif",
            letterSpacing: '0.06em', transition: 'opacity 0.2s',
          } as React.CSSProperties}
        >
          Confirm — {pending.reference}
        </button>
      )}
    </div>
  );
}
