import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { WARDS } from '../../data/wardData';
import { useGamification, BADGES, LEVELS, getLevel, getLevelProgress, computeWardHealthScore } from '../../hooks/useGamification';

const MEDALS = ['🥇', '🥈', '🥉'];
const TIER_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];

function LevelProgressBar({ points }) {
  const level    = getLevel(points);
  const progress = getLevelProgress(points);
  const nextLevelIdx = LEVELS.findIndex(l => l.min > points);
  const nextLevel = nextLevelIdx !== -1 ? LEVELS[nextLevelIdx] : null;

  return (
    <div className="ldb-level-card">
      <div className="ldb-level-top">
        <div className="ldb-level-icon" style={{ background: `${level.color}22`, color: level.color }}>
          {level.icon}
        </div>
        <div>
          <div className="ldb-level-name" style={{ color: level.color }}>{level.name}</div>
          <div className="ldb-level-pts">{points} pts</div>
        </div>
        <div className="ldb-level-idx">Level {(level.idx ?? 0) + 1}</div>
      </div>
      <div className="ldb-level-bar-wrap">
        <div className="ldb-level-bar">
          <motion.div
            className="ldb-level-fill"
            style={{ background: level.color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="ldb-level-bar-labels">
          <span>{level.min} pts</span>
          {nextLevel && <span style={{ color: level.color }}>{nextLevel.min - points} pts to {nextLevel.name}</span>}
          {!nextLevel && <span style={{ color: level.color }}>Max Level!</span>}
        </div>
      </div>
    </div>
  );
}

function BadgeGrid({ earnedIds }) {
  const earnedSet = new Set(earnedIds);
  return (
    <div className="ldb-badge-grid">
      {BADGES.map(b => {
        const earned = earnedSet.has(b.id);
        return (
          <motion.div
            key={b.id}
            className={`ldb-badge${earned ? ' earned' : ' locked'}`}
            title={earned ? b.desc : `Locked: ${b.desc}`}
            whileHover={{ scale: earned ? 1.08 : 1.03 }}
          >
            <div className="ldb-badge-icon">{earned ? b.icon : '🔒'}</div>
            <div className="ldb-badge-name">{b.name}</div>
            {earned && <div className="ldb-badge-check">✓</div>}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage({ complaints }) {
  const { profile } = useGamification();

  // Build ward health score map
  const wardHealthScores = useMemo(() => {
    const map = {};
    complaints.forEach(c => {
      const wid = c.ward || c.ward_id;
      if (!wid) return;
      if (!map[wid]) map[wid] = [];
      map[wid].push(c);
    });
    return WARDS.map(w => ({
      ...w,
      healthScore: computeWardHealthScore(map[w.id] || []),
      totalComplaints: (map[w.id] || []).length,
      resolved: (map[w.id] || []).filter(c => c.resolved).length,
      pending: (map[w.id] || []).filter(c => !c.resolved).length,
    })).sort((a, b) => b.healthScore - a.healthScore);
  }, [complaints]);

  const cityStats = useMemo(() => ({
    total:    complaints.length,
    resolved: complaints.filter(c => c.resolved).length,
    critical: complaints.filter(c => c.severity === 'critical' && !c.resolved).length,
    activeWards: wardHealthScores.filter(w => w.totalComplaints > 0).length,
  }), [complaints, wardHealthScores]);

  return (
    <div className="page">
      <div className="page-hdr">
        <h1 className="page-title">Mumbai Health Rankings</h1>
        <p className="page-sub">Ward competition · Citizen contributions · Your achievements</p>
      </div>

      {/* City Stats Bar */}
      <div className="ldb-city-stats">
        {[
          { v: cityStats.total,        l: 'Reports Filed',   ico: '📋' },
          { v: cityStats.resolved,     l: 'Issues Resolved', ico: '✅' },
          { v: cityStats.critical,     l: 'Critical Active', ico: '🚨' },
          { v: cityStats.activeWards,  l: 'Active Wards',    ico: '🏙️' },
        ].map((s, i) => (
          <div key={i} className="ldb-city-stat">
            <div className="ldb-city-stat-ico">{s.ico}</div>
            <div className="ldb-city-stat-v">{s.v}</div>
            <div className="ldb-city-stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* === YOUR PROGRESS === */}
      <section className="ldb-section">
        <div className="ldb-section-title">Your Citizen Progress</div>
        <LevelProgressBar points={profile.points} />

        <div className="ldb-quick-stats">
          <div className="ldb-qs">
            <div className="ldb-qs-v">{profile.complaints?.length || 0}</div>
            <div className="ldb-qs-l">Reports Filed</div>
          </div>
          <div className="ldb-qs">
            <div className="ldb-qs-v">{profile.streak?.current || 0}</div>
            <div className="ldb-qs-l">Day Streak 🔥</div>
          </div>
          <div className="ldb-qs">
            <div className="ldb-qs-v">{profile.badges?.length || 0}</div>
            <div className="ldb-qs-l">Badges Earned</div>
          </div>
          <div className="ldb-qs">
            <div className="ldb-qs-v">{profile.gpsReports || 0}</div>
            <div className="ldb-qs-l">GPS Reports</div>
          </div>
        </div>
      </section>

      {/* === BADGES === */}
      <section className="ldb-section">
        <div className="ldb-section-title">Badges & Achievements</div>
        <BadgeGrid earnedIds={profile.badges || []} />
      </section>

      {/* === HOW TO EARN === */}
      <section className="ldb-section">
        <div className="ldb-section-title">How to Earn Points</div>
        <div className="ldb-earn-grid">
          {[
            { pts: '+10', icon: '📋', action: 'File a complaint' },
            { pts: '+5',  icon: '📷', action: 'Attach photo evidence' },
            { pts: '+5',  icon: '📍', action: 'GPS-verified location' },
            { pts: '+10', icon: '🚨', action: 'Emergency category report' },
            { pts: '+5',  icon: '🔴', action: 'Critical severity report' },
          ].map((e, i) => (
            <div key={i} className="ldb-earn-item">
              <span className="ldb-earn-ico">{e.icon}</span>
              <span className="ldb-earn-action">{e.action}</span>
              <span className="ldb-earn-pts">{e.pts}</span>
            </div>
          ))}
        </div>
      </section>

      {/* === WARD HEALTH COMPETITION === */}
      <section className="ldb-section">
        <div className="ldb-section-title">Ward Health Competition 🏆</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Ranked by Health Score = resolution rate + speed + low critical cases
        </div>

        {/* Top 3 Podium */}
        {wardHealthScores.slice(0, 3).length === 3 && (
          <div className="ldb-podium">
            {[wardHealthScores[1], wardHealthScores[0], wardHealthScores[2]].map((w, i) => {
              const podiumRank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const podiumH = podiumRank === 1 ? 100 : podiumRank === 2 ? 75 : 65;
              return (
                <div key={w.id} className={`ldb-podium-item rank-${podiumRank}`}>
                  <div className="ldb-podium-medal">{MEDALS[podiumRank - 1]}</div>
                  <div className="ldb-podium-name">{w.name}</div>
                  <div className="ldb-podium-score">{w.healthScore}</div>
                  <div className="ldb-podium-pillar" style={{ height: podiumH }}>
                    <span className="ldb-podium-rank">#{podiumRank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="ldb-ward-list">
          {wardHealthScores.map((w, i) => {
            const scoreColor = w.healthScore >= 70
              ? 'var(--green2)' : w.healthScore >= 40
              ? 'var(--orange2)' : 'var(--red2)';
            const resRate = w.totalComplaints
              ? Math.round((w.resolved / w.totalComplaints) * 100) : 0;
            return (
              <motion.div
                key={w.id}
                className="ldb-ward-row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025 }}
              >
                <div className="ldb-ward-rank">
                  {i < 3 ? (
                    <span style={{ fontSize: 18 }}>{MEDALS[i]}</span>
                  ) : (
                    <span className="ldb-rank-num">#{i + 1}</span>
                  )}
                </div>
                <div className="ldb-ward-info">
                  <div className="ldb-ward-name">{w.name}</div>
                  <div className="ldb-ward-meta">{w.area} · {w.zone} Zone</div>
                </div>
                <div className="ldb-ward-bar-col">
                  <div className="ldb-ward-bar">
                    <motion.div
                      className="ldb-ward-fill"
                      style={{ background: scoreColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${w.healthScore}%` }}
                      transition={{ duration: 0.6, delay: i * 0.025 }}
                    />
                  </div>
                  <div className="ldb-ward-bar-labels">
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{w.totalComplaints} reports · {resRate}% resolved</span>
                  </div>
                </div>
                <div className="ldb-ward-score" style={{ color: scoreColor }}>{w.healthScore}</div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
