-- 012_notes_tab_feature.sql
-- Adds structured notes, bookmarks, progress tracking, and AI conversation tables.
-- Migrates existing items.notes text into item_notes rows.

-- ─── item_notes ────────────────────────────────────────────────────────────────

CREATE TABLE item_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE item_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notes"
  ON item_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── item_bookmarks ────────────────────────────────────────────────────────────

CREATE TABLE item_bookmarks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE item_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own bookmarks"
  ON item_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── item_progress ─────────────────────────────────────────────────────────────
-- One row per item (items are already user-scoped via items.user_id).

CREATE TABLE item_progress (
  item_id     UUID        PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT,
  value       TEXT,
  confidence  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE item_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own progress"
  ON item_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── ai_conversations ──────────────────────────────────────────────────────────
-- One conversation per item (items are user-scoped).

CREATE TABLE ai_conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages    JSONB       NOT NULL DEFAULT '[]',
  summary     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own conversations"
  ON ai_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Migrate items.notes → item_notes ─────────────────────────────────────────

INSERT INTO item_notes (item_id, user_id, content, created_at, updated_at)
SELECT id, user_id, notes, created_at, updated_at
FROM items
WHERE notes IS NOT NULL AND notes <> '';

-- ─── Drop legacy notes column ──────────────────────────────────────────────────

ALTER TABLE items DROP COLUMN notes;

-- ─── Add AI provider fields to user_preferences ────────────────────────────────

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_api_key  TEXT;
