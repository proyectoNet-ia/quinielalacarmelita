-- Migration v9: Tabla para guardar suscripciones Push del Administrador
-- Ejecuta este script en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.admin_push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_json JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política de RLS para que usuarios autenticados puedan guardar sus suscripciones
DROP POLICY IF EXISTS "allow_all_admin_push" ON public.admin_push_subscriptions;
CREATE POLICY "allow_all_admin_push" ON public.admin_push_subscriptions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
