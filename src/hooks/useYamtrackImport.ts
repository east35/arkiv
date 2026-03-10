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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Progress state exposed to the UI */
export interface ImportProgress {
  phase: "idle" | "parsing" | "inserting" | "done" | "error"
  current: number
  total: number
  inserted: number
  duplicates: number
  errors: string[]
}

/** Final import report */
export interface ImportReport {
  inserted: number
  duplicates: number
  skipped: { title: string; reason: string }[]
  errors: string[]
  totalParsed: number
}

/** Batch size for Supabase inserts */
const BATCH_SIZE = 10

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useYamtrackImport() {
  const [progress, setProgress] = useState<ImportProgress>({
    phase: "idle",
    current: 0,
    total: 0,
    inserted: 0,
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
    setProgress({ phase: "parsing", current: 0, total: 0, inserted: 0, duplicates: 0, errors: [] })

    const parseResult = parseYamtrackCSV(csvText)
    const { rows, skipped, totalParsed } = parseResult

    // Phase 2: Batch insert
    setProgress({
      phase: "inserting",
      current: 0,
      total: rows.length,
      inserted: 0,
      duplicates: 0,
      errors: [],
    })

    let inserted = 0
    let duplicates = 0
    const errors: string[] = []

    // Process rows in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((row) => insertRow(row))
      )

      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        if (result.status === "fulfilled") {
          if (result.value === "inserted") inserted++
          else if (result.value === "duplicate") duplicates++
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
        duplicates,
        errors,
      })
    }

    // Phase 3: Refresh store with all items
    await fetchItems()

    setProgress({
      phase: "done",
      current: rows.length,
      total: rows.length,
      inserted,
      duplicates,
      errors,
    })

    return { inserted, duplicates, skipped, errors, totalParsed }
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
async function insertRow(row: MappedRow): Promise<"inserted" | "duplicate"> {
  // Insert core item
  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert(row.item)
    .select("id")
    .single()

  if (itemError) {
    // Check for unique constraint violation (duplicate external_id)
    if (itemError.code === "23505") {
      return "duplicate"
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

  return "inserted"
}
