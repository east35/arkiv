ALTER TABLE item_bookmarks
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE item_bookmarks
SET
  link_type = COALESCE(link_type, 'other'),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE link_type IS NULL OR updated_at IS NULL;
