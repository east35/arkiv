-- Add new metadata columns to the games extension table.
-- game_modes and player_perspectives come from IGDB's game_modes and player_perspectives endpoints.
-- game_category maps to IGDB's `category` enum (0=Main, 1=DLC, 2=Expansion, etc.).
-- steam_id enables future links to the Steam store.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS game_modes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS player_perspectives text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS game_category integer,
  ADD COLUMN IF NOT EXISTS steam_id text;
