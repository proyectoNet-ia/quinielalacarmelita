-- Migración V2: Lógica de Jornadas y Partidos de Reserva

-- 1. Modificar la restricción de 'status' en la tabla 'matchdays' para soportar 'inactive'
ALTER TABLE public.matchdays DROP CONSTRAINT IF EXISTS matchdays_status_check;
ALTER TABLE public.matchdays ADD CONSTRAINT matchdays_status_check CHECK (status IN ('inactive', 'active', 'closed', 'calculated'));

-- 2. Modificar la tabla 'matches' para soportar partidos de reserva
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_reserve BOOLEAN DEFAULT false;

-- 3. Modificar la restricción de 'result' en 'matches' para soportar anulación ('A')
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_result_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_result_check CHECK (result IN ('L', 'E', 'V', 'A', NULL));
