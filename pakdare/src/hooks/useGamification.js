import { useState, useCallback } from 'react';

const STORAGE_KEY = 'pakdare-citizen-gamification';

export const LEVELS = [
  { min: 0,    name: 'Spotter',           icon: '👁️',  color: '#94a3b8' },
  { min: 50,   name: 'Reporter',           icon: '📢',  color: '#3b82f6' },
  { min: 150,  name: 'Investigator',       icon: '🔍',  color: '#8b5cf6' },
  { min: 350,  name: 'Health Warden',      icon: '🛡️',  color: '#f59e0b' },
  { min: 700,  name: 'Community Champion', icon: '🏆',  color: '#f97316' },
  { min: 1500, name: 'BMC Ally',           icon: '⭐',  color: '#10b981' },
];

export const BADGES = [
  { id: 'first-report',        icon: '🚀', name: 'First Alert',         desc: 'Filed your first health complaint' },
  { id: 'eagle-eye',           icon: '🦅', name: 'Eagle Eye',           desc: 'Filed 5 complaints' },
  { id: 'neighborhood-hero',   icon: '🏆', name: 'Neighborhood Hero',   desc: 'Filed 10 complaints' },
  { id: 'photo-proof',         icon: '📸', name: 'Photo Proof',         desc: 'Attached photo evidence' },
  { id: 'gps-guardian',        icon: '📡', name: 'GPS Guardian',        desc: 'Filed 3 GPS-verified reports' },
  { id: 'emergency-responder', icon: '🚨', name: 'Emergency Responder', desc: 'Filed 3 emergency-level reports' },
  { id: 'streak-3',            icon: '🔥', name: 'On Fire',             desc: '3 days in a row active' },
  { id: 'streak-7',            icon: '🌟', name: 'Week Warrior',        desc: '7 consecutive days active' },
];

export function getLevel(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) return { ...LEVELS[i], idx: i };
  }
  return { ...LEVELS[0], idx: 0 };
}

export function getNextLevel(points) {
  const idx = LEVELS.findIndex((l, i) => {
    const next = LEVELS[i + 1];
    return points >= l.min && (!next || points < next.min);
  });
  return LEVELS[idx + 1] || null;
}

export function getLevelProgress(points) {
  const cur = getLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  return Math.round(((points - cur.min) / (next.min - cur.min)) * 100);
}

const defaultProfile = () => ({
  points: 0,
  complaints: [],
  badges: [],
  gpsReports: 0,
  photoReports: 0,
  emergencyReports: 0,
  streak: { current: 0, last: null, longest: 0 },
  joinedDate: new Date().toISOString().slice(0, 10),
  lastEarned: null,
});

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultProfile(), ...JSON.parse(raw) } : defaultProfile();
  } catch { return defaultProfile(); }
}

function saveProfile(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function computeStreak(prev) {
  const today = new Date().toISOString().slice(0, 10);
  if (prev?.last === today) return prev;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const current = prev?.last === yesterday ? (prev.current || 0) + 1 : 1;
  return { current, last: today, longest: Math.max(current, prev?.longest || 0) };
}

function checkNewBadges(p) {
  const have = new Set(p.badges || []);
  const earned = [];
  if (p.complaints.length >= 1  && !have.has('first-report'))        earned.push('first-report');
  if (p.complaints.length >= 5  && !have.has('eagle-eye'))           earned.push('eagle-eye');
  if (p.complaints.length >= 10 && !have.has('neighborhood-hero'))   earned.push('neighborhood-hero');
  if (p.photoReports >= 1       && !have.has('photo-proof'))         earned.push('photo-proof');
  if (p.gpsReports >= 3         && !have.has('gps-guardian'))        earned.push('gps-guardian');
  if (p.emergencyReports >= 3   && !have.has('emergency-responder')) earned.push('emergency-responder');
  if ((p.streak?.current || 0) >= 3  && !have.has('streak-3'))      earned.push('streak-3');
  if ((p.streak?.longest || 0) >= 7  && !have.has('streak-7'))      earned.push('streak-7');
  return earned;
}

export function useGamification() {
  const [profile, setProfile] = useState(loadProfile);

  const awardPoints = useCallback((complaintData) => {
    let pts = 10;
    if (complaintData.photos?.length > 0) pts += 5;
    if (complaintData.lat && complaintData.lng) pts += 5;
    const EMERGENCY = ['dengue-case', 'malaria-case', 'fever-cluster'];
    if (EMERGENCY.includes(complaintData.category)) pts += 10;
    if (complaintData.severity === 'critical') pts += 5;

    setProfile(prev => {
      const p = {
        ...prev,
        points: (prev.points || 0) + pts,
        complaints: [...(prev.complaints || []), complaintData.id],
        gpsReports:       (prev.gpsReports || 0) + (complaintData.lat ? 1 : 0),
        photoReports:     (prev.photoReports || 0) + (complaintData.photos?.length > 0 ? 1 : 0),
        emergencyReports: (prev.emergencyReports || 0) + (EMERGENCY.includes(complaintData.category) ? 1 : 0),
        streak: computeStreak(prev.streak || {}),
      };
      const newBadges = checkNewBadges(p);
      p.badges = [...new Set([...(p.badges || []), ...newBadges])];
      p.lastEarned = { points: pts, badges: newBadges };
      saveProfile(p);
      return p;
    });

    return pts;
  }, []);

  return { profile, awardPoints };
}

// Utility: compute ward health score from complaint array
export function computeWardHealthScore(wardComplaints) {
  if (!wardComplaints.length) return 65;
  const total    = wardComplaints.length;
  const resolved = wardComplaints.filter(c => c.resolved).length;
  const resRate  = (resolved / total) * 100;

  const speedScores = wardComplaints
    .filter(c => c.resolved && c.resolvedAt && c.time)
    .map(c => {
      const hrs = (new Date(c.resolvedAt) - new Date(c.time)) / 3600000;
      return Math.max(0, 100 - (hrs / 48) * 100);
    });
  const speedScore = speedScores.length
    ? speedScores.reduce((a, b) => a + b, 0) / speedScores.length
    : 50;

  const critUnresolved = wardComplaints.filter(c => c.severity === 'critical' && !c.resolved).length;
  const sevScore = Math.max(0, 100 - (critUnresolved / Math.max(total, 1)) * 200);

  return Math.min(100, Math.round(resRate * 0.5 + speedScore * 0.3 + sevScore * 0.2));
}
