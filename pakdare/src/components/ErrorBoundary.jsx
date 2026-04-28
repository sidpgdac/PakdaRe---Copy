import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev; Sentry picks it up in prod via main.jsx ErrorBoundary
    if (import.meta.env.DEV) {
      console.error('[PakdaRe] Page error:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, textAlign: 'center', gap: 16 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 360 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
