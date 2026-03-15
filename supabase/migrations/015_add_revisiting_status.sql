ALTER TABLE public.items DROP CONSTRAINT items_status_check;
ALTER TABLE public.items ADD CONSTRAINT items_status_check
  CHECK (status IN ('in_library', 'backlog', 'in_progress', 'paused', 'completed', 'dropped', 'revisiting'));
ALTER TABLE public.items ADD COLUMN revisit_started_at timestamptz NULL;
