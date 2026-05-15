export interface WTWStage {
  id: string;
  label: string;
  icon: string;
}

interface ProgressTrackProps {
  stages: WTWStage[];
  currentStage: number;
}

const F = {
  body: "Georgia, 'Times New Roman', serif",
};

export default function ProgressTrack({ stages, currentStage }: ProgressTrackProps) {
  const progress =
    stages.length > 1 ? (currentStage / (stages.length - 1)) * 100 : 0;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Fill bar */}
      <div
        style={{
          height: 2,
          background: '#162030',
          borderRadius: 1,
          marginBottom: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#c6a75e',
            borderRadius: 1,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Stage dots */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {stages.map((s, i) => {
          const done = i < currentStage;
          const active = i === currentStage;
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1,
                  color: done ? '#5a8a5a' : active ? '#c6a75e' : '#3a5570',
                  transition: 'color 0.3s',
                }}
              >
                {done ? '✓' : s.icon}
              </span>
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: F.body,
                  color: active ? '#c6a75e' : '#3a5570',
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
