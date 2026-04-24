import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LightboxModal — full-screen image viewer
 * Props:
 *   images: string[]   — array of image URLs/data URIs
 *   index:  number     — currently shown index
 *   onClose: () => void
 *   onNav:  (i) => void
 */
export default function LightboxModal({ images = [], index = 0, onClose }) {
  const total = images.length;
  const src = images[index];

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!src) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="lbx-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Close */}
        <button className="lbx-close" onClick={onClose} title="Close (Esc)">✕</button>

        {/* Counter */}
        {total > 1 && (
          <div className="lbx-counter">{index + 1} / {total}</div>
        )}

        {/* Image */}
        <motion.div
          className="lbx-img-wrap"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
        >
          <img src={src} alt="Full size evidence" className="lbx-img" draggable={false} />
          <div className="lbx-img-hint">Tap outside or press Esc to close</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
