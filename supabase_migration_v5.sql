-- Migración V5: Sistema de Códigos de Promoción (Precios Especiales)

CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed_price', 'fixed_discount', 'percentage')),
    discount_value NUMERIC NOT NULL,
    min_entries INTEGER DEFAULT 2 NOT NULL,
    max_uses INTEGER,
    times_used INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    matchday_id UUID REFERENCES public.matchdays(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar permisos de acceso total en Supabase (Disable RLS + Política Permisiva)
ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_promo_codes" ON public.promo_codes;
CREATE POLICY "public_all_promo_codes" ON public.promo_codes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Agregar columna promo_code opcional en la tabla pools
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS promo_code TEXT;
