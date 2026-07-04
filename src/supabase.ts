import { createClient } from '@supabase/supabase-js';

// Reemplaza estos valores con las credenciales de tu proyecto de Supabase.
// Se recomienda configurar un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'tu-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
