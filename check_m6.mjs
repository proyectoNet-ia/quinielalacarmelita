import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivakitnhlzcizvjgxdzk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2YWtpdG5obHpjaXp2amd4ZHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzM0MDMsImV4cCI6MjA5ODcwOTQwM30.o8ADLqNchqBnAzqRmNU7FiuS1iucfESNke_Z3Naw9lc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: matchdays } = await supabase.from('matchdays').select('*').eq('number', 6);
  const m6 = matchdays?.[0];
  console.log('Matchday 6 details:', m6);

  const { data: matches } = await supabase.from('matches').select('*').eq('matchday_id', m6.id);
  console.log('Partidos de la Jornada 6:');
  matches?.forEach((m, idx) => {
    console.log(`${idx + 1}. ${m.home_team} vs ${m.away_team} | Resultado: ${m.result || 'Sin resultado'}`);
  });
}

main();
