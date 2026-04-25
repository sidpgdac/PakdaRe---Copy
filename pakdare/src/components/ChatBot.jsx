import { useState, useRef, useEffect } from 'react';
import { timeAgo } from '../utils/dateHelper';

const SEV_ICON = { critical: '🔴', severe: '🟠', moderate: '🟡', minor: '🟢' };

const GREETINGS = [
  'Hello! I\'m your BMC Health Assistant. How can I help you today?',
  'You can ask me about complaints, ward risks, or file a new report.',
];

const QUICK_ACTIONS = [
  { icon: '📋', label: 'View complaints', key: 'complaints' },
  { icon: '🗺️', label: 'Map hotspots',   key: 'map' },
  { icon: '➕', label: 'File a report',   key: 'report' },
  { icon: '📊', label: 'Dashboard',       key: 'dashboard' },
];

export default function ChatBot({ onOpenReport }) {
  const [open, setOpen]     = useState(false);
  const [input, setInput]   = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: GREETINGS[0] },
    { role: 'bot', text: GREETINGS[1] },
  ]);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const lower = text.toLowerCase();
      let reply = 'I can help you with complaints, ward data, and reports. Try asking about a specific ward or type of issue!';

      if (lower.includes('report') || lower.includes('file')) {
        reply = 'Tap "File a Report" in the nav or I can open the form for you.';
        onOpenReport();
      } else if (lower.includes('dengue') || lower.includes('malaria')) {
        reply = '🦟 Vector-borne diseases like dengue and malaria are actively tracked across all 26 wards. Check the Map page for hot zones.';
      } else if (lower.includes('water')) {
        reply = '💧 Water contamination complaints are routed to the Hydraulic Engineer and DMO. Go to Complaints → 💧 Water filter.';
      } else if (lower.includes('hi') || lower.includes('hello')) {
        reply = 'Hi there! 👋 I\'m the BMC Health Assistant. Ask me about ward data, complaints, or how to file a report.';
      }

      setMessages(m => [...m, { role: 'bot', text: reply }]);
    }, 1200);
  };

  const handleQuick = (key) => {
    if (key === 'report') { onOpenReport(); setOpen(false); }
    else sendMessage(`Tell me about ${key}`);
  };

  return (
    <>
      {/* FAB Button — directly opens Report modal */}
      <button
        className="cb-btn"
        onClick={() => { onOpenReport(); }}
        title="File a Report"
        id="chatbot-fab"
        aria-label="File a Report"
      >
        <span className="cb-icon" style={{ fontSize: 26 }}>📝</span>
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="cb-panel" id="chatbot-panel">
          {/* Header */}
          <div className="cb-hdr">
            <div className="cb-hdr-l">
              <div className="cb-avatar">🤖</div>
              <div>
                <div className="cb-name">BMC Health Assistant</div>
                <div className="cb-status"><div className="cb-dot" /> Online · AI Powered</div>
              </div>
            </div>
            <button className="cb-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="cb-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className="cb-msg" style={m.role === 'user' ? { flexDirection: 'row-reverse' } : {}}>
                {m.role === 'bot' && <div className="cb-msg-avatar">🤖</div>}
                <div
                  className="cb-bubble"
                  style={m.role === 'user' ? {
                    background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)',
                    borderRadius: '16px 4px 16px 16px', color: 'var(--text-primary)',
                  } : {}}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="cb-msg">
                <div className="cb-msg-avatar">🤖</div>
                <div className="cb-bubble cb-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {/* Quick action chips (after greeting) */}
            {messages.length === 2 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 38 }}>
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.key}
                    onClick={() => handleQuick(a.key)}
                    style={{
                      background: 'var(--glass-bg2)', border: '1px solid var(--border2)',
                      borderRadius: 'var(--r-full)', padding: '5px 12px',
                      fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all .2s',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.color = 'var(--blue2)'; }}
                    onMouseLeave={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--text-secondary)'; }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="cb-input-row">
            <input
              className="cb-input"
              placeholder="Ask about wards, disease data, reports…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              id="chatbot-input"
            />
            <button
              className="cb-clear"
              onClick={() => sendMessage(input)}
              title="Send"
              style={{ background: 'var(--blue)', color: '#fff', borderColor: 'transparent' }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
