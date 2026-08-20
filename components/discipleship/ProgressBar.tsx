export default function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div>
      <div className="pf-progress-bar">
        <div className="pf-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--pf-text-soft)' }}>
        {completed} of {total} lessons complete
      </p>
    </div>
  );
}
