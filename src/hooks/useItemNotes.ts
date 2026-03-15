/**
 * Arkiv — Item Notes Hook
 *
 * CRUD for structured per-item notes stored in the item_notes table.
 * In demo mode all writes are in-memory only.
 */

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { ItemNote } from "@/types"

export function useItemNotes() {
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  const [notes, setNotes] = useState<ItemNote[]>([])

  const fetchNotes = useCallback(async (itemId: string): Promise<ItemNote[]> => {
    if (isDemoMode) {
      setNotes([])
      return []
    }
    const { data, error } = await supabase
      .from("item_notes")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true })
    if (error) throw error
    const result = (data as ItemNote[]) ?? []
    setNotes(result)
    return result
  }, [isDemoMode])

  const createNote = useCallback(async (itemId: string, content: string): Promise<ItemNote> => {
    const now = new Date().toISOString()
    if (isDemoMode) {
      const note: ItemNote = {
        id: crypto.randomUUID(),
        item_id: itemId,
        user_id: "demo",
        content,
        created_at: now,
        updated_at: now,
      }
      setNotes((prev) => [...prev, note])
      return note
    }
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from("item_notes")
      .insert({ item_id: itemId, user_id: session!.user.id, content })
      .select()
      .single()
    if (error) throw error
    const note = data as ItemNote
    setNotes((prev) => [...prev, note])
    return note
  }, [isDemoMode])

  const updateNote = useCallback(async (noteId: string, content: string): Promise<void> => {
    const updated_at = new Date().toISOString()
    if (isDemoMode) {
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content, updated_at } : n))
      return
    }
    const { error } = await supabase
      .from("item_notes")
      .update({ content, updated_at })
      .eq("id", noteId)
    if (error) throw error
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content, updated_at } : n))
  }, [isDemoMode])

  const deleteNote = useCallback(async (noteId: string): Promise<void> => {
    if (isDemoMode) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      return
    }
    const { error } = await supabase
      .from("item_notes")
      .delete()
      .eq("id", noteId)
    if (error) throw error
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }, [isDemoMode])

  return { notes, fetchNotes, createNote, updateNote, deleteNote }
}
