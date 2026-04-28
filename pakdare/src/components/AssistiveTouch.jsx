import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

// ── SVG Icons ────────────────────────────────────────────────────────
const Icons = {
  Report: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Map: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  Track: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Gallery: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  Chat: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Emergency: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Close: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// Menu items arranged in a radial arc
const MENU_ITEMS = [
  { id: 'report',    label: 'File Report',   Icon: Icons.Report,    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', angle: -90 },
  { id: 'map',       label: 'Live Map',      Icon: Icons.Map,       color: '#10b981', bg: 'rgba(16,185,129,0.15)', angle: -45 },
  { id: 'track',     label: 'Track Issue',   Icon: Icons.Track,     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', angle: 0   },
  { id: 'gallery',   label: 'Gallery',       Icon: Icons.Gallery,   color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', angle: 45  },
  { id: 'emergency', label: 'Emergency',     Icon: Icons.Emergency, color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  angle: 90  },
];

const RADIUS = 90; // distance from center to action button

function polarToCartesian(angleDeg, radius) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

export default function AssistiveTouch({ navigate, onOpenReport }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeLabel, setActiveLabel] = useState(null);
  const constraintsRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Determine if it's a tap or a drag
  const handleDragStart = useCallback((_, info) => {
    dragStartPos.current = { x: info.point.x, y: info.point.y };
  }, []);

  const handleDragEnd = useCallback((_, info) => {
    const dx = Math.abs(info.point.x - dragStartPos.current.x);
    const dy = Math.abs(info.point.y - dragStartPos.current.y);
    if (dx > 8 || dy > 8) {
      setIsDragging(true);
      setTimeout(() => setIsDragging(false), 200);
    }
  }, []);

  const handleFabClick = useCallback(() => {
    if (isDragging) return;
    setIsOpen(v => !v);
    setActiveLabel(null);
  }, [isDragging]);

  const handleAction = useCallback((id) => {
    setIsOpen(false);
    setActiveLabel(null);
    if (id === 'report')    { onOpenReport(); return; }
    if (id === 'emergency') { navigate('/report'); return; }
    navigate('/' + id);
  }, [navigate, onOpenReport]);

  // Spring variants
  const fabVariants = {
    closed: { scale: 1 },
    open:   { scale: 0.9 },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const itemVariants = {
    hidden:  (i) => ({ opacity: 0, scale: 0, x: 0, y: 0 }),
    visible: (i) => {
      const { x, y } = polarToCartesian(MENU_ITEMS[i].angle, RADIUS);
      return {
        opacity: 1, scale: 1,
        x, y,
        transition: { type: 'spring', stiffness: 400, damping: 22, delay: i * 0.04 },
      };
    },
    exit: (i) => ({
      opacity: 0, scale: 0, x: 0, y: 0,
      transition: { duration: 0.18, delay: (MENU_ITEMS.length - 1 - i) * 0.03 },
    }),
  };

  const labelVariants = {
    hidden:  { opacity: 0, x: 8, scale: 0.9 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 28 } },
    exit:    { opacity: 0, x: 8, scale: 0.9, transition: { duration: 0.1 } },
  };

  return (
    <>
      {/* Drag constraints boundary */}
      <div
        ref={constraintsRef}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5998 }}
      />

      {/* Backdrop blur overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => { setIsOpen(false); setActiveLabel(null); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 5999,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Main draggable container */}
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.08}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 24 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          right: 16,
          zIndex: 6000,
          touchAction: 'none',
          x, y,
        }}
      >
        {/* Radial menu items */}
        <AnimatePresence>
          {isOpen && MENU_ITEMS.map((item, i) => {
            const isActive = activeLabel === item.id;
            return (
              <motion.div
                key={item.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'all',
                  zIndex: 6001,
                }}
              >
                {/* Label (shown on hover/focus) */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      variants={labelVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      style={{
                        position: 'absolute',
                        right: 56,
                        whiteSpace: 'nowrap',
                        background: 'rgba(15,20,40,0.9)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${item.color}40`,
                        borderRadius: 10,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        color: item.color,
                        boxShadow: `0 4px 20px ${item.color}30`,
                        pointerEvents: 'none',
                      }}
                    >
                      {item.label}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action button */}
                <motion.button
                  whileHover={{ scale: 1.18 }}
                  whileTap={{ scale: 0.88 }}
                  onHoverStart={() => setActiveLabel(item.id)}
                  onHoverEnd={() => setActiveLabel(null)}
                  onFocus={() => setActiveLabel(item.id)}
                  onBlur={() => setActiveLabel(null)}
                  onClick={() => handleAction(item.id)}
                  aria-label={item.label}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: `1.5px solid ${item.color}60`,
                    background: item.bg,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: `0 8px 32px ${item.color}40, 0 0 0 1px ${item.color}20`,
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <item.Icon />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Central FAB */}
        <motion.button
          variants={fabVariants}
          animate={isOpen ? 'open' : 'closed'}
          whileHover={{ scale: isOpen ? 0.95 : 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleFabClick}
          aria-label={isOpen ? 'Close menu' : 'Open quick actions'}
          aria-expanded={isOpen}
          style={{
            position: 'relative',
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 6002,
            background: isOpen
              ? 'rgba(30,35,60,0.95)'
              : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            boxShadow: isOpen
              ? '0 0 0 1.5px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(37,99,235,0.55), 0 0 0 4px rgba(37,99,235,0.18)',
            transition: 'background 0.3s, box-shadow 0.3s',
          }}
        >
          {/* Pulsing ring when closed */}
          {!isOpen && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '2px solid rgba(99,102,241,0.5)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Icon transition */}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                style={{ color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center' }}
              >
                <Icons.Close />
              </motion.span>
            ) : (
              <motion.span
                key="plus"
                initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                style={{ color: '#fff', display: 'flex', alignItems: 'center' }}
              >
                <Icons.Plus />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </>
  );
}
