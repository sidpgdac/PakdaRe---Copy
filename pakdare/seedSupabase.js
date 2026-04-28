import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from pakdare directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ward data with center coordinates
const WARDS = [
  { id: 'A', name: 'A Ward', area: 'Colaba / Fort', lat: 18.9067, lng: 72.8147 },
  { id: 'B', name: 'B Ward', area: 'Mazgaon / Byculla', lat: 18.9601, lng: 72.8359 },
  { id: 'C', name: 'C Ward', area: 'Matunga / Parel', lat: 19.0096, lng: 72.8479 },
  { id: 'D', name: 'D Ward', area: 'Worli', lat: 19.0119, lng: 72.8157 },
  { id: 'E', name: 'E Ward', area: 'Byculla / Sion', lat: 18.9784, lng: 72.8509 },
  { id: 'FN', name: 'F/North', area: 'Matunga East', lat: 19.0250, lng: 72.8450 },
  { id: 'FS', name: 'F/South', area: 'Dharavi', lat: 19.0412, lng: 72.8530 },
  { id: 'GN', name: 'G/North', area: 'Dharavi Area', lat: 19.0530, lng: 72.8430 },
  { id: 'GS', name: 'G/South', area: 'Dadar West', lat: 19.0197, lng: 72.8410 },
  { id: 'HE', name: 'H/East', area: 'Bandra East', lat: 19.0596, lng: 72.8558 },
  { id: 'HW', name: 'H/West', area: 'Bandra West', lat: 19.0607, lng: 72.8369 },
  { id: 'KE', name: 'K/East', area: 'Andheri East', lat: 19.1136, lng: 72.8697 },
  { id: 'KW', name: 'K/West', area: 'Andheri West', lat: 19.1366, lng: 72.8296 },
  { id: 'KN', name: 'K/North', area: 'Jogeshwari / Vile Parle', lat: 19.1480, lng: 72.8490 },
  { id: 'L', name: 'L Ward', area: 'Kurla', lat: 19.0726, lng: 72.8826 },
  { id: 'ME', name: 'M/East', area: 'Govandi', lat: 19.0624, lng: 72.9215 },
  { id: 'MW', name: 'M/West', area: 'Chembur', lat: 19.0559, lng: 72.8997 },
  { id: 'N', name: 'N Ward', area: 'Ghatkopar', lat: 19.0858, lng: 72.9088 },
  { id: 'PE', name: 'P/East', area: 'Mahim / Sion', lat: 19.0450, lng: 72.8380 },
  { id: 'PN', name: 'P/North', area: 'Goregaon', lat: 19.1601, lng: 72.8491 },
  { id: 'PS', name: 'P/South', area: 'Borivali South', lat: 19.2121, lng: 72.8594 },
  { id: 'RC', name: 'R/Central', area: 'Borivali East', lat: 19.2262, lng: 72.8630 },
  { id: 'RN', name: 'R/North', area: 'Dahisar', lat: 19.2517, lng: 72.8560 },
  { id: 'RS', name: 'R/South', area: 'Kandivali', lat: 19.2049, lng: 72.8427 },
  { id: 'S', name: 'S Ward', area: 'Bhandup', lat: 19.1468, lng: 72.9316 },
  { id: 'T', name: 'T Ward', area: 'Mulund', lat: 19.1738, lng: 72.9567 },
];

const CATEGORIES = [
  'mosquito-nuisance', 'breeding-stagnant', 'breeding-garbage', 'breeding-drain',
  'water-muddy', 'water-smell', 'water-leakage', 'sewer-mix', 'garbage',
  'drain-block', 'fever-cluster', 'dengue-case', 'malaria-case'
];

const SEVERITIES = ['minor', 'moderate', 'severe', 'critical'];
const STATUSES = ['Pending', 'In Progress', 'Resolved'];

// Helper to get random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Generate a random date within the last 'days'
const randomDate = (days) => {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * days * 24 * 60 * 60 * 1000);
  return past.toISOString();
};

const DUMMY_DESCRIPTIONS = [
  "Stagnant water found near the construction site.",
  "Garbage hasn't been collected for 4 days.",
  "Foul smell coming from the tap water.",
  "Water pipeline leaking heavily causing water logging.",
  "Many people in the society complaining about fever.",
  "Open drain breeding mosquitoes.",
  "Suspected dengue cases in the neighborhood.",
  "Sewage water overflowing onto the main road."
];

async function seed() {
  const { count, error } = await supabase
    .from('complaints')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error("Failed to count existing complaints:", error);
    return;
  }

  const targetCount = 1048;
  const needed = targetCount - count;

  if (needed <= 0) {
    console.log(`Database already has ${count} complaints. No more needed to reach ${targetCount}.`);
    return;
  }

  console.log(`Currently have ${count} complaints. Generating ${needed} more dummy complaints...`);
  const complaints = [];

  for (let i = 0; i < needed; i++) {
    const ward = randomItem(WARDS);
    
    // Add small random offset (approx within 1-2km) to ward center to keep it on land
    // +/- 0.015 degrees is roughly +/- 1.6km
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;
    const lat = ward.lat + latOffset;
    const lng = ward.lng + lngOffset;

    const time = randomDate(60); // within last 60 days
    const status = randomItem(STATUSES);
    const resolved = status === 'Resolved';
    const resolvedAt = resolved ? new Date(new Date(time).getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null; // Resolved within 7 days
    
    // Pick appropriate severity based on category
    const category = randomItem(CATEGORIES);
    let severity = randomItem(SEVERITIES);
    if (category === 'dengue-case' || category === 'malaria-case' || category === 'fever-cluster') {
       severity = Math.random() > 0.5 ? 'critical' : 'severe';
    }

    complaints.push({
      id: `DUMMY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ward: ward.id,
      location: `${ward.area} Sector ${Math.floor(Math.random() * 10) + 1}`,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      category,
      severity,
      desc: randomItem(DUMMY_DESCRIPTIONS),
      status,
      time,
      resolved,
      resolvedAt,
      isDemo: false,
      escalations: Math.floor(Math.random() * 3),
      hierarchy: 1,
      photos: [],
      resolutionOfficer: resolved ? 'System Generated Officer' : null,
      gpsVerified: Math.random() > 0.3
    });
  }

  console.log(`Inserting ${complaints.length} complaints into Supabase in batches...`);
  
  const batchSize = 100;
  for (let i = 0; i < complaints.length; i += batchSize) {
    const batch = complaints.slice(i, i + batchSize);
    const { error } = await supabase.from('complaints').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      console.log(`Successfully inserted batch ${i / batchSize + 1}/${Math.ceil(complaints.length / batchSize)}`);
    }
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
