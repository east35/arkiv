/**
 * Arkiv — Item Data Hooks
 *
 * Supabase CRUD operations for items (with book/game extensions).
 * All queries are automatically user-scoped via RLS.
 */

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type {
  FullItem,
  BookItem,
  GameItem,
  BookFields,
  GameFields,
  Item,
  Status,
  MediaType,
} from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hydrate raw Supabase rows into FullItem union types.
 * Joins item + book/game extension into a single object.
 */
function hydrateItem(item: Item, book: BookFields | null, game: GameFields | null): FullItem {
  if (item.media_type === "book" && book) {
    return { ...item, media_type: "book", book } as BookItem
  }
  if (item.media_type === "game" && game) {
    return { ...item, media_type: "game", game } as GameItem
  }
  // Fallback: return with empty extension (shouldn't happen with valid data)
  if (item.media_type === "book") {
    return {
      ...item,
      media_type: "book",
      book: {
        item_id: item.id,
        author: null, publisher: null, publish_date: null,
        page_count: null, progress: null, format: null,
        themes: [], isbn: null, collection: null,
        series_name: null, series_position: null, tag_categories: null,
      },
    } as BookItem
  }
  return {
    ...item,
    media_type: "game",
    game: {
      item_id: item.id,
      developer: null, publisher: null, release_date: null,
      platforms: [], format: null, themes: [], screenshots: [],
      progress_hours: 0, progress_minutes: 0, collection: null,
      game_modes: [], player_perspectives: [], game_category: null, steam_id: null,
    },
  } as GameItem
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useItems() {
  const { setItems, addItem, updateItem, removeItem } = useShelfStore()

  /**
   * Fetch all items for the current user (with book/game extensions).
   * Uses two parallel queries to avoid complex joins.
   */
  const fetchItems = useCallback(async (mediaTypes?: MediaType[]) => {
    const normalizedTypes = mediaTypes?.length
      ? Array.from(new Set(mediaTypes))
      : null

    let itemsQuery = supabase.from("items").select("*")
    if (normalizedTypes) {
      itemsQuery = itemsQuery.in("media_type", normalizedTypes)
    }

    const itemsRes = await itemsQuery

    if (itemsRes.error) throw itemsRes.error

    const itemRows = (itemsRes.data as Item[]) ?? []
    const itemIds = itemRows.map((item) => item.id)

    let booksData: BookFields[] = []
    let gamesData: GameFields[] = []

    if (itemIds.length > 0) {
      const [booksRes, gamesRes] = await Promise.all([
        supabase.from("books").select("*").in("item_id", itemIds),
        supabase.from("games").select("*").in("item_id", itemIds),
      ])
      if (booksRes.error) throw booksRes.error
      if (gamesRes.error) throw gamesRes.error
      booksData = (booksRes.data as BookFields[]) ?? []
      gamesData = (gamesRes.data as GameFields[]) ?? []
    }

    // Index extensions by item_id for O(1) lookup
    const bookMap = new Map<string, BookFields>()
    for (const b of booksData) {
      bookMap.set(b.item_id, b)
    }

    const gameMap = new Map<string, GameFields>()
    for (const g of gamesData) {
      gameMap.set(g.item_id, g)
    }

    // Hydrate each item with its extension
    const hydrated = itemRows.map((item) =>
      hydrateItem(item, bookMap.get(item.id) ?? null, gameMap.get(item.id) ?? null)
    )

    if (!normalizedTypes) {
      setItems(hydrated)
      return hydrated
    }

    const existing = useShelfStore
      .getState()
      .items
      .filter((item) => !normalizedTypes.includes(item.media_type))
    const merged = [...existing, ...hydrated]
    setItems(merged)
    return merged
  }, [setItems])

  /**
   * Create a new item with its media-specific extension row.
   * Returns the hydrated FullItem.
   */
  const createItem = useCallback(async (
    itemData: Omit<Item, "id" | "user_id" | "created_at" | "updated_at">,
    extension: Omit<BookFields, "item_id"> | Omit<GameFields, "item_id">,
  ): Promise<FullItem> => {
    // Insert the core item
    const { data: item, error: itemError } = await supabase
      .from("items")
      .insert(itemData)
      .select()
      .single()

    if (itemError) throw itemError

    // Insert the extension row
    const extensionTable = itemData.media_type === "book" ? "books" : "games"
    const { data: ext, error: extError } = await supabase
      .from(extensionTable)
      .insert({ item_id: item.id, ...extension })
      .select()
      .single()

    if (extError) throw extError

    const hydrated = hydrateItem(item as Item, 
      itemData.media_type === "book" ? ext as BookFields : null,
      itemData.media_type === "game" ? ext as GameFields : null,
    )

    addItem(hydrated)
    return hydrated
  }, [addItem])

  /**
   * Update an existing item's core fields and/or extension fields.
   * Pass `extensionUpdate` to update book/game-specific fields.
   */
  const editItem = useCallback(async (
    id: string,
    itemUpdate: Partial<Omit<Item, "id" | "user_id" | "created_at" | "updated_at">>,
    extensionUpdate?: Partial<BookFields> | Partial<GameFields>,
  ) => {
    // Update core item if there are fields to update
    if (Object.keys(itemUpdate).length > 0) {
      const { error } = await supabase
        .from("items")
        .update(itemUpdate)
        .eq("id", id)

      if (error) throw error
    }

    // Update extension if provided
    if (extensionUpdate && Object.keys(extensionUpdate).length > 0) {
      // Determine table from current item state
      const item = useShelfStore.getState().items.find((i) => i.id === id)
      if (!item) throw new Error(`Item ${id} not found in store`)

      const table = item.media_type === "book" ? "books" : "games"
      const { error } = await supabase
        .from(table)
        .update(extensionUpdate)
        .eq("item_id", id)

      if (error) throw error
    }

    // Merge updates into store
    updateItem(id, { ...itemUpdate } as Partial<FullItem>)
  }, [updateItem])

  /**
   * Update an item's status with automatic date stamping.
   * Also logs the transition to activity_log.
   */
  const updateStatus = useCallback(async (id: string, newStatus: Status) => {
    const item = useShelfStore.getState().items.find((i) => i.id === id)
    if (!item) throw new Error(`Item ${id} not found in store`)

    const now = new Date().toISOString()

    // Build date update based on new status
    const dateUpdate: Record<string, string | null> = { status: newStatus }
    switch (newStatus) {
      case "in_progress":
        dateUpdate.started_at = item.started_at ?? now
        break
      case "completed":
        dateUpdate.completed_at = now
        break
      case "paused":
        dateUpdate.paused_at = now
        break
      case "dropped":
        dateUpdate.dropped_at = now
        break
    }

    // Update item
    const { error: itemError } = await supabase
      .from("items")
      .update(dateUpdate)
      .eq("id", id)

    if (itemError) throw itemError

    // Log the status transition
    const { error: logError } = await supabase
      .from("activity_log")
      .insert({
        item_id: id,
        from_status: item.status,
        to_status: newStatus,
      })

    if (logError) throw logError

    // Update local store
    updateItem(id, dateUpdate as Partial<FullItem>)
  }, [updateItem])

  /**
   * Delete an item (cascades to extension + list_items + activity_log via FK).
   */
  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", id)

    if (error) throw error

    removeItem(id)
  }, [removeItem])

  return {
    fetchItems,
    createItem,
    editItem,
    updateStatus,
    deleteItem,
  }
}
