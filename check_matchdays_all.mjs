import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ivakitnhlzcizvjgxdzk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2YWtpdG5obHpjaXp2amd4ZHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzM0MDMsImV4cCI6MjA5ODcwOTQwM30.o8ADLqNchqBnAzqRmNU7FiuS1iucfESNke_Z3Naw9lc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMatchdays() {
  const { data: matchdays } = await supabase
    .from('matchdays')
    .select('id, number, season_id, status, seasons(name, is_active)')
    .eq('number', 1);

  console.log("All Matchdays with number = 1:");
  console.log(JSON.stringify(matchdays, null, 2));
}

checkMatchdays();
