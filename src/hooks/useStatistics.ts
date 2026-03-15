/**
 * Arkiv — Statistics Hook
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
import { format, subDays } from "date-fns"
import { useShelfStore } from "@/store/useShelfStore"
import { useActivity } from "@/hooks/useActivity"
import type { FullItem, BookItem, GameItem, Status, MediaType, ActivityLogEntry } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Count of items per status */
export interface StatusCounts {
  in_library: number
  backlog: number
  in_progress: number
  completed: number
  paused: number
  dropped: number
  revisiting: number
  total: number
}

/** A single bucket in a distribution chart */
export interface DistributionBucket {
  label: string
  count: number
}

/** A score bucket split by media type */
export interface ScoreByMediaTypeBucket {
  label: string
  games: number
  books: number
}

/** Day-level activity count for the heatmap (YYYY-MM-DD → count) */
export type HeatmapData = Record<string, number>

/** A single genre bucket for the taste profile bar */
export interface GenreBucket {
  genre: string
  count: number
  /** Percentage of total genre mentions (top-5 genres only) */
  percent: number
}

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
  // Global
  statusCounts: StatusCounts
  mediaTypeCounts: DistributionBucket[]
  averageScore: number | null
  scoreDistribution: DistributionBucket[]
  scoreDistributionByMediaType: ScoreByMediaTypeBucket[]
  statusByMediaType: { status: Status; games: number; books: number }[]
  topRated: TopRatedItem[]
  completedCount: number
  currentStreak: number
  longestStreak: number
  mostActiveDayOfWeek: { day: string; percent: number } | null
  heatmapData: HeatmapData
  totalActivity: number
  rawActivity: ActivityLogEntry[]
  // Books metadata
  booksCompleted: number
  booksPagesRead: number
  booksAverageScore: number | null
  topBooks: FullItem[]
  favoriteBookAuthor: string | null
  favoriteBookGenre: string | null
  bookGenreDistribution: GenreBucket[]
  // Games metadata
  gamesCompleted: number
  gamesHoursPlayed: number
  gamesAverageScore: number | null
  topGames: FullItem[]
  favoritePlatform: string | null
  favoriteGameGenre: string | null
  gameGenreDistribution: GenreBucket[]
}

// ---------------------------------------------------------------------------
// Pure aggregation functions (no side effects, easily testable)
// ---------------------------------------------------------------------------

/** Count items grouped by status */
function computeStatusCounts(items: FullItem[]): StatusCounts {
  const counts: StatusCounts = {
    in_library: 0,
    backlog: 0,
    in_progress: 0,
    completed: 0,
    paused: 0,
    dropped: 0,
    revisiting: 0,
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
    const idx = Math.min(Math.floor(item.user_score), 9)
    buckets[idx].count++
  }

  return buckets
}

/**
 * Build a score histogram split by media type (games vs books).
 */
function computeScoreDistributionByMediaType(items: FullItem[]): ScoreByMediaTypeBucket[] {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i}–${i + 1}`,
    games: 0,
    books: 0,
  }))

  for (const item of items) {
    if (item.user_score == null) continue
    const idx = Math.min(Math.floor(item.user_score), 9)
    if (item.media_type === "game") buckets[idx].games++
    else buckets[idx].books++
  }

  return buckets
}

/** Cross-tabulate status × media type */
function computeStatusByMediaType(
  items: FullItem[],
): { status: Status; games: number; books: number }[] {
  const statuses: Status[] = ["in_library", "backlog", "in_progress", "completed", "paused", "dropped", "revisiting"]
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
  const completions = activity
    .filter((a) => a.to_status === "completed")
    .map((a) => format(new Date(a.occurred_at), "yyyy-MM-dd"))

  if (completions.length === 0) return 0

  const uniqueDays = [...new Set(completions)].sort().reverse()

  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const yesterdayStr = format(new Date(today.getTime() - 86_400_000), "yyyy-MM-dd")

  if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) return 0

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1])
    const curr = new Date(uniqueDays[i])
    const diffMs = prev.getTime() - curr.getTime()

    if (diffMs === 86_400_000) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Compute the longest-ever completion streak across all activity.
 */
function computeLongestStreak(activity: ActivityLogEntry[]): number {
  const completions = activity
    .filter((a) => a.to_status === "completed")
    .map((a) => format(new Date(a.occurred_at), "yyyy-MM-dd"))

  if (completions.length === 0) return 0

  const uniqueDays = [...new Set(completions)].sort() // ascending

  let longest = 1
  let current = 1

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1])
    const curr = new Date(uniqueDays[i])
    const diffMs = curr.getTime() - prev.getTime()

    if (diffMs === 86_400_000) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }

  return longest
}

/**
 * Find the day of week with the highest share of activity.
 * Returns the day name and its percentage of total activity.
 */
function computeMostActiveDayOfWeek(
  activity: ActivityLogEntry[],
): { day: string; percent: number } | null {
  if (activity.length === 0) return null

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const dayCounts = new Array(7).fill(0)

  for (const entry of activity) {
    const d = new Date(entry.occurred_at)
    dayCounts[d.getDay()]++
  }

  let bestIdx = 0
  for (let i = 1; i < 7; i++) {
    if (dayCounts[i] > dayCounts[bestIdx]) bestIdx = i
  }

  if (dayCounts[bestIdx] === 0) return null

  const percent = Math.round((dayCounts[bestIdx] / activity.length) * 100)
  return { day: DAY_NAMES[bestIdx], percent }
}

/**
 * Build a day-level activity count map for the last 365 days.
 * Each key is YYYY-MM-DD, value is the number of activity entries that day.
 * Days with zero activity are included (value 0) to simplify heatmap rendering.
 */
function computeHeatmapData(activity: ActivityLogEntry[]): HeatmapData {
  const data: HeatmapData = {}
  const today = new Date()

  // Use subDays (DST-safe) instead of raw ms arithmetic
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i)
    data[format(d, "yyyy-MM-dd")] = 0
  }

  for (const entry of activity) {
    const day = format(new Date(entry.occurred_at), "yyyy-MM-dd")
    if (day in data) {
      data[day]++
    }
  }

  return data
}

// ---------------------------------------------------------------------------
// Media-type metadata aggregations
// ---------------------------------------------------------------------------

/** Build a top-N genre distribution from an array of genre arrays. */
function computeGenreDistribution(genreLists: string[][], limit = 5): GenreBucket[] {
  const counts = new Map<string, number>()
  for (const genres of genreLists) {
    for (const g of genres) {
      if (g) counts.set(g, (counts.get(g) ?? 0) + 1)
    }
  }
  const total = Array.from(counts.values()).reduce((s, c) => s + c, 0)
  if (total === 0) return []
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count, percent: Math.round((count / total) * 100) }))
}

/** Return the single most common string in an array, or null if empty. */
function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: string | null = null
  let bestN = 0
  for (const [key, n] of counts) {
    if (n > bestN) { bestN = n; best = key }
  }
  return best
}

function computeBooksMetadata(items: FullItem[], completedInRangeIds?: Set<string> | null) {
  const books = items.filter((i): i is BookItem => i.media_type === "book")
  const currentlyCompleted = books.filter((i) => i.status === "completed")

  // When date range is active, count only books whose completion event fell in
  // the range. Otherwise count all books currently in "completed" status.
  const booksCompleted = completedInRangeIds
    ? books.filter((i) => completedInRangeIds.has(i.id)).length
    : currentlyCompleted.length

  // Pages read: when filtering by range, sum page_count of books completed in
  // that range. All-time: completed page_count + in-progress progress values.
  const booksPagesRead = completedInRangeIds
    ? books
        .filter((i) => completedInRangeIds.has(i.id))
        .reduce((s, i) => s + (i.book.page_count ?? 0), 0)
    : currentlyCompleted.reduce((s, i) => s + (i.book.page_count ?? 0), 0) +
      books
        .filter((i) => i.status !== "completed" && i.book.progress != null)
        .reduce((s, i) => s + (i.book.progress ?? 0), 0)

  const scored = books.filter((i) => i.user_score != null)
  const booksAverageScore = scored.length
    ? Math.round((scored.reduce((s, i) => s + i.user_score!, 0) / scored.length) * 10) / 10
    : null

  const topBooks = books
    .filter((i) => i.user_score != null)
    .sort((a, b) => b.user_score! - a.user_score!)
    .slice(0, 3)

  const favoriteBookAuthor = mostCommon(books.map((i) => i.book.author).filter(Boolean) as string[])
  const favoriteBookGenre = mostCommon(books.flatMap((i) => i.genres))
  const bookGenreDistribution = computeGenreDistribution(books.map((i) => i.genres))

  return { booksCompleted, booksPagesRead, booksAverageScore, topBooks, favoriteBookAuthor, favoriteBookGenre, bookGenreDistribution }
}

function computeGamesMetadata(items: FullItem[], completedInRangeIds?: Set<string> | null) {
  const games = items.filter((i): i is GameItem => i.media_type === "game")
  const currentlyCompleted = games.filter((i) => i.status === "completed")

  const gamesCompleted = completedInRangeIds
    ? games.filter((i) => completedInRangeIds.has(i.id)).length
    : currentlyCompleted.length

  const gamesHoursPlayed = Math.round(
    games.reduce((s, i) => s + (i.game.progress_hours ?? 0) + (i.game.progress_minutes ?? 0) / 60, 0) * 10,
  ) / 10

  const scored = games.filter((i) => i.user_score != null)
  const gamesAverageScore = scored.length
    ? Math.round((scored.reduce((s, i) => s + i.user_score!, 0) / scored.length) * 10) / 10
    : null

  const topGames = games
    .filter((i) => i.user_score != null)
    .sort((a, b) => b.user_score! - a.user_score!)
    .slice(0, 3)

  const favoritePlatform = mostCommon(games.flatMap((i) => i.game.platforms ?? []))
  const favoriteGameGenre = mostCommon(games.flatMap((i) => i.genres))
  const gameGenreDistribution = computeGenreDistribution(games.map((i) => i.genres))

  return { gamesCompleted, gamesHoursPlayed, gamesAverageScore, topGames, favoritePlatform, favoriteGameGenre, gameGenreDistribution }
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
   */
  const computeStatistics = useCallback(
    async (dateRange?: { start: string; end: string }) => {
      setLoading(true)
      try {
        const items = useShelfStore.getState().items

        let activity: ActivityLogEntry[] = []
        try {
          activity = dateRange
            ? await fetchActivityInRange(dateRange.start, dateRange.end)
            : await fetchActivity()
        } catch (activityError) {
          console.error("[useStatistics] activity_log fetch failed:", activityError)
          // Continue with empty activity — item-based stats still render
        }

        // When a date range is active, scope all item-based aggregations to items
        // that had any recorded activity in the window. We use item timestamp fields
        // (completed_at, started_at, paused_at, dropped_at, revisit_started_at,
        // created_at) rather than activity_log so filtering works even for items
        // added before the log table was populated.
        const scopedItems = dateRange
          ? (() => {
              const start = new Date(`${dateRange.start}T00:00:00`)
              const end = new Date(`${dateRange.end}T23:59:59`)
              return items.filter((item) => {
                const inRange = (ts: string | null) => {
                  if (!ts) return false
                  const d = new Date(ts)
                  return d >= start && d <= end
                }
                return (
                  inRange(item.created_at) ||
                  inRange(item.started_at) ||
                  inRange(item.completed_at) ||
                  inRange(item.paused_at) ||
                  inRange(item.dropped_at) ||
                  inRange(item.revisit_started_at)
                )
              })
            })()
          : items

        // Items completed within the window — uses completed_at timestamp so it
        // works independently of the activity_log being populated.
        const completedInRangeIds = dateRange
          ? (() => {
              const start = new Date(`${dateRange.start}T00:00:00`)
              const end = new Date(`${dateRange.end}T23:59:59`)
              return new Set(
                items
                  .filter((item) => {
                    if (!item.completed_at) return false
                    const d = new Date(item.completed_at)
                    return d >= start && d <= end
                  })
                  .map((item) => item.id),
              )
            })()
          : null

        const completedCount = completedInRangeIds
          ? completedInRangeIds.size
          : items.filter((i) => i.status === "completed").length

        const booksMetadata = computeBooksMetadata(scopedItems, completedInRangeIds)
        const gamesMetadata = computeGamesMetadata(scopedItems, completedInRangeIds)

        const result: Statistics = {
          statusCounts: computeStatusCounts(scopedItems),
          mediaTypeCounts: computeMediaTypeCounts(scopedItems),
          averageScore: computeAverageScore(scopedItems),
          scoreDistribution: computeScoreDistribution(scopedItems),
          scoreDistributionByMediaType: computeScoreDistributionByMediaType(scopedItems),
          statusByMediaType: computeStatusByMediaType(scopedItems),
          topRated: computeTopRated(scopedItems),
          completedCount,
          currentStreak: computeStreak(activity),
          longestStreak: computeLongestStreak(activity),
          mostActiveDayOfWeek: computeMostActiveDayOfWeek(activity),
          heatmapData: computeHeatmapData(activity),
          totalActivity: activity.length,
          rawActivity: activity,
          ...booksMetadata,
          ...gamesMetadata,
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
