'use client';

export default function PageError({ reset }: { reset?: () => void }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        fontFamily: "var(--font-jost), 'Jost', sans-serif",
      }}
    >
      <span style={{ fontSize: 32, color: '#c6a75e', marginBottom: 16 }}>✦</span>
      <h2
        style={{
          margin: '0 0 8px',
          fontSize: 20,
          fontWeight: 'normal',
          color: '#f0e8d4',
          fontFamily: 'var(--font-cormorant), Georgia, serif',
        }}
      >
        Something went wrong
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6a8aaa', fontStyle: 'italic' }}>
        An unexpected error occurred. Your data is safe.
      </p>
      {reset && (
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            background: '#c6a75e',
            border: 'none',
            borderRadius: 2,
            color: '#0f1e2e',
            fontSize: 13,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: "var(--font-jost), 'Jost', sans-serif",
            letterSpacing: '0.06em',
            minHeight: 44,
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
