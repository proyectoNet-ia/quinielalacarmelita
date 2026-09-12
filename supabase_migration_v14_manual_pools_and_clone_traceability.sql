-- =============================================================
-- MIGRACIÓN V14: Trazabilidad de Clonación y Auditoría de Quinielas
-- Quiniela La Carmelita - Copia y pega en el Supabase SQL Editor
-- =============================================================

-- 1. Asegurar columnas de metadatos y trazabilidad en la tabla pools
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS validation_flags TEXT[];
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS reference_code TEXT;

-- 2. Índices de alto rendimiento para consultas rápidas de participantes y predicciones
CREATE INDEX IF NOT EXISTS idx_pools_matchday_part ON public.pools (matchday_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_pool_match ON public.predictions (pool_id, match_id);
CREATE INDEX IF NOT EXISTS idx_participants_phone ON public.participants (phone);

-- 3. Función RPC de Auditoría de Clones en Supabase
-- Compara en tiempo real las quinielas de bots contra las de participantes humanos
CREATE OR REPLACE FUNCTION public.audit_bot_clones(p_matchday_id UUID)
RETURNS TABLE (
  bot_pool_id UUID,
  bot_name TEXT,
  bot_ref_code TEXT,
  clone_of TEXT,
  source_ref TEXT,
  human_owner_name TEXT,
  human_owner_alias TEXT,
  is_exact_match BOOLEAN,
  matching_picks_count INT,
  total_picks_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH bot_pools AS (
    SELECT 
      p.id AS b_pool_id,
      part.name AS b_name,
      p.reference_code AS b_ref,
      p.validation_flags AS b_flags
    FROM public.pools p
    JOIN public.participants part ON part.id = p.participant_id
    WHERE p.matchday_id = p_matchday_id
      AND (part.phone = 'BOT-0000' OR p.reference_code LIKE 'REF-%' OR p.reference_code LIKE 'BT-%' OR p.reference_code LIKE 'BOT-%')
  ),
  human_pools AS (
    SELECT 
      p.id AS h_pool_id,
      part.name AS h_name,
      part.alias AS h_alias,
      p.reference_code AS h_ref
    FROM public.pools p
    JOIN public.participants part ON part.id = p.participant_id
    WHERE p.matchday_id = p_matchday_id
      AND part.phone <> 'BOT-0000'
  )
  SELECT 
    bp.b_pool_id AS bot_pool_id,
    bp.b_name AS bot_name,
    bp.b_ref AS bot_ref_code,
    (SELECT regexp_replace(flag, '^\[CLONE_OF:(.*)\]$', '\1') FROM unnest(bp.b_flags) flag WHERE flag LIKE '[CLONE_OF:%]' LIMIT 1) AS clone_of,
    (SELECT regexp_replace(flag, '^\[SOURCE_REF:(.*)\]$', '\1') FROM unnest(bp.b_flags) flag WHERE flag LIKE '[SOURCE_REF:%]' LIMIT 1) AS source_ref,
    hp.h_name AS human_owner_name,
    hp.h_alias AS human_owner_alias,
    (COUNT(CASE WHEN b_pred.selection = h_pred.selection THEN 1 END) = COUNT(b_pred.id)) AS is_exact_match,
    COUNT(CASE WHEN b_pred.selection = h_pred.selection THEN 1 END)::INT AS matching_picks_count,
    COUNT(b_pred.id)::INT AS total_picks_count
  FROM bot_pools bp
  LEFT JOIN human_pools hp ON bp.b_flags @> ARRAY['[SOURCE_REF:' || hp.h_ref || ']']
  LEFT JOIN public.predictions b_pred ON b_pred.pool_id = bp.b_pool_id
  LEFT JOIN public.predictions h_pred ON h_pred.pool_id = hp.h_pool_id AND h_pred.match_id = b_pred.match_id
  GROUP BY bp.b_pool_id, bp.b_name, bp.b_ref, bp.b_flags, hp.h_name, hp.h_alias;
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_bot_clones(UUID) TO anon, authenticated, service_role;
