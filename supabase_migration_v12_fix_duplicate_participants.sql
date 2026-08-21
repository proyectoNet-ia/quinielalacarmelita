-- =============================================================
-- MIGRACIÓN V12: Prevención y Unificación de Participantes Duplicados
-- Quiniela La Carmelita - Ejecutar en Supabase SQL Editor
-- =============================================================

-- 1. Actualizar la función submit_pool_cart con búsqueda insensible a mayúsculas/minúsculas y sin espacios al inicio/final
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
  v_clean_name TEXT;
  v_clean_phone TEXT;
BEGIN
  v_clean_name := TRIM(p_participant_name);
  v_clean_phone := TRIM(p_participant_phone);

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

  -- Buscar Participante existente (insensible a mayúsculas, minúsculas y espacios finales)
  SELECT id INTO v_participant_id
  FROM public.participants
  WHERE LOWER(TRIM(alias)) = LOWER(v_clean_name)
     OR LOWER(TRIM(name)) = LOWER(v_clean_name)
     OR (v_clean_phone IS NOT NULL AND v_clean_phone != '' AND TRIM(phone) = v_clean_phone)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_participant_id IS NULL THEN
    INSERT INTO public.participants (name, alias, phone, pin)
    VALUES (v_clean_name, v_clean_name, v_clean_phone, floor(1000 + random() * 9000)::text)
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

-- 2. Consolidar participantes duplicados existentes en Supabase (revinculando sus pools al ID primario)
DO $$
DECLARE
  v_dup RECORD;
  v_primary_id UUID;
BEGIN
  -- Iterar sobre todos los grupos de nombres duplicados (ignorando mayúsculas/minúsculas y espacios finales)
  FOR v_dup IN (
    SELECT LOWER(TRIM(name)) AS clean_name, COUNT(*) AS dup_count
    FROM public.participants
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  ) LOOP
    -- Obtener el ID del participante más antiguo (primario)
    SELECT id INTO v_primary_id
    FROM public.participants
    WHERE LOWER(TRIM(name)) = v_dup.clean_name
    ORDER BY created_at ASC
    LIMIT 1;

    -- Revinculación de quinielas (pools) al ID del participante primario
    UPDATE public.pools
    SET participant_id = v_primary_id
    WHERE participant_id IN (
      SELECT id FROM public.participants
      WHERE LOWER(TRIM(name)) = v_dup.clean_name AND id != v_primary_id
    );

    -- Limpieza de espacios en el nombre y alias del participante primario
    UPDATE public.participants
    SET 
      name = TRIM(name),
      alias = TRIM(alias)
    WHERE id = v_primary_id;

    -- Eliminar los registros duplicados secundarios ya relanzados
    DELETE FROM public.participants
    WHERE LOWER(TRIM(name)) = v_dup.clean_name AND id != v_primary_id;
  END LOOP;
END $$;
