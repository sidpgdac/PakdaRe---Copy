import { CATEGORIES, WARDS } from '../data/wardData';

/**
 * exportCSV(complaints) — generates and downloads a .csv file
 */
export function exportCSV(complaints) {
  const headers = [
    'ID', 'Ward', 'Area', 'Zone', 'Location', 'Category', 'Severity',
    'Status', 'Assigned To', 'Filed At', 'Resolved', 'Resolved At',
    'GPS Lat', 'GPS Lng', 'GPS Verified', 'SLA Breached',
  ];

  const rows = complaints.map(c => {
    const ward = WARDS.find(w => w.id === c.ward);
    const slaHrs = { critical: 4, severe: 12, moderate: 24, minor: 48 };
    const elapsed = (Date.now() - new Date(c.time).getTime()) / 3600000;
    const breached = !c.resolved && elapsed > (slaHrs[c.severity] || 48);

    return [
      c.id,
      c.ward,
      ward?.area || '',
      ward?.zone || '',
      `"${(c.location || '').replace(/"/g, "'")}"`,
      CATEGORIES[c.category] || c.category,
      c.severity,
      c.status,
      `"${(c.assignedTo || '').replace(/"/g, "'")}"`,
      c.time ? new Date(c.time).toLocaleString('en-IN') : '',
      c.resolved ? 'Yes' : 'No',
      c.resolvedAt ? new Date(c.resolvedAt).toLocaleString('en-IN') : '',
      c.lat || '',
      c.lng || '',
      c.gpsVerified ? 'Yes' : 'No',
      breached ? 'Yes' : 'No',
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = `BMC_Complaints_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
