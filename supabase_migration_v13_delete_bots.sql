-- =============================================================
-- MIGRACIÓN V13: Eliminación de Bots Individuales y Masivos
-- Quiniela La Carmelita - Copia y pega en el Supabase SQL Editor
-- =============================================================

-- 1. Función para eliminar un Bot específico de una Jornada
CREATE OR REPLACE FUNCTION public.delete_bot_participant(
  p_participant_id UUID,
  p_matchday_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  var_pools_deleted INT := 0;
BEGIN
  -- Eliminar quinielas del bot en la jornada especificada
  DELETE FROM public.pools
  WHERE participant_id = p_participant_id AND matchday_id = p_matchday_id;

  GET DIAGNOSTICS var_pools_deleted = ROW_COUNT;

  -- Si el bot no tiene quinielas en ninguna otra jornada y su teléfono es BOT-0000, eliminar participante
  IF NOT EXISTS (SELECT 1 FROM public.pools WHERE participant_id = p_participant_id) THEN
    DELETE FROM public.participants WHERE id = p_participant_id AND phone = 'BOT-0000';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pools_deleted', var_pools_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_bot_participant(UUID, UUID) TO anon, authenticated, service_role;

-- 2. Función para eliminar TODOS los bots de una Jornada especificada
CREATE OR REPLACE FUNCTION public.delete_all_bots_in_matchday(
  p_matchday_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  var_pools_deleted INT := 0;
BEGIN
  -- Eliminar todas las pools de bots en la jornada especificada
  DELETE FROM public.pools
  WHERE matchday_id = p_matchday_id
    AND (
      reference_code LIKE 'BOT-%' OR 
      reference_code LIKE 'BT-%' OR 
      participant_id IN (SELECT id FROM public.participants WHERE phone = 'BOT-0000')
    );

  GET DIAGNOSTICS var_pools_deleted = ROW_COUNT;

  -- Limpiar participantes bot huérfanos sin quinielas activas
  DELETE FROM public.participants
  WHERE phone = 'BOT-0000'
    AND id NOT IN (SELECT participant_id FROM public.pools);

  RETURN jsonb_build_object(
    'success', true,
    'pools_deleted', var_pools_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_all_bots_in_matchday(UUID) TO anon, authenticated, service_role;
