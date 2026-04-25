// Full 26 BMC Ward data with exact IDs, officer details, SLA hours
export const SLA_HOURS = { critical: 4, severe: 12, moderate: 24, minor: 48 };

export const WARDS = [
  { id: 'A',  name: 'A Ward',    area: 'Colaba / Fort',        zone: 'City',    lat: 18.9067, lng: 72.8147, wmo: 'Dr. Praful Yadav',    wmoEmail: 'moha.phd@mcgm.gov.in',    wmoPhone: '9821890590', siTeam: [{name: 'Shri Kulkarni Prashant B.', phone: '9869321011'}], risk: 28, clusters: 3,  breeding: 5,  avgRes: 18 },
  { id: 'B',  name: 'B Ward',    area: 'Mazgaon / Byculla',    zone: 'City',    lat: 18.9601, lng: 72.8359, wmo: 'Dr. Praful Yadav',    wmoEmail: 'mohb.phd@mcgm.gov.in',    wmoPhone: '9821890590', siTeam: [], risk: 45, clusters: 6,  breeding: 11, avgRes: 26 },
  { id: 'C',  name: 'C Ward',    area: 'Matunga / Parel',      zone: 'City',    lat: 19.0096, lng: 72.8479, wmo: 'Dr. Onkar Todkari',   wmoEmail: 'mohc.phd@mcgm.gov.in',    wmoPhone: '7666499651', siTeam: [{name: 'Shri Phalke Sanjay M.', phone: '7738951074'}], risk: 38, clusters: 5,  breeding: 9,  avgRes: 22 },
  { id: 'D',  name: 'D Ward',    area: 'Worli',                zone: 'City',    lat: 19.0119, lng: 72.8157, wmo: 'Dr. Onkar Todkari',   wmoEmail: 'mohd.phd@mcgm.gov.in',    wmoPhone: '7666499651', siTeam: [{name: 'Shri Chavan Sunil D.', phone: '8657532353'}], risk: 31, clusters: 4,  breeding: 7,  avgRes: 20 },
  { id: 'E',  name: 'E Ward',    area: 'Byculla / Sion',       zone: 'City',    lat: 18.9784, lng: 72.8509, wmo: 'Dr. Nitish Thakur',   wmoEmail: 'mohe02.phd@mcgm.gov.in',  wmoPhone: '9920917275', siTeam: [{name: 'Shri Tripathi Brijeshkumar', phone: '9004136842'}, {name: 'Shri Prasanna Bhakhandra', phone: '9869273192'}, {name: 'Shri Patil Sunil R.', phone: '8356025747'}, {name: 'Shri Kadam Pravin K.', phone: '7264906688'}], risk: 52, clusters: 7,  breeding: 14, avgRes: 31 },
  { id: 'FN', name: 'F/North',   area: 'Matunga East',         zone: 'City',    lat: 19.0250, lng: 72.8450, wmo: 'Dr. Rahul Salunkhe',  wmoEmail: 'mohfn.phd@mcgm.gov.in',   wmoPhone: '7666999800', siTeam: [{name: 'Shri Ubale Arunodhay D.', phone: '9819363545'}], risk: 44, clusters: 6,  breeding: 12, avgRes: 28 },
  { id: 'FS', name: 'F/South',   area: 'Dharavi',              zone: 'City',    lat: 19.0412, lng: 72.8530, wmo: 'Dr. Madhav Swami',    wmoEmail: 'mohfs.phd@mcgm.gov.in',   wmoPhone: '9975136721', siTeam: [{name: 'Smt. Charusheela Vivek K.', phone: '9969019375'}, {name: 'Shri Dhangar Arun D.', phone: '9867793280'}, {name: 'Shri Raorane Vijaysingh', phone: '9969448493'}], risk: 78, clusters: 14, breeding: 28, avgRes: 48 },
  { id: 'GN', name: 'G/North',   area: 'Dharavi Area',         zone: 'Western', lat: 19.0530, lng: 72.8430, wmo: 'Dr. Balasaheb Kawale', wmoEmail: 'mohgn.phd@mcgm.gov.in',   wmoPhone: '7303721711', siTeam: [{name: 'Shri Shetty Annanda K.', phone: '9920942053'}], risk: 65, clusters: 11, breeding: 22, avgRes: 40 },
  { id: 'GS', name: 'G/South',   area: 'Dadar West',           zone: 'Western', lat: 19.0197, lng: 72.8410, wmo: 'Dr. Virendra Mohite',  wmoEmail: 'mohgs.phd@mcgm.gov.in',   wmoPhone: '9920759822', siTeam: [{name: 'Shri Sawant Rajesh J.', phone: '9819587363'}], risk: 22, clusters: 2,  breeding: 4,  avgRes: 14 },
  { id: 'HE', name: 'H/East',    area: 'Bandra East',          zone: 'Western', lat: 19.0596, lng: 72.8558, wmo: 'Dr. Prajakta Amberkar', wmoEmail: 'mohhe.phd@mcgm.gov.in',  wmoPhone: '9920759820', siTeam: [{name: 'Shri Bajwa Sarabjitsing', phone: '9800000000'}], risk: 41, clusters: 5,  breeding: 10, avgRes: 24 },
  { id: 'HW', name: 'H/West',    area: 'Bandra West',          zone: 'Western', lat: 19.0607, lng: 72.8369, wmo: 'Dr. Nilesh Palve',    wmoEmail: 'mohhw.phd@mcgm.gov.in',   wmoPhone: '9920759835', siTeam: [{name: 'Shri Chavahan Sanjeev T.', phone: '9800000001'}], risk: 19, clusters: 2,  breeding: 3,  avgRes: 12 },
  { id: 'KE', name: 'K/East',    area: 'Andheri East',         zone: 'Western', lat: 19.1136, lng: 72.8697, wmo: 'Dr. Mahendra Khandade', wmoEmail: 'mohke.phd@mcgm.gov.in',  wmoPhone: '9870518182', siTeam: [{name: 'Shri Nalawade Sharad M.', phone: '9653148268'}, {name: 'Shri Godik Ganesh Y.', phone: '9869484550'}], risk: 88, clusters: 18, breeding: 35, avgRes: 62 },
  { id: 'KW', name: 'K/West',    area: 'Andheri West',         zone: 'Western', lat: 19.1366, lng: 72.8296, wmo: 'Dr. Vaishali Khade',   wmoEmail: 'mohkw.phd@mcgm.gov.in',   wmoPhone: '9892613954', siTeam: [{name: 'Shri Mulani Firoz H.', phone: '9867232926'}, {name: 'Shri Mulik Chandrashekhar', phone: '9000000000'}], risk: 55, clusters: 8,  breeding: 17, avgRes: 33 },
  { id: 'KN', name: 'K/North',   area: 'Jogeshwari / Vile Parle', zone: 'Western', lat: 19.1480, lng: 72.8490, wmo: 'Dr. Mahendra Khandade', wmoEmail: 'mohk.phd@mcgm.gov.in',   wmoPhone: '9870518182', siTeam: [], risk: 49, clusters: 7,  breeding: 13, avgRes: 30 },
  { id: 'L',  name: 'L Ward',    area: 'Kurla',                zone: 'Eastern', lat: 19.0726, lng: 72.8826, wmo: 'Dr. Satish Badgire',   wmoEmail: 'mohward@gmail.com',       wmoPhone: '9920759920', siTeam: [{name: 'Shri Nayadu Balamrughan', phone: '9892692777'}], risk: 74, clusters: 13, breeding: 26, avgRes: 45 },
  { id: 'ME', name: 'M/East',    area: 'Govandi',              zone: 'Eastern', lat: 19.0624, lng: 72.9215, wmo: 'Dr. Ravindra Hange',   wmoEmail: 'mohme.phd@mcgm.gov.in',   wmoPhone: '9222195129', siTeam: [{name: 'Shri Dhumal Hanumant D.', phone: '7977139769'}, {name: 'Smt. Garud Surekha R.', phone: '9769956506'}], risk: 92, clusters: 21, breeding: 42, avgRes: 70 },
  { id: 'MW', name: 'M/West',    area: 'Chembur',              zone: 'Eastern', lat: 19.0559, lng: 72.8997, wmo: 'Dr. Deepa Jadhav',     wmoEmail: 'mohmw.phd@mcgm.gov.in',   wmoPhone: '9004042736', siTeam: [{name: 'Shri Kalaymurti Tangwel', phone: '9000000000'}, {name: 'Shri Sawant Suresh Waman', phone: '9000000001'}, {name: 'Shri Dabolkar Sushil Jayram', phone: '9000000002'}, {name: 'Shri Kadam Vinod Shankarrao', phone: '9224146516'}, {name: 'Shri Kawale Rohit Dattaram', phone: '9892487402'}], risk: 48, clusters: 7,  breeding: 15, avgRes: 29 },
  { id: 'N',  name: 'N Ward',    area: 'Ghatkopar',            zone: 'Eastern', lat: 19.0858, lng: 72.9088, wmo: 'Dr. Ravindra Hange',   wmoEmail: 'mohn.phd@mcgm.gov.in',    wmoPhone: '9222195129', siTeam: [{name: 'Shri Gupte Sunil R.', phone: '9820229616'}, {name: 'Shri Bharanker Sandeep', phone: '7715924645'}, {name: 'Shri Nambhalkar Sanjay', phone: '8779582047'}, {name: 'Shri Parab Santosh', phone: '9967911029'}], risk: 60, clusters: 10, breeding: 20, avgRes: 37 },
  { id: 'PE', name: 'P/East',    area: 'Mahim / Sion',         zone: 'Western', lat: 19.0450, lng: 72.8380, wmo: 'Dr. Tulsidas Karpe',   wmoEmail: 'mohpe.phd@mcgm.gov.in',   wmoPhone: '7303217007', siTeam: [{name: 'Smt. Jadhav Smita S.', phone: '9930305661'}, {name: 'Shri Aaroghyaswami Chinapa', phone: '9821425412'}], risk: 40, clusters: 5,  breeding: 10, avgRes: 25 },
  { id: 'PN', name: 'P/North',   area: 'Goregaon',             zone: 'Western', lat: 19.1601, lng: 72.8491, wmo: 'Dr. Tulsidas Karpe',   wmoEmail: 'mohpn.phd@mcgm.gov.in',   wmoPhone: '7303217007', siTeam: [{name: 'Shri Indulkar Arun Bhau', phone: '9004302597'}, {name: 'Shri Nive Deepak K.', phone: '9326832274'}], risk: 35, clusters: 4,  breeding: 8,  avgRes: 21 },
  { id: 'PS', name: 'P/South',   area: 'Borivali South',       zone: 'Western', lat: 19.2121, lng: 72.8594, wmo: 'Dr. Ajit Pampatwar',   wmoEmail: 'mohps.phd@mcgm.gov.in',   wmoPhone: '9967439356', siTeam: [{name: 'Shri Chavan Mahendra D.', phone: '7678034358'}, {name: 'Shri Girkar Rahman Khan', phone: '9167980488'}, {name: 'Shri Gaikwad Kailas T.', phone: '9987200053'}], risk: 29, clusters: 3,  breeding: 6,  avgRes: 18 },
  { id: 'RC', name: 'R/Central', area: 'Borivali East',        zone: 'Western', lat: 19.2262, lng: 72.8630, wmo: 'Dr. Rashmi Shirgaonkar', wmoEmail: 'mohrc.phd@mcgm.gov.in', wmoPhone: '9987876426', siTeam: [{name: 'Smt. Malondkar Shraddha', phone: '9900000000'}, {name: 'Shri Tripathi Manoj M.', phone: '9900000001'}], risk: 27, clusters: 3,  breeding: 5,  avgRes: 17 },
  { id: 'RN', name: 'R/North',   area: 'Dahisar',              zone: 'Western', lat: 19.2517, lng: 72.8560, wmo: 'Dr. Sunila K. Pawar',  wmoEmail: 'mohrn.phd@mcgm.gov.in',   wmoPhone: '9920973770', siTeam: [{name: 'Shri Purandare Sandesh S.', phone: '9900000001'}, {name: 'Shri Sarvade Dilip S.', phone: '9900000002'}], risk: 24, clusters: 2,  breeding: 5,  avgRes: 15 },
  { id: 'RS', name: 'R/South',   area: 'Kandivali',            zone: 'Western', lat: 19.2049, lng: 72.8427, wmo: 'Dr. Pooja Desai',      wmoEmail: 'mohrs.phd@mcgm.gov.in',   wmoPhone: '7738892533', siTeam: [{name: 'Shri Kadam Ganesh S.', phone: '9900000002'}, {name: 'Shri Sutar Ashok J.', phone: '9900000003'}], risk: 33, clusters: 4,  breeding: 7,  avgRes: 20 },
  { id: 'S',  name: 'S Ward',    area: 'Bhandup',              zone: 'Eastern', lat: 19.1468, lng: 72.9316, wmo: 'Dr. Kalpesh Bhalerao', wmoEmail: 'mohs.phd@mcgm.gov.in',    wmoPhone: '9870513100', siTeam: [{name: 'Shri Khamkar Balu Taji', phone: '9769056668'}, {name: 'Shri Bane Sanjay R.', phone: '9022070795'}, {name: 'Shri Jadhav Ravindra J.', phone: '9000000000'}], risk: 42, clusters: 6,  breeding: 11, avgRes: 25 },
  { id: 'T',  name: 'T Ward',    area: 'Mulund',               zone: 'Eastern', lat: 19.1738, lng: 72.9567, wmo: 'Dr. Kashinath Jadhav', wmoEmail: 'moht.phd@mcgm.gov.in',    wmoPhone: '9869512190', siTeam: [{name: 'Shri Chavan Eknath S.', phone: '8097753342'}, {name: 'Shri Patil Kiran K.', phone: '9821245711'}], risk: 37, clusters: 5,  breeding: 9,  avgRes: 22 },
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
