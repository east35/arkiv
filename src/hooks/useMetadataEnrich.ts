/**
 * Arkiv — Metadata Enrichment Hook
 *
 * One-time bulk backfill for imported items missing metadata.
 * Resolves external_id to determine the source API, fetches full
 * details, and updates both core item and extension fields.
 *
 * Strategy:
 *   - Games (igdb:* or legacy numeric IDs): Fetch by IGDB numeric ID via details action
 *   - Books (hardcover:* or legacy numeric IDs): Search Hardcover by title, pick best match,
 *     then fetch full details by ID
 *   - Rate limiting: 250ms delay between IGDB calls (4 req/sec limit),
 *     200ms between Hardcover calls
 */

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { hasHowLongToBeatData } from "@/lib/howlongtobeat"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { toast } from "sonner"
import type {
  FullItem,
  IgdbGameDetails,
  HardcoverBookDetails,
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

/** Delay between Hardcover API calls (ms) — 60 req/min limit */
const HARDCOVER_DELAY_MS = 1_500
const HARDCOVER_RETRY_ATTEMPTS = 4
const HARDCOVER_RETRY_BACKOFF_MS = 700

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Determine if an item needs enrichment.
 * Items missing core metadata, related content, or HLTB timing data are considered sparse.
 * Items without external_id can still be enriched via title search.
 */
function needsEnrichment(item: FullItem): boolean {
  // Check for missing core metadata
  const missingDescription = !item.description
  const missingGenres = !item.genres || item.genres.length === 0

  if (item.media_type === "game") {
    const missingDev = !item.game.developer
    const missingSimilarGames = !item.game.similar_games || item.game.similar_games.length === 0
    const missingHltb = !hasHowLongToBeatData(item.game)
    return missingDescription || missingGenres || missingDev || missingSimilarGames || missingHltb
  }

  if (item.media_type === "book") {
    const missingAuthor = !item.book.author
    return missingDescription || missingGenres || missingAuthor
  }

  return false
}

/**
 * Resolve an external_id into its source and raw ID.
 * Supports both "source:id" values and legacy plain numeric IDs committed by the app.
 */
function parseExternalId(
  externalId: string,
  mediaType: FullItem["media_type"],
  source: FullItem["source"],
): { source: string; id: string } | null {
  const normalized = externalId.trim()
  if (!normalized) return null

  const colonIndex = normalized.indexOf(":")
  if (colonIndex !== -1) {
    return {
      source: normalized.slice(0, colonIndex),
      id: normalized.slice(colonIndex + 1),
    }
  }

  // Older tracked items store raw numeric provider IDs without a source prefix.
  // Use the item source/media type to recover the correct provider.
  if (/^\d+$/.test(normalized)) {
    if (mediaType === "game" && source === "igdb") {
      return { source: "igdb", id: normalized }
    }
    if (mediaType === "book" && source === "hardcover") {
      return { source: "hardcover", id: normalized }
    }
  }

  return null
}

/**
 * Normalize a 0–5 rating (Hardcover) to our 0–10 scale.
 */
function normalizeBookRating(rating: number | null): number | null {
  if (rating == null || rating < 0 || rating > 5) return null
  return Math.round(rating * 20) / 10
}

function describeInvokeError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error"
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : ""
  const status = "context" in error
    ? String(((error as { context?: { status?: unknown } }).context?.status) ?? "")
    : ""
  const parts = [error.message]
  if (code) parts.push(`code=${code}`)
  if (status) parts.push(`status=${status}`)
  return parts.join(" | ")
}

async function invokeHardcover<T>(
  body: { action: "search"; query: string } | { action: "details"; id: number },
): Promise<T | null> {
  for (let attempt = 0; attempt <= HARDCOVER_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.functions.invoke("hardcover-proxy", { body })
    if (!error) return (data as T | null) ?? null

    const status = typeof error === "object" && error !== null && "context" in error
      ? Number(((error as { context?: { status?: unknown } }).context?.status) ?? 0)
      : 0
    const isFetchError = error.name === "FunctionsFetchError"
    const isRetryableHttpError = error.name === "FunctionsHttpError"
      && [429, 500, 502, 503, 504].includes(status)
    const shouldRetry = isFetchError || isRetryableHttpError
    const isLastAttempt = attempt >= HARDCOVER_RETRY_ATTEMPTS
    if (!shouldRetry || isLastAttempt) {
      throw new Error(
        `Hardcover ${body.action} failed: ${describeInvokeError(error)}`,
      )
    }

    await sleep(HARDCOVER_RETRY_BACKOFF_MS * (attempt + 1))
  }

  return null
}

function buildTitleSearchVariants(title: string): string[] {
  const variants: string[] = []
  const trimmed = title.trim()
  if (!trimmed) return variants

  const push = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, " ")
    if (!normalized) return
    if (!variants.includes(normalized)) variants.push(normalized)
  }

  push(trimmed)
  push(trimmed.split(":")[0] ?? "")
  push(trimmed.replace(/[’']/g, ""))
  push(trimmed.replace(/[^\w\s]/g, " "))
  push(trimmed.split(/\s+/).slice(0, 4).join(" "))
  return variants
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
 * Fetch full book details from Hardcover by numeric ID (single call).
 */
async function fetchBookDetailsById(hardcoverId: number): Promise<HardcoverBookDetails | null> {
  return invokeHardcover<HardcoverBookDetails>({
    action: "details",
    id: hardcoverId,
  })
}

/**
 * Search Hardcover by title, then fetch full details for the best match.
 * Fallback when no Hardcover ID is available.
 */
async function fetchBookDetailsByTitle(title: string): Promise<HardcoverBookDetails | null> {
  const variants = buildTitleSearchVariants(title)
  let lastError: unknown = null

  for (const query of variants) {
    try {
      const searchResults = await invokeHardcover<Array<{
        id: number
        title?: string
        authors?: string[]
        image?: string | null
        pages?: number | null
        releaseYear?: number | null
      }>>({
        action: "search",
        query,
      })

      if (!Array.isArray(searchResults) || searchResults.length === 0) continue

      // Try full details for up to the first 3 matches.
      // If details endpoint keeps failing, fall back to partial metadata
      // from search so enrichment can still proceed.
      const candidates = searchResults.slice(0, 3)
      for (const candidate of candidates) {
        try {
          return await fetchBookDetailsById(candidate.id)
        } catch {
          // keep trying next candidate
        }
      }

      const bestMatch = searchResults[0]
      return {
        id: bestMatch.id,
        title: bestMatch.title || "Untitled",
        subtitle: null,
        authors: bestMatch.authors ?? [],
        publisher: null,
        releaseDate: bestMatch.releaseYear ? `${bestMatch.releaseYear}-01-01` : null,
        description: null,
        pages: bestMatch.pages ?? null,
        genres: [],
        tagCategories: {},
        image: bestMatch.image ?? null,
        isbn: null,
        rating: null,
        ratingsCount: null,
        seriesName: null,
        seriesPosition: null,
      }
    } catch (err) {
      lastError = err
    }
  }

  if (lastError instanceof Error) throw lastError
  return null
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
  if (details.ratingsCount != null) itemUpdate.source_votes = details.ratingsCount

  // Game extension fields
  if (details.developer) extUpdate.developer = details.developer
  if (details.publisher) extUpdate.publisher = details.publisher
  if (details.releaseDate) extUpdate.release_date = details.releaseDate
  if (details.platforms?.length) extUpdate.platforms = details.platforms
  if (details.themes?.length) extUpdate.themes = details.themes
  if (details.screenshots?.length) extUpdate.screenshots = details.screenshots
  // Prefer the more specific library name, fall back to franchise
  const libraryName = details.library ?? details.franchise
  if (libraryName) extUpdate.library = libraryName
  if (details.gameModes?.length) extUpdate.game_modes = details.gameModes
  if (details.playerPerspectives?.length) extUpdate.player_perspectives = details.playerPerspectives
  if (details.gameCategory != null) extUpdate.game_category = details.gameCategory
  if (details.steamId) extUpdate.steam_id = details.steamId
  if (details.similarGames?.length) extUpdate.similar_games = details.similarGames
  if (details.hltb_average != null) extUpdate.hltb_average = details.hltb_average
  if (details.hltb_main != null) extUpdate.hltb_main = details.hltb_main
  if (details.hltb_main_extra != null) extUpdate.hltb_main_extra = details.hltb_main_extra
  if (details.hltb_completionist != null) extUpdate.hltb_completionist = details.hltb_completionist

  return { itemUpdate, extUpdate }
}

/**
 * Build Supabase update payloads from Hardcover book details.
 * Only includes fields that have values.
 */
function buildBookUpdate(details: HardcoverBookDetails) {
  const itemUpdate: Record<string, unknown> = {}
  const extUpdate: Record<string, unknown> = {}

  // Core item fields
  if (details.description) itemUpdate.description = details.description
  if (details.genres?.length) itemUpdate.genres = details.genres
  if (details.image) itemUpdate.cover_url = details.image
  const normalizedRating = normalizeBookRating(details.rating ?? null)
  if (normalizedRating != null) itemUpdate.source_score = normalizedRating
  if (details.ratingsCount != null) itemUpdate.source_votes = details.ratingsCount

  // Book extension fields
  if (details.authors?.length) extUpdate.author = details.authors[0]
  if (details.publisher) extUpdate.publisher = details.publisher
  if (details.releaseDate) extUpdate.publish_date = details.releaseDate
  if (details.pages) extUpdate.page_count = details.pages
  if (details.isbn) extUpdate.isbn = details.isbn
  if (details.seriesName) extUpdate.series_name = details.seriesName
  if (details.seriesPosition != null) extUpdate.series_position = details.seriesPosition
  if (Object.keys(details.tagCategories ?? {}).length) extUpdate.tag_categories = details.tagCategories

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
   * 1. Identify sparse items (or all items if force=true)
   * 2. Fetch metadata from external APIs
   * 3. Update items in Supabase
   * 4. Refresh the store
   */
  const execute = useCallback(async (force = false): Promise<EnrichReport> => {
    const items = useShelfStore.getState().items
    const sparse = force ? items : items.filter(needsEnrichment)

    const games = sparse.filter((i) => i.media_type === "game")
    const books = sparse.filter((i) => i.media_type === "book")
    const total = sparse.length

    setProgress({ phase: "enriching", current: 0, total, enriched: 0, skipped: 0, errors: [] })

    let enriched = 0
    let skipped = 0
    let current = 0
    const errors: string[] = []

    const tick = (item: FullItem, result: "enriched" | "skipped" | Error) => {
      if (result === "enriched") enriched++
      else if (result === "skipped") skipped++
      else errors.push(`${item.title}: ${result.message}`)
      current++
      setProgress({ phase: "enriching", current, total, enriched, skipped, errors: [...errors] })
    }

    // Run games (IGDB) and books (Hardcover) in parallel — separate APIs, separate rate limits
    const runGames = async () => {
      for (let i = 0; i < games.length; i++) {
        try {
          tick(games[i], await enrichItem(games[i]))
        } catch (err) {
          tick(games[i], err instanceof Error ? err : new Error(String(err)))
        }
        if (i < games.length - 1) await sleep(IGDB_DELAY_MS)
      }
    }

    const runBooks = async () => {
      for (let i = 0; i < books.length; i++) {
        try {
          tick(books[i], await enrichItem(books[i]))
        } catch (err) {
          tick(books[i], err instanceof Error ? err : new Error(String(err)))
        }
        if (i < books.length - 1) await sleep(HARDCOVER_DELAY_MS)
        // Refresh store every 5 books so results appear incrementally
        if (i > 0 && i % 5 === 0) fetchItems()
      }
    }

    await Promise.all([runGames(), runBooks()])

    // Refresh only the media types touched in this run.
    const touchedMediaTypes = Array.from(new Set(sparse.map((item) => item.media_type)))
    if (touchedMediaTypes.length > 0) {
      await fetchItems(touchedMediaTypes)
    }

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
   * Enrich a single item and refresh it in the store.
   * Returns true if metadata was updated, false if skipped or not found.
   */
  const enrichSingle = useCallback(async (item: FullItem, silent = false): Promise<boolean> => {
    try {
      const result = await enrichItem(item)
      await fetchItems()
      if (!silent) {
        if (result === "enriched") {
          toast.success("Metadata updated.")
        } else {
          toast.warning("No additional metadata found.")
        }
      }
      return result === "enriched"
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!silent) toast.error(`Enrichment failed: ${message}`)
      return false
    }
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

  return { progress, scan, execute, enrichSingle, reset }
}

// ---------------------------------------------------------------------------
// Internal: Single Item Enrichment
// ---------------------------------------------------------------------------

/**
 * Enrich a single item by fetching metadata and updating Supabase.
 * Returns "enriched" if data was updated, "skipped" if no data found.
 */
async function enrichItem(item: FullItem): Promise<"enriched" | "skipped"> {
  const parsed = parseExternalId(item.external_id ?? "", item.media_type, item.source)

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

    const itemUpdated = Object.keys(itemUpdate).length > 0
    const extUpdated = Object.keys(extUpdate).length > 0
    if (!itemUpdated && !extUpdated) return "skipped"

    // Update core item
    if (itemUpdated) {
      const { error } = await supabase
        .from("items")
        .update(itemUpdate)
        .eq("id", item.id)
      if (error) throw new Error(error.message)
    }

    // Update game extension
    if (extUpdated) {
      const { error } = await supabase
        .from("games")
        .update(extUpdate)
        .eq("item_id", item.id)
      if (error) throw new Error(error.message)
    }

    return "enriched"
  }

  if (item.media_type === "book") {
    // For books: use stored Hardcover ID directly if available, else title search
    let details: HardcoverBookDetails | null = null
    if (parsed?.source === "hardcover") {
      const hardcoverId = parseInt(parsed.id, 10)
      if (!isNaN(hardcoverId)) {
        try {
          details = await fetchBookDetailsById(hardcoverId)
        } catch {
          // Some imported Hardcover IDs may be stale/invalid.
          // Fall back to title search instead of failing the entire item.
          details = null
        }
      }
    }
    if (!details) details = await fetchBookDetailsByTitle(item.title)
    if (!details) return "skipped"

    const { itemUpdate, extUpdate } = buildBookUpdate(details)

    const itemUpdated = Object.keys(itemUpdate).length > 0
    const extUpdated = Object.keys(extUpdate).length > 0
    if (!itemUpdated && !extUpdated) return "skipped"

    // Update core item
    if (itemUpdated) {
      const { error } = await supabase
        .from("items")
        .update(itemUpdate)
        .eq("id", item.id)
      if (error) throw new Error(error.message)
    }

    // Update book extension
    if (extUpdated) {
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
