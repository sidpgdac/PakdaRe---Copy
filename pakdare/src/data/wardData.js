// Full 27 BMC Ward data with exact IDs, officer details, SLA hours
export const SLA_HOURS = { critical: 4, severe: 12, moderate: 24, minor: 48 };

export const WARDS = [
  { id: 'A',  name: 'A Ward',    area: 'Colaba / Fort',        zone: 'City',    lat: 18.9067, lng: 72.8147, wmo: 'Rajesh Patil',    wmoEmail: 'r.patil@mcgm.gov.in',    wmoPhone: '9820011001', si: 'Suresh Kamble',   siEmail: 's.kamble@mcgm.gov.in',   siPhone: '9820011002', risk: 28, clusters: 3,  breeding: 5,  avgRes: 18 },
  { id: 'B',  name: 'B Ward',    area: 'Mazgaon / Byculla',    zone: 'City',    lat: 18.9601, lng: 72.8359, wmo: 'Priya Nair',      wmoEmail: 'p.nair@mcgm.gov.in',      wmoPhone: '9820011003', si: 'Arun Desai',      siEmail: 'a.desai@mcgm.gov.in',    siPhone: '9820011004', risk: 45, clusters: 6,  breeding: 11, avgRes: 26 },
  { id: 'C',  name: 'C Ward',    area: 'Matunga / Parel',      zone: 'City',    lat: 19.0096, lng: 72.8479, wmo: 'Vijay More',      wmoEmail: 'v.more@mcgm.gov.in',      wmoPhone: '9820011005', si: 'Dinesh Sawant',   siEmail: 'd.sawant@mcgm.gov.in',   siPhone: '9820011006', risk: 38, clusters: 5,  breeding: 9,  avgRes: 22 },
  { id: 'D',  name: 'D Ward',    area: 'Worli',                zone: 'City',    lat: 19.0119, lng: 72.8157, wmo: 'Anita Sharma',    wmoEmail: 'a.sharma@mcgm.gov.in',    wmoPhone: '9820011007', si: 'Ganesh Powar',    siEmail: 'g.powar@mcgm.gov.in',    siPhone: '9820011008', risk: 31, clusters: 4,  breeding: 7,  avgRes: 20 },
  { id: 'E',  name: 'E Ward',    area: 'Byculla / Sion',       zone: 'City',    lat: 18.9784, lng: 72.8509, wmo: 'Ramesh Kulkarni', wmoEmail: 'r.kulkarni@mcgm.gov.in',  wmoPhone: '9820011009', si: 'Hemant Jadhav',   siEmail: 'h.jadhav@mcgm.gov.in',   siPhone: '9820011010', risk: 52, clusters: 7,  breeding: 14, avgRes: 31 },
  { id: 'FN', name: 'F/North',   area: 'Matunga East',         zone: 'City',    lat: 19.0250, lng: 72.8450, wmo: 'Sunita Rane',     wmoEmail: 's.rane@mcgm.gov.in',      wmoPhone: '9820011011', si: 'Kishore Mane',    siEmail: 'k.mane@mcgm.gov.in',     siPhone: '9820011012', risk: 44, clusters: 6,  breeding: 12, avgRes: 28 },
  { id: 'FS', name: 'F/South',   area: 'Dharavi',              zone: 'City',    lat: 19.0412, lng: 72.8530, wmo: 'Arun Gaikwad',    wmoEmail: 'a.gaikwad@mcgm.gov.in',   wmoPhone: '9820011013', si: 'Sachin Bhosle',   siEmail: 's.bhosle@mcgm.gov.in',   siPhone: '9820011014', risk: 78, clusters: 14, breeding: 28, avgRes: 48 },
  { id: 'GN', name: 'G/North',   area: 'Dharavi Area',         zone: 'Western', lat: 19.0530, lng: 72.8430, wmo: 'Meena Pawar',     wmoEmail: 'm.pawar@mcgm.gov.in',     wmoPhone: '9820011015', si: 'Rajiv Kale',      siEmail: 'r.kale@mcgm.gov.in',     siPhone: '9820011016', risk: 65, clusters: 11, breeding: 22, avgRes: 40 },
  { id: 'GS', name: 'G/South',   area: 'Dadar West',           zone: 'Western', lat: 19.0197, lng: 72.8410, wmo: 'Deepak Shirke',   wmoEmail: 'd.shirke@mcgm.gov.in',    wmoPhone: '9820011017', si: 'Nilesh Waghmare', siEmail: 'n.waghmare@mcgm.gov.in', siPhone: '9820011018', risk: 22, clusters: 2,  breeding: 4,  avgRes: 14 },
  { id: 'HE', name: 'H/East',    area: 'Bandra East',          zone: 'Western', lat: 19.0596, lng: 72.8558, wmo: 'Kavita Salvi',    wmoEmail: 'k.salvi@mcgm.gov.in',     wmoPhone: '9820011019', si: 'Sunil Parab',     siEmail: 's.parab@mcgm.gov.in',    siPhone: '9820011020', risk: 41, clusters: 5,  breeding: 10, avgRes: 24 },
  { id: 'HW', name: 'H/West',    area: 'Bandra West',          zone: 'Western', lat: 19.0607, lng: 72.8369, wmo: 'Prakash Naik',    wmoEmail: 'p.naik@mcgm.gov.in',      wmoPhone: '9820011021', si: 'Ashok Mestry',    siEmail: 'a.mestry@mcgm.gov.in',   siPhone: '9820011022', risk: 19, clusters: 2,  breeding: 3,  avgRes: 12 },
  { id: 'KE', name: 'K/East',    area: 'Andheri East',         zone: 'Western', lat: 19.1136, lng: 72.8697, wmo: 'Sanjay Patare',   wmoEmail: 's.patare@mcgm.gov.in',    wmoPhone: '9820011023', si: 'Vinod Gawde',     siEmail: 'v.gawde@mcgm.gov.in',    siPhone: '9820011024', risk: 88, clusters: 18, breeding: 35, avgRes: 62 },
  { id: 'KW', name: 'K/West',    area: 'Andheri West',         zone: 'Western', lat: 19.1366, lng: 72.8296, wmo: 'Usha Tambe',      wmoEmail: 'u.tambe@mcgm.gov.in',     wmoPhone: '9820011025', si: 'Pramod Yadav',    siEmail: 'p.yadav@mcgm.gov.in',    siPhone: '9820011026', risk: 55, clusters: 8,  breeding: 17, avgRes: 33 },
  { id: 'KN', name: 'K/North',   area: 'Jogeshwari / Vile Parle', zone: 'Western', lat: 19.1480, lng: 72.8490, wmo: 'Sangita Bhatt', wmoEmail: 'sg.bhatt@mcgm.gov.in',   wmoPhone: '9820011027', si: 'Dilip Chavan',    siEmail: 'd.chavan@mcgm.gov.in',   siPhone: '9820011028', risk: 49, clusters: 7,  breeding: 13, avgRes: 30 },
  { id: 'L',  name: 'L Ward',    area: 'Kurla',                zone: 'Eastern', lat: 19.0726, lng: 72.8826, wmo: 'Sham Dhole',      wmoEmail: 'sh.dhole@mcgm.gov.in',    wmoPhone: '9820011029', si: 'Ravi Chauhan',    siEmail: 'r.chauhan@mcgm.gov.in',  siPhone: '9820011030', risk: 74, clusters: 13, breeding: 26, avgRes: 45 },
  { id: 'ME', name: 'M/East',    area: 'Govandi',              zone: 'Eastern', lat: 19.0624, lng: 72.9215, wmo: 'Laxman Bhoir',    wmoEmail: 'l.bhoir@mcgm.gov.in',     wmoPhone: '9820011031', si: 'Balu Khamkar',    siEmail: 'b.khamkar@mcgm.gov.in',  siPhone: '9820011032', risk: 92, clusters: 21, breeding: 42, avgRes: 70 },
  { id: 'MW', name: 'M/West',    area: 'Chembur',              zone: 'Eastern', lat: 19.0559, lng: 72.8997, wmo: 'Shobha Dolas',    wmoEmail: 'sh.dolas@mcgm.gov.in',    wmoPhone: '9820011033', si: 'Manoj Surve',     siEmail: 'm.surve@mcgm.gov.in',    siPhone: '9820011034', risk: 48, clusters: 7,  breeding: 15, avgRes: 29 },
  { id: 'N',  name: 'N Ward',    area: 'Ghatkopar',            zone: 'Eastern', lat: 19.0858, lng: 72.9088, wmo: 'Vijay Koli',      wmoEmail: 'v.koli@mcgm.gov.in',      wmoPhone: '9820011035', si: 'Deepak Patil',    siEmail: 'd.patil@mcgm.gov.in',    siPhone: '9820011036', risk: 60, clusters: 10, breeding: 20, avgRes: 37 },
  { id: 'PE', name: 'P/East',    area: 'Mahim / Sion',         zone: 'Western', lat: 19.0450, lng: 72.8380, wmo: 'Nirmala Konde',   wmoEmail: 'n.konde@mcgm.gov.in',     wmoPhone: '9820011037', si: 'Suresh Raut',     siEmail: 'su.raut@mcgm.gov.in',    siPhone: '9820011038', risk: 40, clusters: 5,  breeding: 10, avgRes: 25 },
  { id: 'PN', name: 'P/North',   area: 'Goregaon',             zone: 'Western', lat: 19.1601, lng: 72.8491, wmo: 'Rekha Tawde',     wmoEmail: 'r.tawde@mcgm.gov.in',     wmoPhone: '9820011039', si: 'Santosh Bhave',   siEmail: 'sa.bhave@mcgm.gov.in',   siPhone: '9820011040', risk: 35, clusters: 4,  breeding: 8,  avgRes: 21 },
  { id: 'PS', name: 'P/South',   area: 'Borivali South',       zone: 'Western', lat: 19.2121, lng: 72.8594, wmo: 'Harish Kadam',    wmoEmail: 'h.kadam@mcgm.gov.in',     wmoPhone: '9820011041', si: 'Jagdish Mhatre',  siEmail: 'j.mhatre@mcgm.gov.in',   siPhone: '9820011042', risk: 29, clusters: 3,  breeding: 6,  avgRes: 18 },
  { id: 'RC', name: 'R/Central', area: 'Borivali East',        zone: 'Western', lat: 19.2262, lng: 72.8630, wmo: 'Pradeep Surnar',  wmoEmail: 'pr.surnar@mcgm.gov.in',   wmoPhone: '9820011043', si: 'Bhaskar Gore',    siEmail: 'bh.gore@mcgm.gov.in',    siPhone: '9820011044', risk: 27, clusters: 3,  breeding: 5,  avgRes: 17 },
  { id: 'RN', name: 'R/North',   area: 'Dahisar',              zone: 'Western', lat: 19.2517, lng: 72.8560, wmo: 'Sudha Raut',      wmoEmail: 'su.raut2@mcgm.gov.in',    wmoPhone: '9820011045', si: 'Pandurang Supe',  siEmail: 'p.supe@mcgm.gov.in',     siPhone: '9820011046', risk: 24, clusters: 2,  breeding: 5,  avgRes: 15 },
  { id: 'RS', name: 'R/South',   area: 'Kandivali',            zone: 'Western', lat: 19.2049, lng: 72.8427, wmo: 'Nandkumar Dalvi', wmoEmail: 'n.dalvi@mcgm.gov.in',     wmoPhone: '9820011047', si: 'Chandrakant Wag', siEmail: 'c.wag@mcgm.gov.in',      siPhone: '9820011048', risk: 33, clusters: 4,  breeding: 7,  avgRes: 20 },
  { id: 'S',  name: 'S Ward',    area: 'Bhandup',              zone: 'Eastern', lat: 19.1468, lng: 72.9316, wmo: 'Alka Shinde',     wmoEmail: 'a.shinde@mcgm.gov.in',    wmoPhone: '9820011049', si: 'Pravin Mule',     siEmail: 'p.mule@mcgm.gov.in',     siPhone: '9820011050', risk: 42, clusters: 6,  breeding: 11, avgRes: 25 },
  { id: 'T',  name: 'T Ward',    area: 'Mulund',               zone: 'Eastern', lat: 19.1738, lng: 72.9567, wmo: 'Santosh Kapse',   wmoEmail: 'sa.kapse@mcgm.gov.in',    wmoPhone: '9820011051', si: 'Raju Salunkhe',   siEmail: 'r.salunkhe@mcgm.gov.in', siPhone: '9820011052', risk: 37, clusters: 5,  breeding: 9,  avgRes: 22 },
];

export const RISK_COLOR = (risk) => {
  if (risk >= 75) return '#E31E24';
  if (risk >= 50) return '#e07820';
  if (risk >= 30) return '#c8b800';
  return '#1a7a6e';
};

export const RISK_LABEL = (risk) => {
  if (risk >= 75) return 'Critical';
  if (risk >= 50) return 'High';
  if (risk >= 30) return 'Moderate';
  return 'Low';
};

export const RISK_CLASS = (risk) => {
  if (risk >= 75) return 'wcc';
  if (risk >= 50) return 'wch';
  if (risk >= 30) return 'wcm';
  return 'wcl';
};

export const SEV_PILL  = { critical: 'p-crit', severe: 'p-sev', moderate: 'p-mod', minor: 'p-min' };
export const SEV_LABEL = { critical: '🔴 Critical', severe: '🟠 Severe', moderate: '🟡 Moderate', minor: '🟢 Minor' };

export const CATEGORIES = {
  'mosquito-nuisance': 'Mosquito Nuisance',
  'breeding-stagnant': 'Breeding — Stagnant Water',
  'breeding-garbage':  'Breeding — Garbage/Waste',
  'breeding-drain':    'Breeding — Drain/Nullah',
  'water-muddy':       'Contaminated Water',
  'water-smell':       'Bad Smell — Water Supply',
  'water-leakage':     'Pipeline Leakage',
  'sewer-mix':         'Sewage-Water Mixing',
  'garbage':           'Garbage Accumulation',
  'drain-block':       'Blocked Drain',
  'fever-cluster':     'Fever Cluster',
  'dengue-case':       'Suspected Dengue',
  'malaria-case':      'Suspected Malaria',
};

export const ROUTE_MAP = {
  'mosquito-nuisance': 'Insecticide Branch → Ward SI → DMC',
  'breeding-stagnant': 'Solid Waste Mgmt → Ward WMO → MCGM CMD',
  'breeding-garbage':  'Solid Waste Mgmt → Ward WMO → MCGM CMD',
  'breeding-drain':    'Storm Water Drain Dept → Ward AE → SE',
  'water-muddy':       'Hydraulic Engineer → Ward AEH → CWE',
  'water-smell':       'Hydraulic Engineer → Lab Testing → CWE',
  'water-leakage':     'Hydraulic Engineer → Ward AEH → CWE',
  'sewer-mix':         'Sewerage Dept → Ward AE → SE Sewerage',
  'garbage':           'Solid Waste Mgmt → Sanitary Inspector → Ward Officer',
  'drain-block':       'Storm Water Drain Dept → Ward AE → SE',
  'fever-cluster':     'BMC Health Post → Medical Officer → DMO',
  'dengue-case':       'Malaria Dept → DMC → MCGM CHO',
  'malaria-case':      'Malaria Dept → DMC → MCGM CHO',
};
