const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanTables() {
  console.log("Starting cleanup...");
  
  // We need to delete in reverse order of dependencies
  const tables = [
    'pool_picks',
    'pools',
    'matches',
    'matchdays',
    'seasons'
  ];

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    // Delete all rows by finding those where id is not null
    const { data, error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (error) {
      console.error(`Error clearing ${table}:`, error.message);
    } else {
      console.log(`${table} cleared successfully.`);
    }
  }

  console.log("Cleanup complete!");
}

cleanTables();
