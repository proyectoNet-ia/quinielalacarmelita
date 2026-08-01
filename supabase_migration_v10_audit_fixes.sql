-- =============================================================
-- MIGRACIÓN V10: AUDITORÍA DE SEGURIDAD, REGISTRO ATÓMICO Y RECÁLCULO
-- Quiniela La Carmelita - Ejecutar en Supabase SQL Editor
-- =============================================================

-- 1. CORRECCIÓN Y OPTIMIZACIÓN ULTRA-RÁPIDA DE PUNTAJES EN 1 SOLO REQUEST
CREATE OR REPLACE FUNCTION public.recalculate_matchday_scores(
  p_matchday_id UUID,
  p_match_results JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INT := 0;
  v_match_item JSONB;
  v_m_id UUID;
  v_m_res TEXT;
BEGIN
  -- Actualizar resultados de partidos en la BD si fueron proporcionados
  IF p_match_results IS NOT NULL AND jsonb_array_length(p_match_results) > 0 THEN
    FOR v_match_item IN SELECT * FROM jsonb_array_elements(p_match_results)
    LOOP
      v_m_id := (v_match_item->>'id')::uuid;
      v_m_res := v_match_item->>'result';
      UPDATE public.matches 
      SET result = v_m_res 
      WHERE id = v_m_id;
    END LOOP;
  END IF;

  -- Recalcular puntos de todas las quinielas en 1 sola consulta SQL atómica
  -- (Partidos anulados 'A' NO otorgan puntos)
  WITH pool_scores AS (
    SELECT 
      p.id AS pool_id,
      COUNT(pr.id) FILTER (
        WHERE m.result IS NOT NULL 
          AND m.result IN ('L', 'E', 'V')
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
GRANT EXECUTE ON FUNCTION public.recalculate_matchday_scores(UUID, JSONB) TO anon, authenticated, service_role;

-- 2. REGISTRO ATÓMICO DE QUINIELAS (RPC submit_pool_cart)
CREATE OR REPLACE FUNCTION public.submit_pool_cart(
  p_participant_name TEXT,
  p_participant_phone TEXT,
  p_matchday_id UUID,
  p_reference_code TEXT,
  p_entry_price NUMERIC,
  p_promo_code TEXT DEFAULT NULL,
  p_cart JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant_id UUID;
  v_matchday_status TEXT;
  v_deadline TIMESTAMPTZ;
  v_pool_item JSONB;
  v_new_pool_id UUID;
  v_match_id TEXT;
  v_selection TEXT;
  v_pools_created INT := 0;
BEGIN
  -- Validar Jornada y Deadline
  SELECT status, deadline INTO v_matchday_status, v_deadline
  FROM public.matchdays
  WHERE id = p_matchday_id;

  IF v_matchday_status IS NULL THEN
    RAISE EXCEPTION 'La jornada especificada no existe.';
  END IF;

  IF v_matchday_status != 'active' OR (v_deadline IS NOT NULL AND timezone('utc'::text, now()) > v_deadline) THEN
    RAISE EXCEPTION 'No se pueden registrar quinielas: la jornada ya cerró o ha expirado.';
  END IF;

  -- Buscar o crear Participante
  SELECT id INTO v_participant_id
  FROM public.participants
  WHERE alias = p_participant_name
  LIMIT 1;

  IF v_participant_id IS NULL THEN
    INSERT INTO public.participants (name, alias, phone, pin)
    VALUES (p_participant_name, p_participant_name, p_participant_phone, floor(1000 + random() * 9000)::text)
    RETURNING id INTO v_participant_id;
  END IF;

  -- Incrementar Promo Code de forma atómica si aplica
  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    UPDATE public.promo_codes
    SET times_used = times_used + 1
    WHERE code = p_promo_code AND is_active = true;
  END IF;

  -- Procesar Carrito de Quinielas
  FOR v_pool_item IN SELECT * FROM jsonb_array_elements(p_cart)
  LOOP
    INSERT INTO public.pools (
      participant_id,
      matchday_id,
      payment_status,
      cost,
      score,
      reference_code,
      promo_code
    ) VALUES (
      v_participant_id,
      p_matchday_id,
      'pending',
      p_entry_price,
      0,
      p_reference_code,
      p_promo_code
    ) RETURNING id INTO v_new_pool_id;

    v_pools_created := v_pools_created + 1;

    -- Insertar Predicciones de este boleto
    FOR v_match_id, v_selection IN SELECT * FROM jsonb_each_text(v_pool_item)
    LOOP
      INSERT INTO public.predictions (pool_id, match_id, selection)
      VALUES (v_new_pool_id, v_match_id::uuid, v_selection);
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reference_code', p_reference_code,
    'pools_created', v_pools_created,
    'participant_id', v_participant_id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_pool_cart(TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, JSONB) TO anon, authenticated, service_role;

-- 3. CIBERSEGURIDAD CLOUD: TRIGGER DE PROTECCIÓN EN POOLS
CREATE OR REPLACE FUNCTION public.check_pool_anon_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.uid() IS NULL) THEN
    IF (OLD.score IS DISTINCT FROM NEW.score OR 
        OLD.cost IS DISTINCT FROM NEW.cost OR 
        OLD.participant_id IS DISTINCT FROM NEW.participant_id OR
        OLD.matchday_id IS DISTINCT FROM NEW.matchday_id OR
        OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
      RAISE EXCEPTION 'Operación denegada: no tienes permisos para modificar campos sensibles del boleto.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pool_updates ON public.pools;
CREATE TRIGGER trg_protect_pool_updates
BEFORE UPDATE ON public.pools
FOR EACH ROW
EXECUTE FUNCTION public.check_pool_anon_update();

-- 4. ÍNDICES DE RENDIMIENTO ULTRA-RÁPIDO PARA MILES DE QUINIELAS
CREATE INDEX IF NOT EXISTS idx_pools_reference_code ON public.pools(reference_code);
CREATE INDEX IF NOT EXISTS idx_pools_matchday_payment ON public.pools(matchday_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_predictions_pool_match ON public.predictions(pool_id, match_id);
