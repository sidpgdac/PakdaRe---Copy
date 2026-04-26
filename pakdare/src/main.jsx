import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './i18n.js'
import './index.css'
import './mobile-fixes.css'
import './advanced-ui.css'
import App from './App.jsx'

// ── Sentry Error Tracking ─────────────────────────────────────────────
// Replace VITE_SENTRY_DSN in .env with your real DSN from sentry.io
// To get a DSN: sentry.io → New Project → React → copy DSN
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE,
  // Only send errors in production; skip in dev to avoid noise
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Capture 10% of sessions, 100% of sessions with errors
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
      // Mask all text & inputs for privacy (citizen PII protection)
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 0.2,
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Sentry.ErrorBoundary catches any crash not caught by app-level ErrorBoundary */}
    <Sentry.ErrorBoundary
      fallback={
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#080d1f', color: '#fff', fontFamily: 'sans-serif', gap: 16
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: 14, opacity: 0.6 }}>The error has been reported. Please refresh to continue.</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '12px 28px', borderRadius: 999,
              background: '#0051bb', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
