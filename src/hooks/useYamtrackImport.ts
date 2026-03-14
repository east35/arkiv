/**
 * Arkiv — Yamtrack Import Hook
 *
 * Orchestrates CSV parsing, deduplication, and batch insertion
 * of Yamtrack export data into Supabase. Inserts are done in
 * small batches to avoid payload limits and provide progress.
 *
 * ⚠️ Opus scope — batch insert logic.
 */

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useItems } from "@/hooks/useItems"
import {
  parseYamtrackCSV,
  type ParseResult,
  type MappedRow,
} from "@/lib/yamtrack-parser"
import type { HardcoverSearchResult, IgdbGameDetails } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Progress state exposed to the UI */
export interface ImportProgress {
  phase: "idle" | "parsing" | "inserting" | "enriching" | "done" | "error"
  current: number
  total: number
  inserted: number
  enriched: number
  duplicates: number
  errors: string[]
}

/** Final import report */
export interface ImportReport {
  inserted: number
  enriched: number
  duplicates: number
  skipped: { title: string; reason: string }[]
  errors: string[]
  totalParsed: number
}

/** Batch size for Supabase inserts */
const BATCH_SIZE = 10
const ENRICH_BOOKS_ON_IMPORT = true
type InsertRowResult =
  | { kind: "inserted"; itemId: string }
  | { kind: "duplicate" }

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useYamtrackImport() {
  const [progress, setProgress] = useState<ImportProgress>({
    phase: "idle",
    current: 0,
    total: 0,
    inserted: 0,
    enriched: 0,
    duplicates: 0,
    errors: [],
  })

  const { fetchItems } = useItems()

  /**
   * Parse a CSV file string and return the parse result
   * without inserting anything. Used for the preview step.
   */
  const preview = useCallback((csvText: string): ParseResult => {
    return parseYamtrackCSV(csvText)
  }, [])

  /**
   * Execute the full import pipeline:
   * 1. Parse CSV
   * 2. Insert items in batches (item + extension row)
   * 3. Handle duplicates gracefully via external_id unique index
   * 4. Refresh the store
   */
  const execute = useCallback(async (csvText: string): Promise<ImportReport> => {
    // Phase 1: Parse
    setProgress({
      phase: "parsing",
      current: 0,
      total: 0,
      inserted: 0,
      enriched: 0,
      duplicates: 0,
      errors: [],
    })

    const parseResult = parseYamtrackCSV(csvText)
    const { rows, skipped, totalParsed } = parseResult

    // Phase 2: Batch insert
    setProgress({
      phase: "inserting",
      current: 0,
      total: rows.length,
      inserted: 0,
      enriched: 0,
      duplicates: 0,
      errors: [],
    })

    let inserted = 0
    let enriched = 0
    let duplicates = 0
    const errors: string[] = []
    const insertedRows: Array<{ itemId: string; row: MappedRow }> = []

    // Process rows in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((row) => insertRow(row))
      )

      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        if (result.status === "fulfilled") {
          if (result.value.kind === "inserted") {
            inserted++
            insertedRows.push({ itemId: result.value.itemId, row: batch[j] })
          } else if (result.value.kind === "duplicate") {
            duplicates++
          }
        } else {
          const title = batch[j].item.title
          errors.push(`${title}: ${result.reason}`)
        }
      }

      setProgress({
        phase: "inserting",
        current: Math.min(i + BATCH_SIZE, rows.length),
        total: rows.length,
        inserted,
        enriched,
        duplicates,
        errors,
      })
    }

    // Phase 3: Enrich newly inserted items (import includes enrichment by default).
    setProgress({
      phase: "enriching",
      current: 0,
      total: insertedRows.length,
      inserted,
      enriched,
      duplicates,
      errors,
    })

    for (let i = 0; i < insertedRows.length; i++) {
      const entry = insertedRows[i]
      try {
        const didEnrich = await enrichImportedItem(entry.itemId, entry.row)
        if (didEnrich) enriched++
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`${entry.row.item.title}: ${msg}`)
      }

      setProgress({
        phase: "enriching",
        current: i + 1,
        total: insertedRows.length,
        inserted,
        enriched,
        duplicates,
        errors,
      })
    }

    // Phase 4: Refresh store with all items
    await fetchItems()

    setProgress({
      phase: "done",
      current: rows.length,
      total: rows.length,
      inserted,
      enriched,
      duplicates,
      errors,
    })

    return { inserted, enriched, duplicates, skipped, errors, totalParsed }
  }, [fetchItems])

  /**
   * Reset progress state back to idle.
   */
  const reset = useCallback(() => {
    setProgress({
      phase: "idle",
      current: 0,
      total: 0,
      inserted: 0,
      enriched: 0,
      duplicates: 0,
      errors: [],
    })
  }, [])

  return { progress, preview, execute, reset }
}

// ---------------------------------------------------------------------------
// Internal: Single Row Insert
// ---------------------------------------------------------------------------

/**
 * Insert a single mapped row (item + extension) into Supabase.
 * Returns "inserted" on success, "duplicate" if the external_id
 * already exists for this user.
 */
async function insertRow(row: MappedRow): Promise<InsertRowResult> {
  // Insert core item
  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert(row.item)
    .select("id")
    .single()

  if (itemError) {
    // Check for unique constraint violation (duplicate external_id)
    if (itemError.code === "23505") {
      return { kind: "duplicate" } as const
    }
    throw new Error(itemError.message)
  }

  // Insert extension row
  const table = row.item.media_type === "book" ? "books" : "games"
  const { error: extError } = await supabase
    .from(table)
    .insert({ item_id: item.id, ...row.extension })

  if (extError) {
    // If extension insert fails, clean up the orphaned item
    await supabase.from("items").delete().eq("id", item.id)
    throw new Error(extError.message)
  }

  return { kind: "inserted", itemId: item.id } as const
}

async function enrichImportedItem(itemId: string, row: MappedRow): Promise<boolean> {
  if (row.item.media_type === "game") {
    return enrichImportedGame(itemId, row)
  }
  return enrichImportedBook(itemId, row)
}

async function enrichImportedGame(itemId: string, row: MappedRow): Promise<boolean> {
  const externalId = row.item.external_id
  const igdbId = parseSourceId(externalId, "igdb")
  if (!igdbId) return false

  const { data, error } = await supabase.functions.invoke("igdb-proxy", {
    body: { action: "details", id: igdbId },
  })
  if (error) throw new Error(`IGDB details failed: ${error.message}`)

  const details = data as IgdbGameDetails | null
  if (!details) return false

  const itemUpdate: Record<string, unknown> = {}
  const gameUpdate: Record<string, unknown> = {}

  if (details.summary) itemUpdate.description = details.summary
  if (details.genres?.length) itemUpdate.genres = details.genres
  if (details.cover) itemUpdate.cover_url = details.cover
  if (details.sourceScore != null) itemUpdate.source_score = details.sourceScore

  if (details.developer) gameUpdate.developer = details.developer
  if (details.publisher) gameUpdate.publisher = details.publisher
  if (details.releaseDate) gameUpdate.release_date = details.releaseDate
  if (details.platforms?.length) gameUpdate.platforms = details.platforms
  if (details.themes?.length) gameUpdate.themes = details.themes
  if (details.screenshots?.length) gameUpdate.screenshots = details.screenshots
  if (details.hltb_average != null) gameUpdate.hltb_average = details.hltb_average
  if (details.hltb_main != null) gameUpdate.hltb_main = details.hltb_main
  if (details.hltb_main_extra != null) gameUpdate.hltb_main_extra = details.hltb_main_extra
  if (details.hltb_completionist != null) gameUpdate.hltb_completionist = details.hltb_completionist

  if (Object.keys(itemUpdate).length > 0) {
    const { error: updateError } = await supabase.from("items").update(itemUpdate).eq("id", itemId)
    if (updateError) throw new Error(updateError.message)
  }
  if (Object.keys(gameUpdate).length > 0) {
    const { error: updateError } = await supabase.from("games").update(gameUpdate).eq("item_id", itemId)
    if (updateError) throw new Error(updateError.message)
  }
  return Object.keys(itemUpdate).length > 0 || Object.keys(gameUpdate).length > 0
}

async function enrichImportedBook(itemId: string, row: MappedRow): Promise<boolean> {
  if (!ENRICH_BOOKS_ON_IMPORT) {
    // One-off migration mode: skip slow/fragile Hardcover enrichment
    // and keep CSV-imported book fields only.
    return false
  }

  // Search-first strategy: robust for one-off imports and avoids fragile details calls.
  const { data, error } = await supabase.functions.invoke("hardcover-proxy", {
    body: { action: "search", query: row.item.title },
  })
  if (error) throw new Error(`Hardcover search failed: ${error.message}`)

  const searchResults = data as HardcoverSearchResult[] | null
  if (!Array.isArray(searchResults) || searchResults.length === 0) return false

  const best = searchResults[0]
  const itemUpdate: Record<string, unknown> = {}
  const bookUpdate: Record<string, unknown> = {}

  if (best.image) itemUpdate.cover_url = best.image
  if (best.authors?.length) bookUpdate.author = best.authors[0]
  if (best.pages != null) bookUpdate.page_count = best.pages
  if (best.releaseYear) bookUpdate.publish_date = `${best.releaseYear}-01-01`

  if (Object.keys(itemUpdate).length > 0) {
    const { error: updateError } = await supabase.from("items").update(itemUpdate).eq("id", itemId)
    if (updateError) throw new Error(updateError.message)
  }
  if (Object.keys(bookUpdate).length > 0) {
    const { error: updateError } = await supabase.from("books").update(bookUpdate).eq("item_id", itemId)
    if (updateError) throw new Error(updateError.message)
  }

  return Object.keys(itemUpdate).length > 0 || Object.keys(bookUpdate).length > 0
}

function parseSourceId(externalId: string, source: "igdb"): number | null {
  if (!externalId.startsWith(`${source}:`)) return null
  const raw = externalId.slice(source.length + 1)
  const id = parseInt(raw, 10)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}
