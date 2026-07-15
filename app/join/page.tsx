'use client';

import { useState } from 'react';
import Link from 'next/link';

const S = {
  font: { display: 'var(--font-cormorant), Georgia, serif', body: "var(--font-jost), 'Jost', sans-serif" },
  gold: '#c6a75e', goldDim: 'rgba(198,167,94,0.15)', goldBorder: 'rgba(198,167,94,0.25)',
  dark: '#0f1e2e', card: '#0a1828', border: '#1e3a52',
  text: '#ddd0b8', textLight: '#f0e8d4', soft: '#6a8aaa',
};

const HEARD_OPTIONS = [
  'A friend or family member',
  'Social media',
  'Online search',
  'Walked past / local',
  'An event',
  'Other',
];

const inputStyle: React.CSSProperties = {
  width: '100%', background: S.card, border: `1px solid ${S.border}`, borderRadius: 2,
  padding: '13px 14px', color: S.text, fontSize: 15, fontFamily: S.font.body,
  outline: 'none', minHeight: 44, boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
  color: S.soft, marginBottom: 6,
};

export default function JoinPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [heardVia, setHeardVia] = useState('');
  const [visited, setVisited] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [wantsCall, setWantsCall] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError('Please enter your name and email.'); return; }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          heardVia: heardVia || null,
          visited,
          message: message.trim() || null,
          wantsCall,
        }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Something went wrong.');
        setStatus('error');
      }
    } catch {
      setError('Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: S.dark,
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, #1e3a52 0%, transparent 55%)',
        padding: '40px 20px 64px',
        fontFamily: S.font.body,
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ margin: '0 0 6px', fontSize: 32, color: S.gold, fontFamily: S.font.display }}>✦</p>
          <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold }}>
            Alignment Church · Southend-on-Sea
          </p>
          <h1 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 'normal', color: S.textLight, fontFamily: S.font.display, lineHeight: 1.2 }}>
            Join Our Community
          </h1>
          <p style={{ margin: '0 auto', maxWidth: 400, fontSize: 14, color: S.soft, fontStyle: 'italic', lineHeight: 1.7 }}>
            Whether you&rsquo;re new to faith or looking for a spiritual home, there&rsquo;s a place for you here.
            Tell us a little about yourself and we&rsquo;ll be in touch.
          </p>
        </div>

        {status === 'success' ? (
          <div style={{ background: S.card, border: `1px solid ${S.goldBorder}`, borderRadius: 4, padding: '32px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />
            <p style={{ fontSize: 32, margin: '0 0 12px', color: S.gold }}>✦</p>
            <p style={{ color: S.textLight, fontSize: 18, margin: '0 0 10px', fontFamily: S.font.display }}>
              Thank you, {name.trim().split(' ')[0]}.
            </p>
            <p style={{ color: S.soft, fontSize: 14, margin: '0 0 24px', lineHeight: 1.7 }}>
              We&rsquo;ve received your details and someone from the church will reach out soon.
              We look forward to meeting you.
            </p>
            <Link href="/" style={{ color: S.gold, fontSize: 13, textDecoration: 'none', letterSpacing: '0.05em' }}>
              ← Back to the website
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 4, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${S.gold}, transparent)` }} />

            <div>
              <label style={labelStyle}>Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Phone <span style={{ color: S.soft, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44…" autoComplete="tel" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>How did you hear about us?</label>
              <select value={heardVia} onChange={(e) => setHeardVia(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select…</option>
                {HEARD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Have you visited a service before?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: true, l: 'Yes' }, { v: false, l: 'Not yet' }].map(({ v, l }) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setVisited(v)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 2, cursor: 'pointer',
                      background: visited === v ? S.goldDim : 'transparent',
                      border: `1px solid ${visited === v ? S.goldBorder : S.border}`,
                      color: visited === v ? S.gold : S.soft,
                      fontSize: 13, fontFamily: S.font.body, letterSpacing: '0.05em',
                      transition: 'all 0.2s',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Anything you&rsquo;d like us to know? <span style={{ color: S.soft, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="A prayer need, a question, or how we can help you get connected…"
                rows={4}
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.6, fontFamily: S.font.display, fontStyle: 'italic' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <button
                type="button"
                onClick={() => setWantsCall((v) => !v)}
                aria-pressed={wantsCall}
                style={{
                  width: 20, height: 20, borderRadius: 3, flexShrink: 0,
                  border: `1px solid ${wantsCall ? S.gold : S.border}`,
                  background: wantsCall ? S.goldDim : 'transparent',
                  color: S.gold, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {wantsCall ? '✓' : ''}
              </button>
              <span style={{ fontSize: 13, color: S.text }}>I&rsquo;d like someone to call me</span>
            </label>

            {error && <p style={{ margin: 0, fontSize: 12, color: '#e07070', fontStyle: 'italic' }}>{error}</p>}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                padding: '14px', background: status === 'loading' ? 'rgba(198,167,94,0.4)' : S.gold,
                border: 'none', borderRadius: 2, color: S.dark,
                fontSize: 14, fontWeight: 'bold', cursor: status === 'loading' ? 'wait' : 'pointer',
                fontFamily: S.font.body, letterSpacing: '0.08em', minHeight: 44, transition: 'all 0.2s',
              }}
            >
              {status === 'loading' ? 'Sending…' : 'Send My Details'}
            </button>

            <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: S.soft }}>
              <Link href="/" style={{ color: S.soft, textDecoration: 'none', letterSpacing: '0.05em' }}>
                ← Back to the website
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
