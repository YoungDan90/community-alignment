interface SelahTimerProps {
  duration: number;  // total seconds
  timeLeft: number;  // remaining seconds
}

export default function SelahTimer({ duration, timeLeft }: SelahTimerProps) {
  const progress = duration > 0 ? (duration - timeLeft) / duration : 0;
  const r = 82;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <svg
        width="200"
        height="200"
        style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
      >
        <circle cx="100" cy="100" r={r} fill="none" stroke="#162030" strokeWidth="2" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="#c6a75e"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 36,
            color: '#f0e8d4',
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          {mm}:{ss}
        </span>
        <span
          style={{
            fontSize: 10,
            color: '#3a5570',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          remaining
        </span>
      </div>
    </div>
  );
}
