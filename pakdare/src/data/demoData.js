let _id = 1000;
const mkId = () => `BMC-${2604}-${++_id}`;
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

const baseData = [
  {
    id: mkId(), ward: 'ME', location: 'Shivaji Nagar, Govandi East',
    lat: 19.0614, lng: 72.9225,
    category: 'fever-cluster', severity: 'critical',
    desc: '16 fever cases reported in 3 adjacent buildings. Children also affected. No response from health post for 5 days.',
    status: 'In Progress', assignedTo: 'Dr. Laxman Bhoir (DMO)',
    time: hoursAgo(4), resolved: false, isDemo: true,
    escalations: ['Filed → Health Post (2d ago)', 'Escalated → Ward MO (1d ago)', 'Escalated → DMO (4h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Health Post', initials: 'HP', level: 3 },
      { role: 'Ward MO', initials: 'WM', level: 2 },
      { role: 'DMO', initials: 'DM', level: 1 },
    ],
  },
  {
    id: mkId(), ward: 'KE', location: 'Marol Naka, near Metro Pillar 34',
    lat: 19.1136, lng: 72.8717,
    category: 'breeding-stagnant', severity: 'critical',
    desc: 'Massive open drain overflowing with stagnant water. Mosquito breeding confirmed. Dengue cases in locality.',
    status: 'Open', assignedTo: 'SI Vinod Gawde',
    time: hoursAgo(8), resolved: false, isDemo: true,
    escalations: ['Filed → Ward SI (8h ago)', 'Escalated → WMO (3h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Ward SI', initials: 'SI', level: 3 },
      { role: 'WMO', initials: 'WM', level: 2 },
    ],
  },
  {
    id: mkId(), ward: 'KE', location: 'J.B. Nagar Colony, Andheri East',
    lat: 19.1158, lng: 72.8678,
    category: 'dengue-case', severity: 'severe',
    desc: 'Suspected dengue — 4 members of family tested positive. Seeking fumigation and follow-up.',
    status: 'Assigned', assignedTo: 'Malaria Dept – KE',
    time: hoursAgo(14), resolved: false, isDemo: true,
    escalations: ['Filed → Malaria Dept (14h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Malaria Dept', initials: 'MD', level: 3 },
      { role: 'DMC', initials: 'DC', level: 2 },
    ],
  },
  {
    id: mkId(), ward: 'FS', location: 'Dharavi Sector 3, near tank',
    lat: 19.0412, lng: 72.8540,
    category: 'water-muddy', severity: 'critical',
    desc: 'Brown muddy water from taps for 3 days. Residents buying water. Children falling sick.',
    status: 'In Progress', assignedTo: 'AEH Sachin Bhosle',
    time: hoursAgo(3), resolved: false, isDemo: true,
    escalations: ['Filed → AEH (6h ago)', 'Escalated → CWE (3h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'AEH', initials: 'AE', level: 3 },
      { role: 'CWE', initials: 'CW', level: 2 },
    ],
  },
  {
    id: mkId(), ward: 'FS', location: 'Koliwada Lane, Dharavi',
    lat: 19.0430, lng: 72.8518,
    category: 'breeding-drain', severity: 'severe',
    desc: 'Nullah completely blocked. Stagnant sewage water attracting mosquitoes. Residents complaining for 2 weeks.',
    status: 'Open', assignedTo: 'AE Rajiv Kale',
    time: daysAgo(2), resolved: false, isDemo: true,
    escalations: ['Filed → AE (2d ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Ward AE', initials: 'AE', level: 3 },
    ],
  },
  {
    id: mkId(), ward: 'L', location: 'Tilak Nagar, Kurla East',
    lat: 19.0756, lng: 72.8896,
    category: 'mosquito-nuisance', severity: 'severe',
    desc: '22 breeding sites mapped by local volunteers. Fogging demanded since 10 days. No action.',
    status: 'Escalated', assignedTo: 'DMC – L Ward',
    time: daysAgo(3), resolved: false, isDemo: true,
    escalations: ['Filed → Insecticide Branch (3d ago)', 'Escalated → Ward SI (2d ago)', 'Escalated → WMO (1d ago)', 'Escalated → DMC (12h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Insecticide', initials: 'IB', level: 4 },
      { role: 'Ward SI', initials: 'SI', level: 3 },
      { role: 'WMO', initials: 'WM', level: 2 },
      { role: 'DMC', initials: 'DC', level: 1 },
    ],
  },
  {
    id: mkId(), ward: 'GN', location: 'Sion-Trombay Road, Govandi',
    lat: 19.0560, lng: 72.9020,
    category: 'sewer-mix', severity: 'critical',
    desc: 'Sewage mixing with water supply pipe. Residents reporting diarrhea. Lab test pending.',
    status: 'In Progress', assignedTo: 'SE Sewerage – GN',
    time: hoursAgo(6), resolved: false, isDemo: true,
    escalations: ['Filed → Sewerage Dept (6h ago)', 'Escalated → SE (2h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Sewerage Dept', initials: 'SD', level: 3 },
      { role: 'SE', initials: 'SE', level: 2 },
    ],
  },
  {
    id: mkId(), ward: 'GS', location: 'Shivaji Park area, Dadar West',
    lat: 19.0197, lng: 72.8410,
    category: 'garbage', severity: 'moderate',
    desc: 'Garbage not collected for 4 days near temple lane. Rodents visible in evening.',
    status: 'Resolved', assignedTo: 'Sanitary Inspector – GS',
    time: daysAgo(1), resolved: true, isDemo: true,
    escalations: ['Filed → SI (1d ago)', 'Resolved (8h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Sanitary Insp.', initials: 'SI', level: 3 },
    ],
  },
  {
    id: mkId(), ward: 'N', location: 'Ghatkopar West Bus Depot area',
    lat: 19.0858, lng: 72.9050,
    category: 'drain-block', severity: 'severe',
    desc: 'Stormwater drain blocked causing waterlogging even in light rain. 5 shops flooded.',
    status: 'Assigned', assignedTo: 'AE Storm Drain – N',
    time: daysAgo(2), resolved: false, isDemo: true,
    escalations: ['Filed → AE (2d ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'AE Storm', initials: 'AE', level: 3 },
      { role: 'SE', initials: 'SE', level: 2 },
    ],
  },
  {
    id: mkId(), ward: 'E', location: 'Byculla Zoo Road, near junction',
    lat: 18.9784, lng: 72.8519,
    category: 'malaria-case', severity: 'severe',
    desc: 'Confirmed malaria case — P. vivax. Family of 4. Request blood smear collection team.',
    status: 'In Progress', assignedTo: 'Malaria Dept – E',
    time: hoursAgo(10), resolved: false, isDemo: true,
    escalations: ['Filed → Malaria Dept (10h ago)', 'Blood smear team dispatched (4h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Malaria Dept', initials: 'MD', level: 3 },
      { role: 'DMC', initials: 'DC', level: 2 },
    ],
  },
  {
    id: mkId(), ward: 'KW', location: 'Versova Village, Andheri West',
    lat: 19.1386, lng: 72.8206,
    category: 'breeding-stagnant', severity: 'moderate',
    desc: 'Plastic drums and pots near demolished building collecting rainwater. Active breeding site.',
    status: 'Open', assignedTo: 'Pramod Yadav – SI',
    time: hoursAgo(18), resolved: false, isDemo: true,
    escalations: ['Filed → SI (18h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Ward SI', initials: 'SI', level: 3 },
    ],
  },
  {
    id: mkId(), ward: 'MW', location: 'Chembur Colony, Sector 7',
    lat: 19.0559, lng: 72.8990,
    category: 'water-leakage', severity: 'moderate',
    desc: 'Pipeline burst on main road — water wasting since morning. Pothole forming.',
    status: 'Resolved', assignedTo: 'AEH – MW',
    time: daysAgo(1), resolved: true, isDemo: true,
    escalations: ['Filed → AEH (1d ago)', 'Repair done (5h ago)'],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'AEH', initials: 'AE', level: 3 },
    ],
  },
];

const wardsList = ['A','B','C','D','E','FN','FS','GN','GS','HE','HW','KE','KW','L','ME','MW','N','PN','PS','RC','RN','RS','S','T'];
const categoriesList = ['mosquito-nuisance', 'breeding-stagnant', 'breeding-garbage', 'breeding-drain', 'water-muddy', 'water-smell', 'water-leakage', 'sewer-mix', 'garbage', 'drain-block', 'fever-cluster', 'dengue-case', 'malaria-case'];
const severities = ['minor', 'moderate', 'severe', 'critical'];

for (let i = 0; i < 88; i++) {
  const w = wardsList[Math.floor(Math.random() * wardsList.length)];
  const cat = categoriesList[Math.floor(Math.random() * categoriesList.length)];
  const sev = severities[Math.floor(Math.random() * severities.length)];
  const isResolved = Math.random() > 0.7;
  baseData.push({
    id: mkId(),
    ward: w,
    location: `Generated Area ${i}, near Landmark`,
    lat: 18.89 + Math.random() * 0.35,
    lng: 72.78 + Math.random() * 0.20,
    category: cat,
    severity: sev,
    desc: `Auto-generated dummy complaint reporting ${cat} issue in ward ${w}.`,
    status: isResolved ? 'Resolved' : (Math.random() > 0.5 ? 'Open' : 'In Progress'),
    assignedTo: `Officer ${i}`,
    time: hoursAgo(Math.floor(Math.random() * 720)), // up to 30 days ago
    resolved: isResolved,
    isDemo: true,
    escalations: [`Filed → Officer ${i} (just now)`],
    hierarchy: [
      { role: 'Citizen', initials: 'CZ', level: 4 },
      { role: 'Officer', initials: 'OF', level: 3 }
    ]
  });
}

export const DEMO_COMPLAINTS = baseData;
