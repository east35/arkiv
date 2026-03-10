/**
 * Arkiv — Metadata Enrichment Hook
 *
 * One-time bulk backfill for imported items missing metadata.
 * Parses external_id to determine the source API, fetches full
 * details, and updates both core item and extension fields.
 *
 * Strategy:
 *   - Games (igdb:*):  Fetch by IGDB numeric ID via details action
 *   - Books (hardcover:*): Search Google Books by title (Hardcover IDs
 *     are incompatible), pick best match, then fetch details
 *   - Rate limiting: 250ms delay between IGDB calls (4 req/sec limit),
 *     200ms between Google Books calls
 */

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import type {
  FullItem,
  IgdbGameDetails,
  GoogleBooksDetails,
} from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Progress state exposed to the UI */
export interface EnrichProgress {
  phase: "idle" | "scanning" | "enriching" | "done" | "error"
  current: number
  total: number
  enriched: number
  skipped: number
  errors: string[]
}

/** Final enrichment report */
export interface EnrichReport {
  enriched: number
  skipped: number
  errors: string[]
  total: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Delay between IGDB API calls (ms) — 4 req/sec limit */
const IGDB_DELAY_MS = 260

/** Delay between Google Books API calls (ms) — conservative */
const GBOOKS_DELAY_MS = 200

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Determine if an item needs enrichment.
 * Items missing description, genres, or developer/author are considered sparse.
 * Items without external_id can still be enriched via title search.
 */
function needsEnrichment(item: FullItem): boolean {
  // Check for missing core metadata
  const missingDescription = !item.description
  const missingGenres = !item.genres || item.genres.length === 0

  if (item.media_type === "game") {
    const missingDev = !item.game.developer
    return missingDescription || missingGenres || missingDev
  }

  if (item.media_type === "book") {
    const missingAuthor = !item.book.author
    return missingDescription || missingGenres || missingAuthor
  }

  return false
}

/**
 * Parse an external_id in the format "source:id" into its parts.
 * Returns null if the format is invalid.
 */
function parseExternalId(externalId: string): { source: string; id: string } | null {
  const colonIndex = externalId.indexOf(":")
  if (colonIndex === -1) return null
  return {
    source: externalId.slice(0, colonIndex),
    id: externalId.slice(colonIndex + 1),
  }
}

/**
 * Normalize a 5-star rating (Google Books) to our 0–10 scale.
 */
function normalizeBookRating(rating: number | null): number | null {
  if (rating == null || rating < 0 || rating > 5) return null
  return Math.round(rating * 20) / 10
}

// ---------------------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------------------

/**
 * Fetch full game details from IGDB via the igdb-proxy Edge Function.
 */
async function fetchGameDetails(igdbId: number): Promise<IgdbGameDetails | null> {
  const { data, error } = await supabase.functions.invoke("igdb-proxy", {
    body: { action: "details", id: igdbId },
  })
  if (error) throw new Error(`IGDB fetch failed: ${error.message}`)
  return data ?? null
}

/**
 * Search IGDB by title, then fetch full details for the best match.
 * Fallback when no external_id is available for a game.
 */
async function fetchGameDetailsByTitle(title: string): Promise<IgdbGameDetails | null> {
  const { data: searchResults, error: searchError } = await supabase.functions.invoke(
    "igdb-proxy",
    { body: { action: "search", query: title } },
  )
  if (searchError) throw new Error(`IGDB search failed: ${searchError.message}`)
  if (!Array.isArray(searchResults) || searchResults.length === 0) return null

  const bestMatch = searchResults[0]
  if (typeof bestMatch.id !== "number") return null

  return fetchGameDetails(bestMatch.id)
}

/**
 * Search Google Books by title, then fetch full details for the best match.
 * This two-step process is needed because Hardcover IDs are not Google Books IDs.
 */
async function fetchBookDetailsByTitle(title: string): Promise<GoogleBooksDetails | null> {
  // Step 1: Search by title
  const { data: searchResults, error: searchError } = await supabase.functions.invoke(
    "google-books-proxy",
    { body: { action: "search", query: title } },
  )
  if (searchError) throw new Error(`Google Books search failed: ${searchError.message}`)
  if (!Array.isArray(searchResults) || searchResults.length === 0) return null

  // Step 2: Fetch details for the best match
  const bestMatch = searchResults[0]
  const { data: details, error: detailsError } = await supabase.functions.invoke(
    "google-books-proxy",
    { body: { action: "details", id: bestMatch.id } },
  )
  if (detailsError) throw new Error(`Google Books details failed: ${detailsError.message}`)
  return details ?? null
}

// ---------------------------------------------------------------------------
// Update Builders
// ---------------------------------------------------------------------------

/**
 * Build Supabase update payloads from IGDB game details.
 * Only includes fields that have values (doesn't overwrite user data with null).
 */
function buildGameUpdate(details: IgdbGameDetails) {
  const itemUpdate: Record<string, unknown> = {}
  const extUpdate: Record<string, unknown> = {}

  // Core item fields
  if (details.summary) itemUpdate.description = details.summary
  if (details.genres?.length) itemUpdate.genres = details.genres
  if (details.cover) itemUpdate.cover_url = details.cover
  if (details.sourceScore != null) itemUpdate.source_score = details.sourceScore

  // Game extension fields
  if (details.developer) extUpdate.developer = details.developer
  if (details.publisher) extUpdate.publisher = details.publisher
  if (details.releaseDate) extUpdate.release_date = details.releaseDate
  if (details.platforms?.length) extUpdate.platforms = details.platforms
  if (details.themes?.length) extUpdate.themes = details.themes
  if (details.screenshots?.length) extUpdate.screenshots = details.screenshots

  return { itemUpdate, extUpdate }
}

/**
 * Build Supabase update payloads from Google Books details.
 * Only includes fields that have values.
 */
function buildBookUpdate(details: GoogleBooksDetails) {
  const itemUpdate: Record<string, unknown> = {}
  const extUpdate: Record<string, unknown> = {}

  // Core item fields
  if (details.description) itemUpdate.description = details.description
  if (details.categories?.length) itemUpdate.genres = details.categories
  if (details.thumbnail) itemUpdate.cover_url = details.thumbnail
  const normalizedRating = normalizeBookRating(details.averageRating ?? null)
  if (normalizedRating != null) itemUpdate.source_score = normalizedRating

  // Book extension fields
  if (details.authors?.length) extUpdate.author = details.authors[0]
  if (details.publisher) extUpdate.publisher = details.publisher
  if (details.publishedDate) extUpdate.publish_date = details.publishedDate
  if (details.pageCount) extUpdate.page_count = details.pageCount
  if (details.isbn) extUpdate.isbn = details.isbn

  return { itemUpdate, extUpdate }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMetadataEnrich() {
  const [progress, setProgress] = useState<EnrichProgress>({
    phase: "idle",
    current: 0,
    total: 0,
    enriched: 0,
    skipped: 0,
    errors: [],
  })

  const { fetchItems } = useItems()

  /**
   * Scan the library and return the list of items that need enrichment.
   * Does not modify any data — used for the preview/confirmation step.
   */
  const scan = useCallback((): FullItem[] => {
    const items = useShelfStore.getState().items
    return items.filter(needsEnrichment)
  }, [])

  /**
   * Execute the full enrichment pipeline:
   * 1. Identify sparse items
   * 2. Fetch metadata from external APIs
   * 3. Update items in Supabase
   * 4. Refresh the store
   */
  const execute = useCallback(async (): Promise<EnrichReport> => {
    const items = useShelfStore.getState().items
    const sparse = items.filter(needsEnrichment)

    setProgress({
      phase: "enriching",
      current: 0,
      total: sparse.length,
      enriched: 0,
      skipped: 0,
      errors: [],
    })

    let enriched = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < sparse.length; i++) {
      const item = sparse[i]

      try {
        const result = await enrichItem(item)
        if (result === "enriched") {
          enriched++
        } else {
          skipped++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        errors.push(`${item.title}: ${msg}`)
      }

      setProgress({
        phase: "enriching",
        current: i + 1,
        total: sparse.length,
        enriched,
        skipped,
        errors,
      })

      // Rate limit delay
      const delay = item.media_type === "game" ? IGDB_DELAY_MS : GBOOKS_DELAY_MS
      if (i < sparse.length - 1) await sleep(delay)
    }

    // Refresh store with updated data
    await fetchItems()

    setProgress({
      phase: "done",
      current: sparse.length,
      total: sparse.length,
      enriched,
      skipped,
      errors,
    })

    return { enriched, skipped, errors, total: sparse.length }
  }, [fetchItems])

  /**
   * Reset progress state back to idle.
   */
  const reset = useCallback(() => {
    setProgress({
      phase: "idle",
      current: 0,
      total: 0,
      enriched: 0,
      skipped: 0,
      errors: [],
    })
  }, [])

  return { progress, scan, execute, reset }
}

// ---------------------------------------------------------------------------
// Internal: Single Item Enrichment
// ---------------------------------------------------------------------------

/**
 * Enrich a single item by fetching metadata and updating Supabase.
 * Returns "enriched" if data was updated, "skipped" if no data found.
 */
async function enrichItem(item: FullItem): Promise<"enriched" | "skipped"> {
  const parsed = parseExternalId(item.external_id ?? "")

  if (item.media_type === "game") {
    // For games: use IGDB numeric ID directly, or fall back to title search
    let details: IgdbGameDetails | null = null

    if (parsed?.source === "igdb") {
      const igdbId = parseInt(parsed.id, 10)
      if (!isNaN(igdbId)) details = await fetchGameDetails(igdbId)
    }

    // Fallback: search by title
    if (!details) details = await fetchGameDetailsByTitle(item.title)
    if (!details) return "skipped"

    const { itemUpdate, extUpdate } = buildGameUpdate(details)

    // Update core item
    if (Object.keys(itemUpdate).length > 0) {
      const { error } = await supabase
        .from("items")
        .update(itemUpdate)
        .eq("id", item.id)
      if (error) throw new Error(error.message)
    }

    // Update game extension
    if (Object.keys(extUpdate).length > 0) {
      const { error } = await supabase
        .from("games")
        .update(extUpdate)
        .eq("item_id", item.id)
      if (error) throw new Error(error.message)
    }

    return "enriched"
  }

  if (item.media_type === "book") {
    // For books: search Google Books by title (Hardcover IDs are incompatible)
    const details = await fetchBookDetailsByTitle(item.title)
    if (!details) return "skipped"

    const { itemUpdate, extUpdate } = buildBookUpdate(details)

    // Update core item
    if (Object.keys(itemUpdate).length > 0) {
      const { error } = await supabase
        .from("items")
        .update(itemUpdate)
        .eq("id", item.id)
      if (error) throw new Error(error.message)
    }

    // Update book extension
    if (Object.keys(extUpdate).length > 0) {
      const { error } = await supabase
        .from("books")
        .update(extUpdate)
        .eq("item_id", item.id)
      if (error) throw new Error(error.message)
    }

    return "enriched"
  }

  return "skipped"
}
