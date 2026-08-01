import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env to get Supabase credentials
const envPath = path.resolve('.env');
let envContent = fs.readFileSync(envPath, 'utf8');

const supabaseUrlMatch = envContent.match(/VITE_SUPABASE_URL=([^\n\r]+)/);
const supabaseKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\n\r]+)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error("Credentials not found");
  process.exit(1);
}

const supabase = createClient(supabaseUrlMatch[1], supabaseKeyMatch[1]);

async function run() {
  const { data: matchday, error: mdError } = await supabase.from('matchdays').select('id').eq('number', 5).single();
  if (mdError) {
    console.error("Matchday 5 error:", mdError);
    process.exit(1);
  }
  
  const { data: matches, error: mError } = await supabase.from('matches').select('*').eq('matchday_id', matchday.id);
  
  if (mError) {
    console.error("Matches error:", mError);
    process.exit(1);
  }

  const p6 = matches.find(m => m.home_team.toLowerCase().includes('toluca') || m.home_team.toLowerCase().includes('cruz azul'));
  if (p6) {
    console.log("Found match P6:", p6);
    if (!p6.home_team.includes('||special::')) {
      const { data, error } = await supabase.from('matches').update({ home_team: p6.home_team + '||special::Campeón de Campeones' }).eq('id', p6.id);
      if (error) {
        console.error("Update error:", error);
      } else {
        console.log("Update successful!");
      }
    } else {
      console.log("Match already updated");
    }
  } else {
    console.log("Toluca not found in matchday 5");
  }
  process.exit(0);
}

run();
