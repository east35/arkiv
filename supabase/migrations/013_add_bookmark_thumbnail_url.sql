ALTER TABLE item_bookmarks
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
