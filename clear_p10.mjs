import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('='))
);

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearP10() {
  try {
    const { data: matchdays, error: mErr } = await supabase
      .from('matchdays')
      .select('*')
      .order('number', { ascending: false })
      .limit(1);
      
    if (mErr) throw mErr;
    if (!matchdays || matchdays.length === 0) return console.log('No matchdays found');
    
    const activeMatchday = matchdays[0];
    console.log('Active matchday ID:', activeMatchday.id);
    
    const { data: matches, error: matchesErr } = await supabase
      .from('matches')
      .select('*')
      .eq('matchday_id', activeMatchday.id)
      
    if (matchesErr) throw matchesErr;
    
    const sortedMatches = [...matches].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    if (sortedMatches.length >= 10) {
      const p10 = sortedMatches[9]; // 0-indexed, so 9 is P10
      console.log('P10 Match ID:', p10.id, 'Result:', p10.result);
      
      const { error: updateErr } = await supabase
        .from('matches')
        .update({ result: null })
        .eq('id', p10.id);
        
      if (updateErr) throw updateErr;
      console.log('Successfully cleared P10 result!');
    } else {
      console.log('Less than 10 matches found:', sortedMatches.length);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

clearP10();
