/**
 * ShelfLog — List Data Hooks
 *
 * Supabase CRUD operations for user-created lists and list membership.
 * All queries are automatically user-scoped via RLS.
 */

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { List, ListItem } from "@/types"

export function useLists() {
  const { setLists } = useShelfStore()

  /**
   * Fetch all lists for the current user.
   */
  const fetchLists = useCallback(async () => {
    const { data, error } = await supabase
      .from("lists")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    setLists(data as List[])
    return data as List[]
  }, [setLists])

  /**
   * Create a new list. Returns the created list row.
   */
  const createList = useCallback(async (
    name: string,
    description?: string,
  ): Promise<List> => {
    const { data, error } = await supabase
      .from("lists")
      .insert({ name, description: description ?? null })
      .select()
      .single()

    if (error) throw error

    // Refresh lists in store
    await fetchLists()
    return data as List
  }, [fetchLists])

  /**
   * Update a list's name, description, or cover item.
   */
  const editList = useCallback(async (
    id: string,
    update: Partial<Pick<List, "name" | "description" | "cover_item_id">>,
  ) => {
    const { error } = await supabase
      .from("lists")
      .update(update)
      .eq("id", id)

    if (error) throw error

    await fetchLists()
  }, [fetchLists])

  /**
   * Delete a list (cascades to list_items via FK).
   */
  const deleteList = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("lists")
      .delete()
      .eq("id", id)

    if (error) throw error

    await fetchLists()
  }, [fetchLists])

  /**
   * Fetch all items in a specific list (returns junction rows).
   */
  const fetchListItems = useCallback(async (listId: string): Promise<ListItem[]> => {
    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", listId)
      .order("added_at", { ascending: true })

    if (error) throw error
    return data as ListItem[]
  }, [])

  /**
   * Fetch all list memberships for a specific item.
   */
  const fetchItemMemberships = useCallback(async (itemId: string): Promise<ListItem[]> => {
    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .eq("item_id", itemId)

    if (error) throw error
    return data as ListItem[]
  }, [])

  /**
   * Add an item to a list.
   */
  const addItemToList = useCallback(async (listId: string, itemId: string) => {
    const { error } = await supabase
      .from("list_items")
      .insert({ list_id: listId, item_id: itemId })

    if (error) throw error
  }, [])

  /**
   * Remove an item from a list.
   */
  const removeItemFromList = useCallback(async (listId: string, itemId: string) => {
    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("list_id", listId)
      .eq("item_id", itemId)

    if (error) throw error
  }, [])

  return {
    fetchLists,
    createList,
    editList,
    deleteList,
    fetchListItems,
    fetchItemMemberships,
    addItemToList,
    removeItemFromList,
  }
}
