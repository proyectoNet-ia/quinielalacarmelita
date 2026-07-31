-- Migration v8: Habilitar Supabase Realtime en la tabla pools
-- Ejecuta este comando en el SQL Editor de Supabase para permitir notificaciones instantáneas de pagos

ALTER PUBLICATION supabase_realtime ADD TABLE public.pools;
