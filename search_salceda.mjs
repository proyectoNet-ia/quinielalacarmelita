import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivakitnhlzcizvjgxdzk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2YWtpdG5obHpjaXp2amd4ZHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzM0MDMsImV4cCI6MjA5ODcwOTQwM30.o8ADLqNchqBnAzqRmNU7FiuS1iucfESNke_Z3Naw9lc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('=== BUSCANDO SALCEDA EN PARTICIPANTES ===');
  const { data: parts } = await supabase.from('participants').select('*').ilike('name', '%salceda%');
  console.log('Participants por nombre:', JSON.stringify(parts, null, 2));

  const { data: partsAlias } = await supabase.from('participants').select('*').ilike('alias', '%salceda%');
  console.log('Participants por alias:', JSON.stringify(partsAlias, null, 2));

  console.log('=== BUSCANDO SALCEDA EN PRE-REGISTROS ===');
  const { data: preReg } = await supabase.from('pre_registrations').select('*').ilike('name', '%salceda%');
  console.log('Pre-registros:', JSON.stringify(preReg, null, 2));

  console.log('=== LISTANDO QUINIELAS JORNADA 6 ===');
  const { data: matchdays } = await supabase.from('matchdays').select('*').eq('number', 6);
  const m6 = matchdays?.[0];
  if (m6) {
    console.log('Matchday 6 ID:', m6.id);
    const { data: pools } = await supabase
      .from('pools')
      .select('id, cost, payment_status, score, created_at, participant_id, participants(name, alias, phone)')
      .eq('matchday_id', m6.id);
    
    console.log(`Total quinielas en Jornada 6: ${pools?.length}`);
    pools?.forEach(p => {
      console.log(`- ID Pool: ${p.id} | ${p.participants?.name} (@${p.participants?.alias}) | Estado: ${p.payment_status} | Tel: ${p.participants?.phone}`);
    });
  }

  console.log('=== BUSCANDO EN TODAS LAS QUINIELAS CUALQUIER USUARIO QUE CONTENGA SALCEDA ===');
  const { data: allParts } = await supabase.from('participants').select('id, name, alias, phone');
  const salcedaPart = allParts?.filter(p => p.name.toLowerCase().includes('salceda') || p.alias.toLowerCase().includes('salceda'));
  console.log('Coincidencias en todos los participantes:', salcedaPart);

  if (salcedaPart && salcedaPart.length > 0) {
    for (const p of salcedaPart) {
      const { data: pPools } = await supabase.from('pools').select('*, matchdays(number)').eq('participant_id', p.id);
      console.log(`Quinielas del usuario ${p.name}:`, pPools);
    }
  }
}

main();
