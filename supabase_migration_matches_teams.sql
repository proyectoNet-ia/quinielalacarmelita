-- Migración para vincular la tabla Partidos (matches) con la tabla Equipos (teams)

-- 1. Agregamos las columnas referenciales
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT;

-- Nota: ON DELETE RESTRICT es el candado a nivel base de datos que evita que
-- puedas borrar un equipo si ya tiene algún partido asignado en la base de datos.
