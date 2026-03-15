CREATE TABLE IF NOT EXISTS ai_conversation_threads (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id               UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                 TEXT        NOT NULL DEFAULT 'New thread',
  title_source          TEXT        NOT NULL DEFAULT 'auto',
  messages              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  summary               TEXT,
  summary_message_count INTEGER     NOT NULL DEFAULT 0,
  spoiler_scope         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (title_source IN ('auto', 'manual'))
);

CREATE INDEX IF NOT EXISTS ai_conversation_threads_user_item_idx
  ON ai_conversation_threads (user_id, item_id, updated_at DESC);

ALTER TABLE ai_conversation_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI threads"
  ON ai_conversation_threads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ai_item_memories (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id             UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spoiler_preference  TEXT,
  response_style      TEXT,
  durable_preferences JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS ai_item_memories_user_item_idx
  ON ai_item_memories (user_id, item_id, updated_at DESC);

ALTER TABLE ai_item_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI item memories"
  ON ai_item_memories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO ai_conversation_threads (
  item_id,
  user_id,
  title,
  title_source,
  messages,
  summary,
  summary_message_count,
  spoiler_scope,
  created_at,
  updated_at
)
SELECT
  item_id,
  user_id,
  'Previous discussion',
  'manual',
  messages,
  summary,
  0,
  NULL,
  created_at,
  updated_at
FROM ai_conversations
WHERE NOT EXISTS (
  SELECT 1
  FROM ai_conversation_threads threads
  WHERE threads.item_id = ai_conversations.item_id
    AND threads.user_id = ai_conversations.user_id
);
