-- =============================================================
-- MIGRACIÓN V12: Prevención y Unificación de Participantes Duplicados
-- Quiniela La Carmelita - Copia y pega en el Supabase SQL Editor
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
  var_pid UUID;
  var_mstatus TEXT;
  var_mdeadline TIMESTAMPTZ;
  var_item JSONB;
  var_poolid UUID;
  var_mid TEXT;
  var_sel TEXT;
  var_count INT := 0;
  var_name TEXT;
  var_phone TEXT;
BEGIN
  var_name := TRIM(p_participant_name);
  var_phone := TRIM(p_participant_phone);

  -- Validar Jornada y Deadline
  SELECT status, deadline INTO var_mstatus, var_mdeadline
  FROM public.matchdays
  WHERE id = p_matchday_id;

  IF var_mstatus IS NULL THEN
    RAISE EXCEPTION 'La jornada especificada no existe.';
  END IF;

  IF var_mstatus != 'active' OR (var_mdeadline IS NOT NULL AND timezone('utc'::text, now()) > var_mdeadline) THEN
    RAISE EXCEPTION 'No se pueden registrar quinielas: la jornada ya cerró o ha expirado.';
  END IF;

  -- Buscar Participante existente (insensible a mayúsculas, minúsculas y espacios finales)
  SELECT id INTO var_pid
  FROM public.participants
  WHERE LOWER(TRIM(alias)) = LOWER(var_name)
     OR LOWER(TRIM(name)) = LOWER(var_name)
     OR (var_phone IS NOT NULL AND var_phone != '' AND TRIM(phone) = var_phone)
  ORDER BY created_at ASC
  LIMIT 1;

  IF var_pid IS NULL THEN
    INSERT INTO public.participants (name, alias, phone, pin)
    VALUES (var_name, var_name, var_phone, floor(1000 + random() * 9000)::text)
    RETURNING id INTO var_pid;
  END IF;

  -- Incrementar Promo Code de forma atómica si aplica
  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    UPDATE public.promo_codes
    SET times_used = times_used + 1
    WHERE code = p_promo_code AND is_active = true;
  END IF;

  -- Procesar Carrito de Quinielas
  FOR var_item IN SELECT * FROM jsonb_array_elements(p_cart)
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
      var_pid,
      p_matchday_id,
      'pending',
      p_entry_price,
      0,
      p_reference_code,
      p_promo_code
    ) RETURNING id INTO var_poolid;

    var_count := var_count + 1;

    -- Insertar Predicciones de este boleto
    FOR var_mid, var_sel IN SELECT * FROM jsonb_each_text(var_item)
    LOOP
      INSERT INTO public.predictions (pool_id, match_id, selection)
      VALUES (var_poolid, var_mid::uuid, var_sel);
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reference_code', p_reference_code,
    'pools_created', var_count,
    'participant_id', var_pid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_pool_cart(TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, JSONB) TO anon, authenticated, service_role;

-- 2. Consolidar participantes duplicados existentes en Supabase
DO $$
DECLARE
  rec RECORD;
  primary_pid UUID;
BEGIN
  FOR rec IN (
    SELECT LOWER(TRIM(name)) AS clean_name, COUNT(*) AS dup_count
    FROM public.participants
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  ) LOOP
    -- 1. Obtener ID del participante primario (el más antiguo)
    SELECT id INTO primary_pid
    FROM public.participants
    WHERE LOWER(TRIM(name)) = rec.clean_name
    ORDER BY created_at ASC
    LIMIT 1;

    -- 2. Revincular quinielas (pools) de los participantes duplicados al ID primario
    UPDATE public.pools
    SET participant_id = primary_pid
    WHERE participant_id IN (
      SELECT id FROM public.participants
      WHERE LOWER(TRIM(name)) = rec.clean_name AND id != primary_pid
    );

    -- 3. Eliminar los registros duplicados secundarios
    DELETE FROM public.participants
    WHERE LOWER(TRIM(name)) = rec.clean_name AND id != primary_pid;

    -- 4. Limpiar espacios en el registro primario de forma segura
    BEGIN
      UPDATE public.participants
      SET name = TRIM(name), alias = TRIM(alias)
      WHERE id = primary_pid;
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.participants
      SET name = TRIM(name), alias = TRIM(alias) || '_' || FLOOR(100 + RANDOM() * 900)::text
      WHERE id = primary_pid;
    END;
  END LOOP;
END;
$$;
