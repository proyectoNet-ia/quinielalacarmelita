-- =============================================================
-- MIGRACIÓN V11: Limpieza de Nombres Numéricos en Bots Existentes
-- Quiniela La Carmelita - Ejecutar en Supabase SQL Editor
-- =============================================================

-- 1. Eliminar sufijos numéricos (ej. "Diego Solís 24" -> "Diego Solís")
UPDATE public.participants
SET 
  name = REGEXP_REPLACE(TRIM(name), '\s+\d+\s*$', ''),
  alias = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(name), '\s+\d+\s*$', ''), '[^a-zA-Z0-9]', '', 'g')) || FLOOR(100 + RANDOM() * 900)::text
WHERE (phone = 'BOT-0000' OR name ~ '\s+\d+\s*$')
  AND name ~ '\d';

-- 2. Asegurar política pública de UPDATE para correcciones rápidas de participantes si se requiere
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'participants' AND policyname = 'public_update_participants'
  ) THEN
    CREATE POLICY "public_update_participants" ON public.participants
      FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
