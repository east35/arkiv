ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS series_name text,
  ADD COLUMN IF NOT EXISTS series_position real,
  ADD COLUMN IF NOT EXISTS tag_categories jsonb;

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS source_votes integer;
