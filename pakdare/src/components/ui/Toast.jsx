import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, showToast };
}

const ICONS = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };

export function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap" role="alert" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{ICONS[t.type] || ICONS.info}</span>
          <span style={{ flex: 1 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
