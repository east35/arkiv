/**
 * Arkiv — User Preferences Hook
 *
 * Fetches and updates the current user's preference row.
 * The row is auto-created on sign-up via database trigger.
 */

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { UserPreferences } from "@/types"

export function usePreferences() {
  const { setPreferences } = useShelfStore()

  /**
   * Fetch the current user's preferences.
   * Returns null if no row exists (shouldn't happen — trigger creates it).
   */
  const fetchPreferences = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error) throw error

    setPreferences(data as UserPreferences)
    return data as UserPreferences
  }, [setPreferences])

  /**
   * Update one or more preference fields.
   */
  const updatePreferences = useCallback(async (
    update: Partial<Omit<UserPreferences, "user_id" | "created_at" | "updated_at">>,
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { error } = await supabase
      .from("user_preferences")
      .update(update)
      .eq("user_id", user.id)

    if (error) throw error

    // Refresh local state
    await fetchPreferences()
  }, [fetchPreferences])

  return {
    fetchPreferences,
    updatePreferences,
  }
}
