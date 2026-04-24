const HIER_LEVELS = [
  { role: 'Municipal Commissioner',  abbr: 'MC',  cls: 'hl-mc',  desc: 'Overall oversight' },
  { role: 'Additional MC (Health)',  abbr: 'AMC', cls: 'hl-amc', desc: 'City-wide health' },
  { role: 'Chief Medical Officer',   abbr: 'CMO', cls: 'hl-cmo', desc: 'District coordination' },
  { role: 'Dist. Malaria Officer',   abbr: 'DMO', cls: 'hl-dmo', desc: 'Disease surveillance' },
];

export function OfficerCard({ officer, index }) {
  return (
    <div
      className="ofc-card"
      style={{ animationDelay: `${index * 80}ms`, opacity: 0, animation: `fadeUp .4s ease ${index * 80}ms forwards` }}
    >
      <div className={`ofc-av ${officer.cls}`}>{officer.initials}</div>
      <div className="ofc-info">
        <div className="ofc-name">{officer.name}</div>
        <div className="ofc-role">{officer.role}</div>
        {officer.pend > 0 && (
          <div className="ofc-pend">
            <span className="ofc-pend-dot" />
            {officer.pend} pending
          </div>
        )}
      </div>
      <div className="ofc-badge-wrap">
        <div className={`ofc-lvl-badge ${officer.cls}`}>L{officer.level}</div>
      </div>
    </div>
  );
}

export function HierarchyChain({ ward }) {
  const chain = [
    ...HIER_LEVELS,
    { role: 'Ward Medical Officer', abbr: ward.wmo.split(' ').map(x => x[0]).join(''), cls: 'hl-wmo', desc: ward.wmo, isWard: true },
    { role: 'Sanitary Inspector',   abbr: ward.si.split(' ').map(x => x[0]).join(''),  cls: 'hl-si',  desc: ward.si,  isWard: true },
  ];
  return (
    <div className="ward-hier-wrap">
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>
        🔗 Accountability Chain — {ward.name}
      </div>
      <div className="ward-hier-chain">
        {chain.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', opacity: 0, animation: `chainIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms forwards` }}>
            <div className="ward-hier-node">
              <div className={`ward-hier-av ${n.cls}`} title={n.desc || n.role}>{n.abbr}</div>
              <div className="ward-hier-role">{n.role}</div>
              {n.isWard && <div className="ward-hier-name">{n.desc}</div>}
            </div>
            {i < chain.length - 1 && (
              <div className="ward-hier-arrow">
                <div className="wha-line" />
                <div className="wha-head" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
