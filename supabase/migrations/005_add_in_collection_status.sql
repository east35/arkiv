-- Migration: Add 'in_collection' as a valid status value
ALTER TABLE public.items
  DROP CONSTRAINT items_status_check;

ALTER TABLE public.items
  ADD CONSTRAINT items_status_check
  CHECK (status IN ('in_collection', 'backlog', 'in_progress', 'paused', 'completed', 'dropped'));
