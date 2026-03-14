-- Add HowLongToBeat metadata fields for tracked games.
-- Values are stored as decimal hours so the UI can render a compact
-- 14.5h-style display without doing repeated conversions.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS hltb_average double precision,
  ADD COLUMN IF NOT EXISTS hltb_main double precision,
  ADD COLUMN IF NOT EXISTS hltb_main_extra double precision,
  ADD COLUMN IF NOT EXISTS hltb_completionist double precision;
