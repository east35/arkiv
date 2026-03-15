/**
 * Arkiv — Activity Log Hook
 *
 * Fetches activity log entries for timeline feed and statistics.
 * All queries are automatically user-scoped via RLS.
 */

import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { ActivityLogEntry } from "@/types"

function toRangeBoundaryIso(date: string, endOfDay = false) {
  const [year, month, day] = date.split("-").map(Number)
  const boundary = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)

  return boundary.toISOString()
}

export function useActivity() {
  /**
   * Fetch all activity entries for the current user,
   * ordered newest-first. Used by Statistics and Timeline views.
   */
  const fetchActivity = useCallback(async (): Promise<ActivityLogEntry[]> => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("occurred_at", { ascending: false })

    if (error) throw error
    return data as ActivityLogEntry[]
  }, [])

  /**
   * Fetch activity for a specific item (for item detail "Activity history").
   */
  const fetchItemActivity = useCallback(async (itemId: string): Promise<ActivityLogEntry[]> => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("item_id", itemId)
      .order("occurred_at", { ascending: false })

    if (error) throw error
    return data as ActivityLogEntry[]
  }, [])

  /**
   * Fetch activity within a date range (for statistics filtering).
   * The endDate is treated as inclusive (end of day) to avoid truncating
   * same-day events when Postgres casts a bare date string to midnight UTC.
   */
  const fetchActivityInRange = useCallback(async (
    startDate: string,
    endDate: string,
  ): Promise<ActivityLogEntry[]> => {
    const startBoundary = toRangeBoundaryIso(startDate)
    const endBoundary = toRangeBoundaryIso(endDate, true)

    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .gte("occurred_at", startBoundary)
      .lte("occurred_at", endBoundary)
      .order("occurred_at", { ascending: false })

    if (error) throw error
    return data as ActivityLogEntry[]
  }, [])

  return {
    fetchActivity,
    fetchItemActivity,
    fetchActivityInRange,
  }
}
