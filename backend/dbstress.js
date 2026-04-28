// Phase 5: DB Stress — no ORDER BY to avoid Aiven free-tier sort buffer crash
const { sequelize, connectDB } = require('./config/db');
const Complaint = require('./models/Complaint');
const User = require('./models/User');
const { performance } = require('perf_hooks');

async function dbStress() {
  await connectDB();
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 5: DATABASE STRESS TEST               ║');
  console.log('╚══════════════════════════════════════════════╝');

  const [cCount, uCount] = await Promise.all([Complaint.count(), User.count()]);
  console.log('\n  Current DB state:');
  console.log('  Complaints : ' + cCount + ' rows');
  console.log('  Users      : ' + uCount + ' rows');

  async function bench(label, fn) {
    try {
      const t = performance.now();
      const result = await fn();
      const ms = (performance.now() - t).toFixed(1);
      const rows = Array.isArray(result) ? result.length : (result?.count ?? (typeof result === 'number' ? result : 1));
      console.log('  ' + label.padEnd(44) + ms.padStart(8) + 'ms   rows=' + rows);
      return result;
    } catch(e) {
      console.log('  ❌ ' + label.padEnd(44) + ' ERROR: ' + e.message.slice(0, 80));
      return null;
    }
  }

  console.log('\n  ── QUERY PERFORMANCE (no ORDER BY — avoids sort buffer) ──');
  await bench('SELECT LIMIT 50', () => Complaint.findAll({ limit: 50 }));
  await bench('SELECT LIMIT 200', () => Complaint.findAll({ limit: 200 }));
  await bench('COUNT(*) all', () => Complaint.count());
  await bench('COUNT where resolved=false', () => Complaint.count({ where: { resolved: false } }));
  await bench('WHERE ward=A', () => Complaint.findAll({ where: { ward: 'A' }, limit: 50 }));
  await bench('WHERE resolved=false', () => Complaint.findAll({ where: { resolved: false }, limit: 50 }));
  await bench('WHERE category=dengue-case', () => Complaint.findAll({ where: { category: 'dengue-case' }, limit: 50 }));
  await bench('WHERE status=Pending', () => Complaint.findAll({ where: { status: 'Pending' }, limit: 50 }));
  await bench('WHERE ward=A AND resolved=false', () => Complaint.findAll({ where: { ward: 'A', resolved: false }, limit: 50 }));
  await bench('findByPk (PK lookup)', async () => {
    const first = await Complaint.findOne({ attributes: ['id'] });
    return first ? Complaint.findByPk(first.id) : null;
  });

  console.log('\n  ── CONCURRENT DB QUERIES (no ORDER BY) ──────');
  for (const n of [5, 10, 20, 30]) {
    try {
      const t = performance.now();
      const results = await Promise.all(
        Array.from({ length: n }, () => Complaint.findAll({ limit: 50 }))
      );
      const ms = (performance.now() - t).toFixed(0);
      const ok = results.filter(r => Array.isArray(r)).length;
      console.log('  ' + String(n).padStart(2) + ' concurrent queries:' + ms.padStart(7) + 'ms total  |  ' + ok + '/' + n + ' ok');
    } catch(e) {
      console.log('  ❌ ' + n + ' concurrent: ' + e.message.slice(0, 60));
    }
  }

  console.log('\n  ── RAW AGGREGATE QUERIES ─────────────────────');
  const aggs = [
    ['COUNT unresolved non-demo', 'SELECT COUNT(*) as total FROM Complaints WHERE isDemo = false AND resolved = false'],
    ['GROUP BY ward', 'SELECT ward, COUNT(*) as cnt FROM Complaints GROUP BY ward ORDER BY cnt DESC LIMIT 20'],
    ['GROUP BY category', 'SELECT category, COUNT(*) as cnt FROM Complaints GROUP BY category LIMIT 20'],
    ['Avg resolve time (hrs)', 'SELECT AVG(TIMESTAMPDIFF(HOUR, time, resolvedAt)) as avg_hrs FROM Complaints WHERE resolved = true AND resolvedAt IS NOT NULL'],
  ];
  for (const [label, sql] of aggs) {
    try {
      const t = performance.now();
      const [rows] = await sequelize.query(sql);
      const ms = (performance.now() - t).toFixed(1);
      console.log('  ' + label.padEnd(36) + ms.padStart(8) + 'ms   result=' + JSON.stringify(rows[0] || rows).slice(0, 60));
    } catch(e) {
      console.log('  ❌ ' + label.padEnd(36) + ' ERROR: ' + e.message.slice(0, 60));
    }
  }

  console.log('\n  ── INDEX VERIFICATION ────────────────────────');
  try {
    const [indexes] = await sequelize.query('SHOW INDEX FROM Complaints');
    const indexMap = {};
    indexes.forEach(i => {
      if (!indexMap[i.Key_name]) indexMap[i.Key_name] = [];
      indexMap[i.Key_name].push(i.Column_name);
    });
    Object.entries(indexMap).forEach(([name, cols]) => {
      console.log('  ✅ INDEX: ' + name.padEnd(35) + '(' + cols.join(', ') + ')');
    });
    console.log('\n  Total indexes: ' + Object.keys(indexMap).length + ' (target: 9+)');
    const hasTimeIdx = Object.values(indexMap).some(cols => cols.includes('time'));
    const hasWardIdx = Object.values(indexMap).some(cols => cols.includes('ward'));
    const hasResolved = Object.values(indexMap).some(cols => cols.includes('resolved'));
    console.log('  time index:     ' + (hasTimeIdx ? '✅' : '❌ MISSING — ORDER BY time will be slow'));
    console.log('  ward index:     ' + (hasWardIdx ? '✅' : '❌ MISSING — ward filter will be slow'));
    console.log('  resolved index: ' + (hasResolved ? '✅' : '❌ MISSING — status filter will be slow'));
  } catch(e) {
    console.log('  SHOW INDEX failed:', e.message);
  }

  console.log('\n  ── EXPLAIN: ward filter query ────────────────');
  try {
    const [plan] = await sequelize.query(
      'EXPLAIN SELECT * FROM Complaints WHERE ward = ? LIMIT 50',
      { replacements: ['A'] }
    );
    plan.forEach(row => {
      console.log(
        '  type='    + (row.type || '?').padEnd(7) +
        ' key='     + (row.key || 'NULL').padEnd(25) +
        ' rows='    + String(row.rows || '?').padEnd(8) +
        ' Extra='   + (row.Extra || '')
      );
    });
  } catch(e) {
    console.log('  EXPLAIN failed:', e.message);
  }

  console.log('\n  ── SORT BUFFER DIAGNOSIS ─────────────────────');
  try {
    const [sortBuf] = await sequelize.query("SHOW VARIABLES LIKE 'sort_buffer_size'");
    const [joinBuf]  = await sequelize.query("SHOW VARIABLES LIKE 'join_buffer_size'");
    const [maxConn]  = await sequelize.query("SHOW VARIABLES LIKE 'max_connections'");
    const [threadCon]= await sequelize.query("SHOW STATUS LIKE 'Threads_connected'");
    sortBuf.forEach(r => console.log('  sort_buffer_size:  ' + r.Value + ' bytes (' + (parseInt(r.Value)/1024).toFixed(0) + ' KB)  ← ⚠️  likely too small on free tier'));
    joinBuf.forEach(r => console.log('  join_buffer_size:  ' + r.Value + ' bytes'));
    maxConn.forEach(r => console.log('  max_connections:   ' + r.Value + '  (our pool max=20)'));
    threadCon.forEach(r => console.log('  Threads_connected: ' + r.Value + '  (current live connections)'));
  } catch(e) {
    console.log('  Variable query failed:', e.message);
  }

  process.exit(0);
}

dbStress().catch(e => { console.error(e.message); process.exit(1); });
