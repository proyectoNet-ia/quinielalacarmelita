-- Migración V6: Soporte para Promociones Públicas vs Privadas (Uso exclusivo ADMIN)
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;
