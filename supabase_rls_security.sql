-- =============================================================
-- MIGRACIÓN DE SEGURIDAD: Habilitar RLS en todas las tablas
-- Quiniela La Carmelita - Ejecutar en Supabase SQL Editor
-- =============================================================

-- ============================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================
ALTER TABLE public.participants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchdays             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. ELIMINAR POLÍTICAS EXISTENTES (limpieza antes de crear)
-- ============================================================
DROP POLICY IF EXISTS "public_read_seasons"              ON public.seasons;
DROP POLICY IF EXISTS "admin_all_seasons"                ON public.seasons;
DROP POLICY IF EXISTS "public_read_matchdays"            ON public.matchdays;
DROP POLICY IF EXISTS "admin_all_matchdays"              ON public.matchdays;
DROP POLICY IF EXISTS "public_read_matches"              ON public.matches;
DROP POLICY IF EXISTS "admin_all_matches"                ON public.matches;
DROP POLICY IF EXISTS "public_read_teams"                ON public.teams;
DROP POLICY IF EXISTS "admin_all_teams"                  ON public.teams;
DROP POLICY IF EXISTS "public_read_leagues"              ON public.leagues;
DROP POLICY IF EXISTS "admin_all_leagues"                ON public.leagues;
DROP POLICY IF EXISTS "public_read_bank_accounts"        ON public.bank_accounts;
DROP POLICY IF EXISTS "admin_all_bank_accounts"          ON public.bank_accounts;
DROP POLICY IF EXISTS "public_insert_participants"       ON public.participants;
DROP POLICY IF EXISTS "public_select_participants"       ON public.participants;
DROP POLICY IF EXISTS "admin_all_participants"           ON public.participants;
DROP POLICY IF EXISTS "public_insert_pools"              ON public.pools;
DROP POLICY IF EXISTS "public_select_pools_by_ref"       ON public.pools;
DROP POLICY IF EXISTS "public_update_pools_receipt"      ON public.pools;
DROP POLICY IF EXISTS "admin_all_pools"                  ON public.pools;
DROP POLICY IF EXISTS "public_insert_predictions"        ON public.predictions;
DROP POLICY IF EXISTS "public_select_predictions"        ON public.predictions;
DROP POLICY IF EXISTS "admin_all_predictions"            ON public.predictions;
DROP POLICY IF EXISTS "public_insert_pre_registrations"  ON public.pre_registrations;
DROP POLICY IF EXISTS "admin_all_pre_registrations"      ON public.pre_registrations;

-- ============================================================
-- 3. TABLAS DE LECTURA PÚBLICA (datos de la quiniela)
--    Cualquiera puede leer. Solo admin (auth) puede modificar.
-- ============================================================

-- SEASONS
CREATE POLICY "public_read_seasons" ON public.seasons
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_seasons" ON public.seasons
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- MATCHDAYS
CREATE POLICY "public_read_matchdays" ON public.matchdays
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_matchdays" ON public.matchdays
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- MATCHES
CREATE POLICY "public_read_matches" ON public.matches
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_matches" ON public.matches
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- TEAMS
CREATE POLICY "public_read_teams" ON public.teams
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_teams" ON public.teams
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- LEAGUES
CREATE POLICY "public_read_leagues" ON public.leagues
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_leagues" ON public.leagues
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- BANK_ACCOUNTS
CREATE POLICY "public_read_bank_accounts" ON public.bank_accounts
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_bank_accounts" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. PARTICIPANTS
--    - Cualquiera puede INSERT (registrarse anónimamente)
--    - Cualquiera puede SELECT (necesario para buscar por alias
--      y validar nombres duplicados)
--    - Solo admin puede UPDATE / DELETE
-- ============================================================

CREATE POLICY "public_insert_participants" ON public.participants
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_select_participants" ON public.participants
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_all_participants" ON public.participants
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. POOLS
--    - Cualquiera puede INSERT (enviar quiniela)
--    - Cualquiera puede SELECT (ver su ticket con su código)
--    - Cualquiera puede UPDATE su recibo de pago (upload voucher)
--      pero SOLO si la pool sigue en estado "pending"
--    - Solo admin puede aprobar/rechazar (UPDATE status) y DELETE
-- ============================================================

CREATE POLICY "public_insert_pools" ON public.pools
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_select_pools_by_ref" ON public.pools
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public_update_pools_receipt" ON public.pools
  FOR UPDATE TO anon, authenticated
  USING (payment_status = 'pending')
  WITH CHECK (payment_status = 'pending');

CREATE POLICY "admin_all_pools" ON public.pools
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 6. PREDICTIONS
--    - Cualquiera puede INSERT (sus predicciones)
--    - Cualquiera puede SELECT (para ver resultados)
--    - Solo admin puede UPDATE / DELETE
-- ============================================================

CREATE POLICY "public_insert_predictions" ON public.predictions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_select_predictions" ON public.predictions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_all_predictions" ON public.predictions
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 7. PRE_REGISTRATIONS
--    - Cualquiera puede INSERT (suscribirse)
--    - Solo admin puede leer y gestionar
-- ============================================================

CREATE POLICY "public_insert_pre_registrations" ON public.pre_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admin_all_pre_registrations" ON public.pre_registrations
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FIN DE LA MIGRACIÓN DE SEGURIDAD
-- ============================================================
