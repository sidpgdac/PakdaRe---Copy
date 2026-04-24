export default function ModeBanner({ mode, setMode }) {
  return (
    <div className={`mode-banner ${mode}`}>
      <span>
        {mode === 'demo'
          ? '🧪 Demo Data — Showing sample complaints for visualization'
          : '🔴 Real Data — Connected to Supabase database'}
      </span>
      <button
        className={`mode-btn ${mode === 'demo' ? 'active' : ''}`}
        onClick={() => setMode('demo')}
      >
        🧪 Demo Data
      </button>
      <button
        className={`mode-btn ${mode === 'real' ? 'active' : ''}`}
        onClick={() => setMode('real')}
      >
        🔴 Real Data
      </button>
    </div>
  );
}
