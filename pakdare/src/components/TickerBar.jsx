import { WARDS } from '../data/wardData';

const TICKER =
  '🦟 K/East — 38 active fever clusters · DMC escalation triggered  ·  ' +
  '💧 Dharavi F/S — Water contamination · Lab alerted  ·  ' +
  '🚨 Kurla L-Ward — 22 breeding sites · fogging deployed  ·  ' +
  '⚠️ M/East Govandi — 16 cases flagged  ·  ' +
  '✅ G/South — 6 complaints resolved <24h  ·  ' +
  `📍 All ${WARDS.length} BMC wards monitored · Public Health Dept     `;

export default function TickerBar() {
  return (
    <div className="ticker-bar">
      <div className="ticker-lbl">
        <div className="ticker-lbl-dot" />
        LIVE
      </div>
      <div className="ticker-body">
        <span className="ticker-anim">{TICKER + TICKER}</span>
      </div>
    </div>
  );
}
