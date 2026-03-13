-- Rename persisted terminology from lists -> collections and collection -> library.

-- ---------------------------------------------------------------------------
-- Status values
-- ---------------------------------------------------------------------------

ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_status_check;

UPDATE public.items
SET status = 'in_library'
WHERE status = 'in_collection';

ALTER TABLE public.items
  ADD CONSTRAINT items_status_check
  CHECK (status IN ('in_library', 'backlog', 'in_progress', 'paused', 'completed', 'dropped'));

-- ---------------------------------------------------------------------------
-- Media extension columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.books
  RENAME COLUMN collection TO library;

ALTER TABLE public.games
  RENAME COLUMN collection TO library;

-- ---------------------------------------------------------------------------
-- Collections tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.lists RENAME TO collections;
ALTER TABLE public.list_items RENAME TO collection_items;

ALTER TABLE public.collection_items
  RENAME COLUMN list_id TO collection_id;

ALTER INDEX IF EXISTS idx_lists_user_id RENAME TO idx_collections_user_id;

ALTER TRIGGER set_updated_at_lists
  ON public.collections
  RENAME TO set_updated_at_collections;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own lists" ON public.collections;
DROP POLICY IF EXISTS "Users can insert own lists" ON public.collections;
DROP POLICY IF EXISTS "Users can update own lists" ON public.collections;
DROP POLICY IF EXISTS "Users can delete own lists" ON public.collections;

CREATE POLICY "Users can view own collections"
  ON public.collections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON public.collections
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      cover_item_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.items i
        WHERE i.id = cover_item_id
          AND i.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own collections"
  ON public.collections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      cover_item_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.items i
        WHERE i.id = cover_item_id
          AND i.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own collections"
  ON public.collections
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own list items" ON public.collection_items;

CREATE POLICY "Users can CRUD own collection items"
  ON public.collection_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.items i
      WHERE i.id = collection_items.item_id
        AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.items i
      WHERE i.id = collection_items.item_id
        AND i.user_id = auth.uid()
    )
  );
