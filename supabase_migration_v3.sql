-- Migración V3: Agregar soporte para porcentaje de bolsa de premios configurable en las jornadas

ALTER TABLE public.matchdays ADD COLUMN IF NOT EXISTS prize_percentage NUMERIC DEFAULT 80.00 NOT NULL;
