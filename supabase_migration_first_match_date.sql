-- Agregar columna para almacenar la fecha y hora del primer partido de la jornada
ALTER TABLE public.matchdays ADD COLUMN IF NOT EXISTS first_match_date TIMESTAMP WITH TIME ZONE;
