import { createClient } from '@supabase/supabase-js';
import { DEMO_COMPLAINTS } from './src/data/demoData.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Fetching existing IDs...');
  const { data, error: err1 } = await supabase.from('complaints').select('id');
  if (err1) {
    console.error('Error fetching existing IDs:', err1);
    return;
  }
  
  const existingIds = new Set((data || []).map(d => d.id));
  const newItems = DEMO_COMPLAINTS.filter(c => !existingIds.has(c.id));
  
  if (newItems.length > 0) {
    console.log(`Inserting ${newItems.length} items...`);
    // Insert in batches of 50 to avoid any limits
    for (let i = 0; i < newItems.length; i += 50) {
      const batch = newItems.slice(i, i + 50);
      const { error: err2 } = await supabase.from('complaints').insert(batch);
      if (err2) {
        console.error('Error inserting data batch:', err2);
      }
    }
    console.log('Seed successful!');
  } else {
    console.log('No new items to insert.');
  }
}

seed();
