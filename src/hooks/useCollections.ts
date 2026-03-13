/**
 * Arkiv — Collection Data Hooks
 *
 * Supabase CRUD operations for user-created collections and collection membership.
 * All queries are automatically user-scoped via RLS.
 */

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { Collection, CollectionItem } from "@/types"

export function useCollections() {
  const { setCollections } = useShelfStore()

  /**
   * Fetch all collections for the current user.
   */
  const fetchCollections = useCallback(async () => {
    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_items(item_id, added_at)")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Derive count and first item ID from the collection_items relation
    const collections = (data as any[]).map(({ collection_items, ...row }) => {
      const members: { item_id: string; added_at: string }[] = Array.isArray(collection_items) ? collection_items : []
      const sorted = [...members].sort((a, b) => a.added_at.localeCompare(b.added_at))
      return {
        ...row,
        item_count: members.length,
        first_item_id: sorted[0]?.item_id ?? null,
        preview_item_ids: sorted.slice(0, 4).map(m => m.item_id),
      }
    }) as Collection[]

    setCollections(collections)
    return collections
  }, [setCollections])

  /**
   * Create a new collection. Returns the created collection row.
   */
  const createCollection = useCallback(async (
    name: string,
    description?: string,
  ): Promise<Collection> => {
    const { data, error } = await supabase
      .from("collections")
      .insert({ name, description: description ?? null })
      .select()
      .single()

    if (error) throw error

    // Refresh collections in store
    await fetchCollections()
    return data as Collection
  }, [fetchCollections])

  /**
   * Update a collection's name, description, or cover item.
   */
  const editCollection = useCallback(async (
    id: string,
    update: Partial<Pick<Collection, "name" | "description" | "cover_item_id">>,
  ) => {
    const { error } = await supabase
      .from("collections")
      .update(update)
      .eq("id", id)

    if (error) throw error

    await fetchCollections()
  }, [fetchCollections])

  /**
   * Delete a collection (cascades to collection_items via FK).
   */
  const deleteCollection = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id)

    if (error) throw error

    await fetchCollections()
  }, [fetchCollections])

  /**
   * Fetch all items in a specific collection (returns junction rows).
   */
  const fetchCollectionItems = useCallback(async (collectionId: string): Promise<CollectionItem[]> => {
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
   */
  const fetchItemMemberships = useCallback(async (itemId: string): Promise<CollectionItem[]> => {
    const { data, error } = await supabase
      .from("collection_items")
      .select("*")
      .eq("item_id", itemId)

    if (error) throw error
    return data as CollectionItem[]
  }, [])

  /**
   * Add an item to a collection.
   */
  const addItemToCollection = useCallback(async (collectionId: string, itemId: string) => {
    const { error } = await supabase
      .from("collection_items")
      .insert({ collection_id: collectionId, item_id: itemId })

    if (error) throw error
  }, [])

  /**
   * Remove an item from a collection.
   */
  const removeItemFromCollection = useCallback(async (collectionId: string, itemId: string) => {
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
