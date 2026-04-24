import { useState, useRef, useEffect } from 'react';

/**
 * BeforeAfterSlider — interactive drag-to-compare image comparison
 * Props: beforeSrc, afterSrc, height (px, default 240)
 */
export default function BeforeAfterSlider({ beforeSrc, afterSrc, height = 240 }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const updatePos = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPos((x / rect.width) * 100);
  };

  const onPointerDown = (e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); };
  const onPointerMove = (e) => { if (dragging.current) updatePos(e.clientX); };
  const onPointerUp   = () => { dragging.current = false; };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', width: '100%', height, overflow: 'hidden',
        borderRadius: 'var(--r16)', border: '1px solid var(--border2)',
        cursor: 'col-resize', userSelect: 'none', touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* AFTER (full width, underneath) */}
      <img
        src={afterSrc || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIj48cmVjdCBmaWxsPSIjMGYxNjMyIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiMzNGQzOTkiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BZnRlciBQaG90byBQZW5kaW5nPC90ZXh0Pjwvc3ZnPg=='}
        alt="After — Resolved"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* BEFORE (clip to left side) */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${pos}%` }}>
        <img
          src={beforeSrc || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIj48cmVjdCBmaWxsPSIjMWExNTI1IiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiNmODcxNzEiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CZWZvcmUgUGhvdG8gUGVuZGluZzwvdGV4dD48L3N2Zz4='}
          alt="Before — Reported"
          style={{ position: 'absolute', inset: 0, width: containerRef.current?.offsetWidth || 400, height: '100%', maxWidth: 'none', objectFit: 'cover' }}
        />
      </div>

      {/* Divider line */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${pos}%`,
        width: 3, background: '#fff', transform: 'translateX(-50%)',
        boxShadow: '0 0 8px rgba(0,0,0,0.5)',
      }}>
        {/* Handle knob */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 36, height: 36, borderRadius: '50%',
          background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#0f172a', fontWeight: 900, letterSpacing: -2,
          cursor: 'col-resize',
        }}>
          ‹›
        </div>
      </div>

      {/* Labels */}
      <div style={{
        position: 'absolute', top: 10, left: 12,
        background: 'rgba(239,68,68,0.85)', color: '#fff',
        fontSize: 10, fontWeight: 700, padding: '3px 8px',
        borderRadius: 'var(--r-full)', backdropFilter: 'blur(4px)',
      }}>BEFORE</div>
      <div style={{
        position: 'absolute', top: 10, right: 12,
        background: 'rgba(16,185,129,0.85)', color: '#fff',
        fontSize: 10, fontWeight: 700, padding: '3px 8px',
        borderRadius: 'var(--r-full)', backdropFilter: 'blur(4px)',
      }}>AFTER</div>
    </div>
  );
}
