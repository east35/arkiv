/**
 * Arkiv — Collection Data Hooks
 *
 * Supabase CRUD operations for user-created collections and collection membership.
 * All queries are automatically user-scoped via RLS.
 * In demo mode, all writes are intercepted and applied only to the in-memory store.
 */

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { Collection, CollectionItem } from "@/types"

export function useCollections() {
  const { setCollections } = useShelfStore()

  /**
   * Fetch all collections for the current user.
   * In demo mode: returns the current store snapshot.
   */
  const fetchCollections = useCallback(async () => {
    const { isDemoMode, collections } = useShelfStore.getState()

    if (isDemoMode) {
      return collections
    }

    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_items(item_id, added_at)")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Derive count and first item ID from the collection_items relation
    const result = (data as any[]).map(({ collection_items, ...row }) => {
      const members: { item_id: string; added_at: string }[] = Array.isArray(collection_items) ? collection_items : []
      const sorted = [...members].sort((a, b) => a.added_at.localeCompare(b.added_at))
      return {
        ...row,
        item_count: members.length,
        first_item_id: sorted[0]?.item_id ?? null,
        preview_item_ids: sorted.slice(0, 4).map(m => m.item_id),
      }
    }) as Collection[]

    setCollections(result)
    return result
  }, [setCollections])

  /**
   * Create a new collection.
   * In demo mode: inserts into in-memory store only.
   */
  const createCollection = useCallback(async (
    name: string,
    description?: string,
  ): Promise<Collection> => {
    if (useShelfStore.getState().isDemoMode) {
      const { collections } = useShelfStore.getState()
      const now = new Date().toISOString()
      const newCol: Collection = {
        id: crypto.randomUUID(),
        user_id: "demo",
        name,
        description: description ?? null,
        cover_item_id: null,
        created_at: now,
        updated_at: now,
        item_count: 0,
        first_item_id: null,
        preview_item_ids: [],
      }
      setCollections([newCol, ...collections])
      return newCol
    }

    const { data, error } = await supabase
      .from("collections")
      .insert({ name, description: description ?? null })
      .select()
      .single()

    if (error) throw error

    // Refresh collections in store
    await fetchCollections()
    return data as Collection
  }, [fetchCollections, setCollections])

  /**
   * Update a collection's name, description, or cover item.
   * In demo mode: updates in-memory store only.
   */
  const editCollection = useCallback(async (
    id: string,
    update: Partial<Pick<Collection, "name" | "description" | "cover_item_id">>,
  ) => {
    if (useShelfStore.getState().isDemoMode) {
      const { collections } = useShelfStore.getState()
      setCollections(collections.map((c) => (c.id === id ? { ...c, ...update } : c)))
      return
    }

    const { error } = await supabase
      .from("collections")
      .update(update)
      .eq("id", id)

    if (error) throw error

    await fetchCollections()
  }, [fetchCollections, setCollections])

  /**
   * Delete a collection.
   * In demo mode: removes from in-memory store only.
   */
  const deleteCollection = useCallback(async (id: string) => {
    if (useShelfStore.getState().isDemoMode) {
      const { demoCollectionItems, removeDemoCollectionItem } = useShelfStore.getState()
      // Remove all collection items for this collection
      demoCollectionItems
        .filter((ci) => ci.collection_id === id)
        .forEach((ci) => removeDemoCollectionItem(id, ci.item_id))
      // Remove the collection itself (after items are removed so syncCollectionCounts runs first)
      setCollections(useShelfStore.getState().collections.filter((c) => c.id !== id))
      return
    }

    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id)

    if (error) throw error

    await fetchCollections()
  }, [fetchCollections, setCollections])

  /**
   * Fetch all items in a specific collection (returns junction rows).
   * In demo mode: returns from in-memory demoCollectionItems.
   */
  const fetchCollectionItems = useCallback(async (collectionId: string): Promise<CollectionItem[]> => {
    if (useShelfStore.getState().isDemoMode) {
      return useShelfStore
        .getState()
        .demoCollectionItems
        .filter((ci) => ci.collection_id === collectionId)
        .sort((a, b) => a.added_at.localeCompare(b.added_at))
    }

    const { data, error } = await supabase
      .from("collection_items")
      .select("*")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: true })

    if (error) throw error
    return data as CollectionItem[]
  }, [])

  /**
   * Fetch all collection memberships for a specific item.
   * In demo mode: returns from in-memory demoCollectionItems.
   */
  const fetchItemMemberships = useCallback(async (itemId: string): Promise<CollectionItem[]> => {
    if (useShelfStore.getState().isDemoMode) {
      return useShelfStore
        .getState()
        .demoCollectionItems
        .filter((ci) => ci.item_id === itemId)
    }

    const { data, error } = await supabase
      .from("collection_items")
      .select("*")
      .eq("item_id", itemId)

    if (error) throw error
    return data as CollectionItem[]
  }, [])

  /**
   * Add an item to a collection.
   * In demo mode: inserts into demoCollectionItems in store.
   */
  const addItemToCollection = useCallback(async (collectionId: string, itemId: string) => {
    if (useShelfStore.getState().isDemoMode) {
      const existing = useShelfStore
        .getState()
        .demoCollectionItems
        .find((ci) => ci.collection_id === collectionId && ci.item_id === itemId)
      if (!existing) {
        useShelfStore.getState().addDemoCollectionItem({
          id: crypto.randomUUID(),
          collection_id: collectionId,
          item_id: itemId,
          added_at: new Date().toISOString(),
        })
      }
      return
    }

    const { error } = await supabase
      .from("collection_items")
      .insert({ collection_id: collectionId, item_id: itemId })

    if (error) throw error
  }, [])

  /**
   * Remove an item from a collection.
   * In demo mode: removes from demoCollectionItems in store.
   */
  const removeItemFromCollection = useCallback(async (collectionId: string, itemId: string) => {
    if (useShelfStore.getState().isDemoMode) {
      useShelfStore.getState().removeDemoCollectionItem(collectionId, itemId)
      return
    }

    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("collection_id", collectionId)
      .eq("item_id", itemId)

    if (error) throw error
  }, [])

  return {
    fetchCollections,
    createCollection,
    editCollection,
    deleteCollection,
    fetchCollectionItems,
    fetchItemMemberships,
    addItemToCollection,
    removeItemFromCollection,
  }
}
