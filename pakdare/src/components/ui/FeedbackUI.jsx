import { useState } from 'react';
import { motion } from 'framer-motion';

const TAGS = [
  '⚡ Quick Response', '👏 Helpful Officer', '💧 Permanent Fix',
  '🐢 Delayed', '❌ Poor Quality', '🧹 Mess Left Behind'
];

export default function FeedbackUI({ complaint, onSubmitFeedback }) {
  const [rating, setRating] = useState(complaint.feedback?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(complaint.feedback?.tags || []);
  const [comment, setComment] = useState(complaint.feedback?.comment || '');
  const [submitted, setSubmitted] = useState(!!complaint.feedback);

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    setSubmitted(true);
    onSubmitFeedback?.({ rating, tags: selectedTags, comment });
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="feedback-card" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="verified-badge">🛡️ Verified Resolution</div>
            <div style={{ marginTop: 8, fontSize: 18 }}>
              {'⭐'.repeat(rating)}{'🌑'.repeat(5-rating)}
            </div>
            {selectedTags.length > 0 && (
              <div className="fb-tags" style={{ marginTop: 8 }}>
                {selectedTags.map(t => <span key={t} className="fb-tag active" style={{ fontSize: 10, padding: '2px 8px' }}>{t}</span>)}
              </div>
            )}
            {comment && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>"{comment}"</p>}
          </div>
          <div style={{ fontSize: 24 }}>✅</div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="feedback-card">
      <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Rate the Resolution Quality</h4>
      <div className="fb-stars" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map(star => (
          <div 
            key={star}
            className={`fb-star ${(hoverRating || rating) >= star ? 'active' : ''}`}
            onMouseEnter={() => setHoverRating(star)}
            onClick={() => setRating(star)}
          >
            {star <= 2 && (hoverRating || rating) === star ? '😠' : 
             star === 3 && (hoverRating || rating) === star ? '😐' : 
             star >= 4 && (hoverRating || rating) === star ? '🤩' : '⭐'}
          </div>
        ))}
      </div>
      
      {rating > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Select tags (optional):</div>
          <div className="fb-tags">
            {TAGS.map(tag => (
              <button 
                key={tag} 
                className={`fb-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          
          <textarea 
            className="ftx" 
            placeholder="Add a comment..." 
            style={{ minHeight: 60, marginTop: 12, width: '100%', fontSize: 13 }}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          
          <button className="btn-primary" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={handleSubmit}>
            Submit Feedback
          </button>
        </motion.div>
      )}
    </div>
  );
}
