'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "Georgia, 'Times New Roman', serif" },
  gold: '#c6a75e', dark: '#070c12', card: '#0b1118', border: '#162030',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#3a5570',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: S.dark,
        backgroundImage: 'radial-gradient(ellipse at 50% 30%, #0f1e2e 0%, transparent 60%)',
        padding: '24px 20px',
        fontFamily: S.font.body,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ margin: '0 0 4px', fontSize: 32, color: S.gold, fontFamily: S.font.display }}>✦</p>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display }}>
            Community
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: S.soft, fontStyle: 'italic', letterSpacing: '0.1em' }}>
            Alignment Church
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            style={{
              background: S.card, border: `1px solid ${S.border}`, borderRadius: 2,
              padding: '13px 14px', color: S.text, fontSize: 15, fontFamily: S.font.body,
              outline: 'none', minHeight: 44,
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            style={{
              background: S.card, border: `1px solid ${S.border}`, borderRadius: 2,
              padding: '13px 14px', color: S.text, fontSize: 15, fontFamily: S.font.body,
              outline: 'none', minHeight: 44,
            }}
          />

          {error && (
            <p style={{ margin: 0, fontSize: 12, color: '#e07070', fontStyle: 'italic' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px', background: loading ? 'rgba(198,167,94,0.4)' : S.gold,
              border: 'none', borderRadius: 2, color: S.dark,
              fontSize: 14, fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer',
              fontFamily: S.font.body, letterSpacing: '0.08em', minHeight: 44,
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: S.soft }}>
          No account?{' '}
          <Link href="/signup" style={{ color: S.gold, textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
