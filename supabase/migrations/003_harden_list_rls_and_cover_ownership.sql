-- =============================================================================
-- Hardening: list/list_items ownership enforcement
-- =============================================================================
-- 1) Ensure list_items can only link a user's own lists to the same user's items
-- 2) Ensure lists.cover_item_id can only point to an item owned by that list owner
-- 3) Clean up any existing cross-user references

-- ---------------------------------------------------------------------------
-- Cleanup existing inconsistent rows (if any)
-- ---------------------------------------------------------------------------

-- Remove list membership rows where list owner != item owner.
DELETE FROM public.list_items li
USING public.lists l, public.items i
WHERE li.list_id = l.id
  AND li.item_id = i.id
  AND l.user_id <> i.user_id;

-- Null out list covers that point to another user's item.
UPDATE public.lists l
SET cover_item_id = NULL
WHERE cover_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.items i
    WHERE i.id = l.cover_item_id
      AND i.user_id = l.user_id
  );

-- ---------------------------------------------------------------------------
-- Replace list policies with explicit operation-level checks
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can CRUD own lists" ON public.lists;

CREATE POLICY "Users can view own lists"
  ON public.lists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists"
  ON public.lists
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

CREATE POLICY "Users can update own lists"
  ON public.lists
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

CREATE POLICY "Users can delete own lists"
  ON public.lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Strengthen list_items policy: require ownership of both list and item
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can CRUD own list items" ON public.list_items;

CREATE POLICY "Users can CRUD own list items"
  ON public.list_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.lists l
      WHERE l.id = list_items.list_id
        AND l.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.items i
      WHERE i.id = list_items.item_id
        AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lists l
      WHERE l.id = list_items.list_id
        AND l.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.items i
      WHERE i.id = list_items.item_id
        AND i.user_id = auth.uid()
    )
  );
