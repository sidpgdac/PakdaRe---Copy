import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HIERARCHY_TREE } from '../../data/hierarchy';
import { WARDS } from '../../data/wardData';
import { useTranslation } from 'react-i18next';

function OfficerPanel({ node, onClose }) {
  const ward = node.wardId ? WARDS.find(w => w.id === node.wardId) : null;
  const name = ward ? ward.wmo : node.name;
  const email = ward ? ward.wmoEmail : node.email;
  const phone = ward ? ward.wmoPhone : node.phone;
  const role  = node.role;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="ofc-panel-wrap"
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 12, width: 28, height: 28,
          borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--glass-bg2)',
          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >✕</button>

      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--blue), var(--indigo))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 14,
        boxShadow: 'var(--glow-blue)',
      }}>
        {node.avatar || name?.split(' ').map(x => x[0]).join('')}
      </div>

      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--ff-display)', lineHeight: 1.2 }}>{name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{role}</div>
      {node.designation && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{node.designation}</div>
      )}

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {email && (
          <a
            href={`mailto:${email}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'var(--glass-bg)', borderRadius: 'var(--r12)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, transition: 'all .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <span>📧</span><span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>{email}</span>
          </a>
        )}
        {phone && (
          <a
            href={`tel:${phone}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'var(--glass-bg)', borderRadius: 'var(--r12)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, transition: 'all .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <span>📞</span><span>{phone}</span>
          </a>
        )}
        {ward && (
          <div style={{
            padding: '10px 14px', background: 'rgba(37,99,235,0.06)',
            borderRadius: 'var(--r12)', border: '1px solid rgba(37,99,235,0.2)',
            fontSize: 12, color: 'var(--blue2)',
          }}>
            🏥 Ward {ward.id} · {ward.area} · {ward.zone} Zone
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TreeNode({ node, depth = 0, onSelect, selectedId }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children?.length > 0;
  const isSelected = selectedId === node.id;
  const ward = node.wardId ? WARDS.find(w => w.id === node.wardId) : null;

  const label = ward ? `${ward.name} — ${ward.wmo}` : node.name;
  const subtitle = ward ? `Ward ${ward.id} · ${ward.zone}` : node.designation;

  const levelColors = ['var(--gold)', 'var(--blue2)', 'var(--teal)', 'var(--purple)', 'var(--green2)'];
  const color = levelColors[depth] || 'var(--text-muted)';

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 24, position: 'relative' }}>
      {/* Connector line */}
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: -16, top: 24, width: 16, height: 2,
          background: 'var(--border2)',
        }} />
      )}

      <motion.div
        whileHover={{ scale: 1.01, x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (hasChildren) setExpanded(e => !e);
          onSelect(node);
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 'var(--r12)',
          background: isSelected ? 'rgba(37,99,235,0.12)' : 'var(--glass-bg)',
          border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
          cursor: 'pointer', marginBottom: 6, transition: 'all .2s',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${color}33, ${color}66)`,
          border: `2px solid ${color}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontWeight: 800, color,
        }}>
          {node.avatar || (ward ? ward.wmo.split(' ').map(x => x[0]).join('') : node.name?.split(' ').map(x => x[0]).join('')?.slice(0, 2))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        </div>

        {hasChildren && (
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}
          >▶</motion.div>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderLeft: '2px solid var(--border2)', marginLeft: 12, paddingLeft: 4 }}>
              {node.children.map((child, i) => (
                <TreeNode key={child.id || i} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HierarchyPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);

  return (
    <div className="page page-enter">
      <div className="page-hdr">
        <h1 className="page-title">{t('officers_title')}</h1>
        <p className="page-sub">{t('officers_sub')}</p>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ maxWidth: 680 }}>
          <TreeNode
            node={HIERARCHY_TREE}
            depth={0}
            onSelect={setSelected}
            selectedId={selected?.id}
          />
        </div>

        <AnimatePresence>
          {selected && (
            <OfficerPanel node={selected} onClose={() => setSelected(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
