export default function PageSpinner() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <style>{`
        @keyframes spin-star { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <span
        style={{
          fontSize: 28,
          color: '#c6a75e',
          display: 'inline-block',
          animation: 'spin-star 2s linear infinite',
          opacity: 0.7,
        }}
      >
        ✦
      </span>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#c6a75e' }}>
        Community
      </p>
    </div>
  );
}
