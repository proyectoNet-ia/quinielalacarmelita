-- =============================================================
-- MIGRACIÓN V13: Corrección de Colisión de Nombres por Teléfono Compartido
-- Quiniela La Carmelita - Copia y pega en el Supabase SQL Editor
-- =============================================================

-- 1. Actualizar la función submit_pool_cart con búsqueda estricta por Nombre/Alias
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
SET search_path = public
AS $submit_pool_cart_fn$
DECLARE
  v_participant_id UUID;
  v_matchday_status TEXT;
  v_matchday_deadline TIMESTAMPTZ;
  v_cart_item JSONB;
  v_pool_id UUID;
  v_match_id TEXT;
  v_selection TEXT;
  v_total_created INT := 0;
  v_clean_name TEXT;
  v_clean_phone TEXT;
BEGIN
  v_clean_name := TRIM(p_participant_name);
  v_clean_phone := TRIM(p_participant_phone);

  -- Validar Jornada y Deadline
  SELECT m.status, m.deadline 
  INTO v_matchday_status, v_matchday_deadline
  FROM public.matchdays m
  WHERE m.id = p_matchday_id;

  IF v_matchday_status IS NULL THEN
    RAISE EXCEPTION 'La jornada especificada no existe.';
  END IF;

  IF v_matchday_status != 'active' OR (v_matchday_deadline IS NOT NULL AND timezone('utc'::text, now()) > v_matchday_deadline) THEN
    RAISE EXCEPTION 'No se pueden registrar quinielas: la jornada ya cerró o ha expirado.';
  END IF;

  -- Buscar Participante existente ESTRICTAMENTE por Nombre o Alias
  SELECT p.id 
  INTO v_participant_id
  FROM public.participants p
  WHERE LOWER(TRIM(p.alias)) = LOWER(v_clean_name)
     OR LOWER(TRIM(p.name)) = LOWER(v_clean_name)
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_participant_id IS NULL THEN
    INSERT INTO public.participants (name, alias, phone, pin)
    VALUES (v_clean_name, v_clean_name, v_clean_phone, floor(1000 + random() * 9000)::text)
    RETURNING id INTO v_participant_id;
  ELSE
    IF v_clean_phone IS NOT NULL AND v_clean_phone != '' THEN
      UPDATE public.participants
      SET phone = v_clean_phone
      WHERE id = v_participant_id AND (phone IS NULL OR phone = '');
    END IF;
  END IF;

  -- Incrementar Promo Code de forma atómica si aplica
  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    UPDATE public.promo_codes
    SET times_used = times_used + 1
    WHERE code = p_promo_code AND is_active = true;
  END IF;

  -- Procesar Carrito de Quinielas
  FOR v_cart_item IN SELECT * FROM jsonb_array_elements(p_cart)
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
    ) RETURNING id INTO v_pool_id;

    v_total_created := v_total_created + 1;

    -- Insertar Predicciones de este boleto
    FOR v_match_id, v_selection IN SELECT * FROM jsonb_each_text(v_cart_item)
    LOOP
      INSERT INTO public.predictions (pool_id, match_id, selection)
      VALUES (v_pool_id, v_match_id::uuid, v_selection);
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reference_code', p_reference_code,
    'pools_created', v_total_created,
    'participant_id', v_participant_id
  );
END;
$submit_pool_cart_fn$;

GRANT EXECUTE ON FUNCTION public.submit_pool_cart(TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, JSONB) TO anon, authenticated, service_role;

-- 2. Script de Corrección para el registro REF-2B0KAD (Ponchin Jesús Alfonso)
DO $reassign_block$
DECLARE
  v_target_pid UUID;
  v_old_phone TEXT;
BEGIN
  -- Obtener teléfono de la quiniela
  SELECT p.phone INTO v_old_phone
  FROM public.participants p
  JOIN public.pools pl ON pl.participant_id = p.id
  WHERE pl.reference_code = 'REF-2B0KAD'
  LIMIT 1;

  -- Buscar si ya existe Ponchin Jesús Alfonso
  SELECT p.id INTO v_target_pid
  FROM public.participants p
  WHERE LOWER(TRIM(p.name)) = LOWER('Ponchin Jesús Alfonso')
     OR LOWER(TRIM(p.alias)) = LOWER('Ponchin Jesús Alfonso')
  LIMIT 1;

  -- Si no existe, crearlo
  IF v_target_pid IS NULL THEN
    INSERT INTO public.participants (name, alias, phone, pin)
    VALUES (
      'Ponchin Jesús Alfonso',
      'Ponchin Jesús Alfonso',
      COALESCE(v_old_phone, ''),
      floor(1000 + random() * 9000)::text
    )
    RETURNING id INTO v_target_pid;
  END IF;

  -- Reasignar todas las quinielas de REF-2B0KAD a Ponchin
  UPDATE public.pools
  SET participant_id = v_target_pid
  WHERE reference_code = 'REF-2B0KAD';
END;
$reassign_block$;
