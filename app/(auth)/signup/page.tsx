'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', dark: '#0f1e2e', card: '#0a1828', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa', muted: '#c6a75e',
};

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    // Insert profile row — church_id hardcoded to Alignment Church
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        role: 'member',
        church_id: '9bd327b2-b4f5-4b26-aeb0-c3b723e6e205',
      });
    }

    router.push('/onboarding');
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
            Join Community
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: S.soft, fontStyle: 'italic', letterSpacing: '0.1em' }}>
            Alignment Church
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            required
            style={{
              background: S.card, border: `1px solid ${S.border}`, borderRadius: 2,
              padding: '13px 14px', color: S.text, fontSize: 15, fontFamily: S.font.body,
              outline: 'none', minHeight: 44,
            }}
          />
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
            placeholder="Password (min. 6 characters)"
            autoComplete="new-password"
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
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: S.soft }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: S.gold, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
        <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: S.soft }}>
          <Link href="/" style={{ color: S.soft, textDecoration: 'none', letterSpacing: '0.05em' }}>
            ← Back to website
          </Link>
        </p>
      </div>
    </main>
  );
}
