-- Migration: Add 'hardcover' as a valid source value
-- Drops and recreates the source CHECK constraint to include 'hardcover'.

ALTER TABLE public.items
  DROP CONSTRAINT items_source_check;

ALTER TABLE public.items
  ADD CONSTRAINT items_source_check
  CHECK (source IN ('igdb', 'google_books', 'hardcover', 'manual'));
