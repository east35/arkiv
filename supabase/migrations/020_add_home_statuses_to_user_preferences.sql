ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS home_statuses text[] NOT NULL DEFAULT ARRAY['in_progress']::text[];

UPDATE public.user_preferences
SET home_statuses = ARRAY['in_progress']::text[]
WHERE home_statuses IS NULL
   OR cardinality(home_statuses) = 0;
