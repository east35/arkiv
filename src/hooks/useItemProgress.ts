/**
 * Arkiv — Item Progress Hook
 *
 * Upsert-based progress tracking stored in item_progress.
 * In demo mode all writes are in-memory only.
 */

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { ItemProgress } from "@/types"

export function useItemProgress() {
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  const [progress, setProgress] = useState<ItemProgress | null>(null)

  const fetchProgress = useCallback(async (itemId: string): Promise<ItemProgress | null> => {
    if (isDemoMode) {
      setProgress(null)
      return null
    }
    const { data, error } = await supabase
      .from("item_progress")
      .select("*")
      .eq("item_id", itemId)
      .maybeSingle()
    if (error) throw error
    const result = data as ItemProgress | null
    setProgress(result)
    return result
  }, [isDemoMode])

  const upsertProgress = useCallback(async (
    itemId: string,
    update: { type: string; value: string; confidence?: string },
  ): Promise<ItemProgress> => {
    const now = new Date().toISOString()
    if (isDemoMode) {
      const p: ItemProgress = {
        item_id: itemId,
        user_id: "demo",
        type: update.type,
        value: update.value,
        confidence: update.confidence ?? null,
        updated_at: now,
      }
      setProgress(p)
      return p
    }
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from("item_progress")
      .upsert({ item_id: itemId, user_id: session!.user.id, ...update, updated_at: now }, { onConflict: "item_id" })
      .select()
      .single()
    if (error) throw error
    const result = data as ItemProgress
    setProgress(result)
    return result
  }, [isDemoMode])

  return { progress, fetchProgress, upsertProgress }
}
