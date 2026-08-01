-- Migración V4: Soporte para premios fijos de 1er y 2do lugar

ALTER TABLE public.matchdays ADD COLUMN IF NOT EXISTS prize_type TEXT DEFAULT 'percentage' CHECK (prize_type IN ('percentage', 'fixed'));
ALTER TABLE public.matchdays ADD COLUMN IF NOT EXISTS fixed_prize_1st NUMERIC DEFAULT 0.00;
ALTER TABLE public.matchdays ADD COLUMN IF NOT EXISTS fixed_prize_2nd NUMERIC DEFAULT 0.00;
