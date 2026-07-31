-- Migration v7: Batch recalculate matchday scores atomically in PostgreSQL
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.recalculate_matchday_scores(p_matchday_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pool_count INT := 0;
  v_updated_count INT := 0;
BEGIN
  -- 1. Actualizar puntos de todas las quinielas aprobadas de la jornada en una sola consulta
  WITH pool_scores AS (
    SELECT 
      p.id AS pool_id,
      COUNT(pr.id) FILTER (
        WHERE m.result IS NOT NULL 
          AND pr.selection LIKE '%' || m.result || '%'
      ) AS calc_score
    FROM public.pools p
    JOIN public.predictions pr ON pr.pool_id = p.id
    JOIN public.matches m ON m.id = pr.match_id
    WHERE p.matchday_id = p_matchday_id
      AND p.payment_status = 'approved'
    GROUP BY p.id
  )
  UPDATE public.pools target
  SET score = ps.calc_score
  FROM pool_scores ps
  WHERE target.id = ps.pool_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'pools_updated', v_updated_count
  );
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados y anónimos (si RLS lo permite)
GRANT EXECUTE ON FUNCTION public.recalculate_matchday_scores(UUID) TO anon, authenticated, service_role;
