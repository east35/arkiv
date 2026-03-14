/**
 * Arkiv — Item Bookmarks Hook
 *
 * CRUD for per-item bookmarks stored in the item_bookmarks table.
 * In demo mode all writes are in-memory only.
 */

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { ItemBookmark } from "@/types"

export function useItemBookmarks() {
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  const [bookmarks, setBookmarks] = useState<ItemBookmark[]>([])

  const fetchBookmarks = useCallback(async (itemId: string): Promise<ItemBookmark[]> => {
    if (isDemoMode) {
      setBookmarks([])
      return []
    }
    const { data, error } = await supabase
      .from("item_bookmarks")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true })
    if (error) throw error
    const result = (data as ItemBookmark[]) ?? []
    setBookmarks(result)
    return result
  }, [isDemoMode])

  const createBookmark = useCallback(async (
    itemId: string,
    title: string,
    url: string,
  ): Promise<ItemBookmark> => {
    if (isDemoMode) {
      const bookmark: ItemBookmark = {
        id: crypto.randomUUID(),
        item_id: itemId,
        user_id: "demo",
        title,
        url,
        created_at: new Date().toISOString(),
      }
      setBookmarks((prev) => [...prev, bookmark])
      return bookmark
    }
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from("item_bookmarks")
      .insert({ item_id: itemId, user_id: session!.user.id, title, url })
      .select()
      .single()
    if (error) throw error
    const bookmark = data as ItemBookmark
    setBookmarks((prev) => [...prev, bookmark])
    return bookmark
  }, [isDemoMode])

  const deleteBookmark = useCallback(async (bookmarkId: string): Promise<void> => {
    if (isDemoMode) {
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
      return
    }
    const { error } = await supabase
      .from("item_bookmarks")
      .delete()
      .eq("id", bookmarkId)
    if (error) throw error
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
  }, [isDemoMode])

  return { bookmarks, fetchBookmarks, createBookmark, deleteBookmark }
}
