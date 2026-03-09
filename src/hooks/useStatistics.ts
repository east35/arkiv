/**
 * ShelfLog — Statistics Hook
 *
 * Computes aggregated statistics from the user's library and activity log.
 * All computation is client-side over data already in the Zustand store
 * and activity entries fetched from Supabase.
 *
 * Returned shape is a single `Statistics` object consumed by the
 * Statistics page UI components.
 *
 * ⚠️ Opus scope — data aggregation logic.
 */

import { useState, useCallback } from "react"
import { useShelfStore } from "@/store/useShelfStore"
import { useActivity } from "@/hooks/useActivity"
import type { FullItem, Status, MediaType, ActivityLogEntry } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Count of items per status */
export interface StatusCounts {
  backlog: number
  in_progress: number
  completed: number
  paused: number
  dropped: number
  total: number
}

/** A single bucket in a distribution chart */
export interface DistributionBucket {
  label: string
  count: number
}

/** Day-level activity count for the heatmap (YYYY-MM-DD → count) */
export type HeatmapData = Record<string, number>

/** A top-rated item (subset of fields for display) */
export interface TopRatedItem {
  id: string
  title: string
  cover_url: string | null
  user_score: number
  media_type: MediaType
}

/** Full statistics payload returned by the hook */
export interface Statistics {
  statusCounts: StatusCounts
  mediaTypeCounts: DistributionBucket[]
  averageScore: number | null
  scoreDistribution: DistributionBucket[]
  statusByMediaType: { status: Status; games: number; books: number }[]
  topRated: TopRatedItem[]
  completedCount: number
  currentStreak: number
  mostActiveDate: { date: string; count: number } | null
  heatmapData: HeatmapData
  totalActivity: number
}

// ---------------------------------------------------------------------------
// Pure aggregation functions (no side effects, easily testable)
// ---------------------------------------------------------------------------

/** Count items grouped by status */
function computeStatusCounts(items: FullItem[]): StatusCounts {
  const counts: StatusCounts = {
    backlog: 0,
    in_progress: 0,
    completed: 0,
    paused: 0,
    dropped: 0,
    total: items.length,
  }
  for (const item of items) {
    counts[item.status]++
  }
  return counts
}

/** Count items grouped by media type */
function computeMediaTypeCounts(items: FullItem[]): DistributionBucket[] {
  let games = 0
  let books = 0
  for (const item of items) {
    if (item.media_type === "game") games++
    else books++
  }
  return [
    { label: "Games", count: games },
    { label: "Books", count: books },
  ]
}

/** Average user_score across all scored items. Returns null if none scored. */
function computeAverageScore(items: FullItem[]): number | null {
  const scored = items.filter((i) => i.user_score != null)
  if (scored.length === 0) return null
  const sum = scored.reduce((acc, i) => acc + i.user_score!, 0)
  return Math.round((sum / scored.length) * 10) / 10
}

/**
 * Build a histogram of user scores in 1-point buckets (0–1, 1–2, …, 9–10).
 * Only includes items that have a score.
 */
function computeScoreDistribution(items: FullItem[]): DistributionBucket[] {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i}–${i + 1}`,
    count: 0,
  }))

  for (const item of items) {
    if (item.user_score == null) continue
    // Clamp to 0–9 bucket index (score of exactly 10 goes into 9–10 bucket)
    const idx = Math.min(Math.floor(item.user_score), 9)
    buckets[idx].count++
  }

  return buckets
}

/** Cross-tabulate status × media type */
function computeStatusByMediaType(
  items: FullItem[],
): { status: Status; games: number; books: number }[] {
  const statuses: Status[] = ["backlog", "in_progress", "completed", "paused", "dropped"]
  return statuses.map((status) => {
    const matching = items.filter((i) => i.status === status)
    return {
      status,
      games: matching.filter((i) => i.media_type === "game").length,
      books: matching.filter((i) => i.media_type === "book").length,
    }
  })
}

/** Top N items by user_score (descending). Only scored items. */
function computeTopRated(items: FullItem[], limit = 10): TopRatedItem[] {
  return items
    .filter((i) => i.user_score != null)
    .sort((a, b) => b.user_score! - a.user_score!)
    .slice(0, limit)
    .map((i) => ({
      id: i.id,
      title: i.title,
      cover_url: i.cover_url,
      user_score: i.user_score!,
      media_type: i.media_type,
    }))
}

/**
 * Compute the current completion streak: consecutive calendar days
 * (ending today or yesterday) where at least one item was marked "completed".
 */
function computeStreak(activity: ActivityLogEntry[]): number {
  // Filter to completion events only
  const completions = activity
    .filter((a) => a.to_status === "completed")
    .map((a) => a.occurred_at.split("T")[0]) // extract YYYY-MM-DD

  if (completions.length === 0) return 0

  // Unique days, sorted descending (most recent first)
  const uniqueDays = [...new Set(completions)].sort().reverse()

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const yesterdayStr = new Date(today.getTime() - 86_400_000)
    .toISOString()
    .split("T")[0]

  // Streak must start from today or yesterday
  if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) return 0

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1])
    const curr = new Date(uniqueDays[i])
    const diffMs = prev.getTime() - curr.getTime()

    // If exactly 1 day apart, extend streak; otherwise stop
    if (diffMs === 86_400_000) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/** Find the single date with the most activity entries */
function computeMostActiveDate(
  activity: ActivityLogEntry[],
): { date: string; count: number } | null {
  if (activity.length === 0) return null

  const dayCounts = new Map<string, number>()
  for (const entry of activity) {
    const day = entry.occurred_at.split("T")[0]
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }

  let best: { date: string; count: number } | null = null
  for (const [date, count] of dayCounts) {
    if (!best || count > best.count) {
      best = { date, count }
    }
  }

  return best
}

/**
 * Build a day-level activity count map for the last 365 days.
 * Each key is YYYY-MM-DD, value is the number of activity entries that day.
 * Days with zero activity are included (value 0) to simplify heatmap rendering.
 */
function computeHeatmapData(activity: ActivityLogEntry[]): HeatmapData {
  const data: HeatmapData = {}
  const today = new Date()

  // Pre-fill the last 365 days with 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getTime() - i * 86_400_000)
    data[d.toISOString().split("T")[0]] = 0
  }

  // Count activity per day
  for (const entry of activity) {
    const day = entry.occurred_at.split("T")[0]
    if (day in data) {
      data[day]++
    }
  }

  return data
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStatistics() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(false)

  const { fetchActivity, fetchActivityInRange } = useActivity()

  /**
   * Compute all statistics. Optionally filter activity to a date range.
   *
   * Items are always taken from the full store (status counts reflect
   * current state). Activity-dependent stats (streak, heatmap, most active)
   * respect the date range if provided.
   */
  const computeStatistics = useCallback(
    async (dateRange?: { start: string; end: string }) => {
      setLoading(true)
      try {
        const items = useShelfStore.getState().items

        // Fetch activity — optionally within a date range
        const activity = dateRange
          ? await fetchActivityInRange(dateRange.start, dateRange.end)
          : await fetchActivity()

        const result: Statistics = {
          statusCounts: computeStatusCounts(items),
          mediaTypeCounts: computeMediaTypeCounts(items),
          averageScore: computeAverageScore(items),
          scoreDistribution: computeScoreDistribution(items),
          statusByMediaType: computeStatusByMediaType(items),
          topRated: computeTopRated(items),
          completedCount: items.filter((i) => i.status === "completed").length,
          currentStreak: computeStreak(activity),
          mostActiveDate: computeMostActiveDate(activity),
          heatmapData: computeHeatmapData(activity),
          totalActivity: activity.length,
        }

        setStats(result)
        return result
      } finally {
        setLoading(false)
      }
    },
    [fetchActivity, fetchActivityInRange],
  )

  return { stats, loading, computeStatistics }
}
