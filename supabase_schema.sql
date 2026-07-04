-- SQL Script para inicializar las tablas en Supabase
-- Copia y pega esto en la sección "SQL Editor" de tu panel de Supabase.

-- Habilitar extensión para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Participantes (Usuarios personalizados)
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    alias TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    pin TEXT NOT NULL, -- PIN o contraseña corta de acceso
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Temporadas
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Jornadas (Matchdays)
CREATE TABLE IF NOT EXISTS public.matchdays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'calculated')),
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    price_per_entry NUMERIC DEFAULT 25.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Partidos (Matches)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matchday_id UUID REFERENCES public.matchdays(id) ON DELETE CASCADE,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE,
    result TEXT CHECK (result IN ('L', 'E', 'V', NULL)), -- L: Local, E: Empate, V: Visitante
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Quinielas (Pools)
CREATE TABLE IF NOT EXISTS public.pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    matchday_id UUID REFERENCES public.matchdays(id) ON DELETE CASCADE,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected')),
    payment_receipt_url TEXT, -- Nombre de archivo o URL de la captura de transferencia
    cost NUMERIC DEFAULT 25.00 NOT NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla de Predicciones (Predictions)
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    selection TEXT NOT NULL CHECK (selection IN ('L', 'E', 'V', 'LE', 'LV', 'EV', 'LEV')), -- Soporta dobles y triples
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar un Administrador Inicial por Defecto
-- Nombre: Admin, Alias: admin, PIN: 1234, Teléfono: 0000000000
INSERT INTO public.participants (name, alias, phone, pin, role)
VALUES ('Admin La Carmelita', 'admin', '0000000000', '1234', 'admin')
ON CONFLICT (alias) DO NOTHING;

-- Deshabilitar RLS temporalmente para simplificar la conexión directa desde el frontend
-- sin requerir Supabase Auth (dado que es un registro personalizado)
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchdays DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions DISABLE ROW LEVEL SECURITY;

-- 7. Tabla de Pre-registros (Newsletter / Próximamente)
CREATE TABLE IF NOT EXISTS public.pre_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.pre_registrations DISABLE ROW LEVEL SECURITY;

