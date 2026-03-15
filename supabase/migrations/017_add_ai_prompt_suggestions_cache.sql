CREATE TABLE IF NOT EXISTS ai_prompt_suggestions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_hash TEXT        NOT NULL,
  prompts      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, context_hash)
);

CREATE INDEX IF NOT EXISTS ai_prompt_suggestions_user_item_idx
  ON ai_prompt_suggestions (user_id, item_id, updated_at DESC);

ALTER TABLE ai_prompt_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own prompt suggestions"
  ON ai_prompt_suggestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
