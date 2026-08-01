import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('matchdays').select('*').order('number', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  console.log("Current matchdays:", data.map(m => ({ id: m.id, number: m.number, status: m.status })));
  
  const toUpdate = data.find(m => m.number === 2);
  if (toUpdate) {
    const { data: updated, error: err } = await supabase.from('matchdays').update({ number: 5 }).eq('id', toUpdate.id).select();
    if (err) console.error("Error updating:", err);
    else console.log("Successfully updated matchday 2 to 5:", updated);
  } else {
    console.log("No matchday with number 2 found.");
  }
}
run();
