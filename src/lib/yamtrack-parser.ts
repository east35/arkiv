/**
 * Arkiv — Yamtrack CSV Parser
 *
 * Pure functions to parse a Yamtrack export CSV and map rows
 * to Arkiv's database schema. Only `game` and `book` rows
 * are imported; all other media types are skipped.
 *
 * ⚠️ Opus scope — data transformation logic.
 */

import type { MediaType, Status, Source } from "@/types"

// ---------------------------------------------------------------------------
// Yamtrack CSV Row Shape
// ---------------------------------------------------------------------------

/** Raw column names from the Yamtrack CSV header */
export interface YamtrackRow {
  media_id: string
  source: string
  media_type: string
  title: string
  image: string
  season_number: string
  episode_number: string
  score: string
  status: string
  notes: string
  start_date: string
  end_date: string
  progress: string
  created_at: string
  progressed_at: string
}

// ---------------------------------------------------------------------------
// Mapped Output Shapes (ready for Supabase insert)
// ---------------------------------------------------------------------------

/** Core item fields mapped from a Yamtrack row */
export interface MappedItem {
  media_type: MediaType
  title: string
  cover_url: string | null
  genres: string[]
  description: string | null
  status: Status
  user_score: number | null
  source_score: null
  notes: string | null
  source: Source
  external_id: string
  started_at: string | null
  completed_at: string | null
  paused_at: string | null
  dropped_at: string | null
}

/** Book extension fields mapped from a Yamtrack row */
export interface MappedBookExt {
  author: null
  publisher: null
  publish_date: null
  page_count: null
  progress: number | null
  format: null
  themes: string[]
  isbn: null
  collection: null
}

/** Game extension fields mapped from a Yamtrack row */
export interface MappedGameExt {
  developer: null
  publisher: null
  release_date: null
  platforms: string[]
  format: null
  themes: string[]
  screenshots: string[]
  progress_hours: number
  progress_minutes: number
  collection: null
}

/** A fully mapped row ready for batch insert */
export interface MappedRow {
  item: MappedItem
  extension: MappedBookExt | MappedGameExt
}

/** Import summary returned after parsing */
export interface ParseResult {
  rows: MappedRow[]
  skipped: { title: string; reason: string }[]
  totalParsed: number
}

// ---------------------------------------------------------------------------
// Status Mapping
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, Status> = {
  "planning": "backlog",
  "in progress": "in_progress",
  "completed": "completed",
  "paused": "paused",
  "dropped": "dropped",
}

// ---------------------------------------------------------------------------
// Source Mapping
// ---------------------------------------------------------------------------

const SOURCE_MAP: Record<string, Source> = {
  "igdb": "igdb",
  "hardcover": "google_books",
}

// ---------------------------------------------------------------------------
// Pure Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Yamtrack's game progress string into hours and minutes.
 * Formats: "3h 30min", "42h 00min", "0min", "3h 47min"
 */
export function parseGameProgress(progress: string): { hours: number; minutes: number } {
  if (!progress || progress.trim() === "") return { hours: 0, minutes: 0 }

  const hourMatch = progress.match(/(\d+)h/)
  const minMatch = progress.match(/(\d+)\s*min/)

  return {
    hours: hourMatch ? parseInt(hourMatch[1], 10) : 0,
    minutes: minMatch ? Math.min(parseInt(minMatch[1], 10), 59) : 0,
  }
}

/**
 * Parse Yamtrack's book progress string into a page number.
 * It's simply a numeric string (e.g., "320", "0").
 */
export function parseBookProgress(progress: string): number | null {
  if (!progress || progress.trim() === "") return null
  const n = parseInt(progress, 10)
  return isNaN(n) ? null : n
}

/**
 * Map a Yamtrack status string to a Arkiv Status enum value.
 * Falls back to "backlog" for unrecognised values.
 */
export function mapStatus(yamtrackStatus: string): Status {
  return STATUS_MAP[yamtrackStatus.toLowerCase().trim()] ?? "backlog"
}

/**
 * Map a Yamtrack source string to a Arkiv Source enum value.
 * Falls back to "manual" for unrecognised sources.
 */
export function mapSource(yamtrackSource: string): Source {
  return SOURCE_MAP[yamtrackSource.toLowerCase().trim()] ?? "manual"
}

/**
 * Convert a Yamtrack date string to an ISO 8601 string, or null if empty.
 * Yamtrack uses format: "2025-12-09 16:53:00+00:00"
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null
  // Replace the space between date and time with "T" for proper ISO format
  const iso = dateStr.trim().replace(" ", "T")
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Compute the appropriate status-specific date field from a Yamtrack row.
 * Returns the date fields that should be set based on the mapped status.
 */
function computeDateFields(
  status: Status,
  startDate: string,
  endDate: string,
): Pick<MappedItem, "started_at" | "completed_at" | "paused_at" | "dropped_at"> {
  const started = parseDate(startDate)
  const ended = parseDate(endDate)

  return {
    started_at: started,
    completed_at: status === "completed" ? ended : null,
    paused_at: status === "paused" ? (ended ?? started) : null,
    dropped_at: status === "dropped" ? (ended ?? started) : null,
  }
}

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

/**
 * Parse raw CSV text into an array of YamtrackRow objects.
 * Handles quoted fields with commas and escaped quotes.
 */
export function parseCSV(csvText: string): YamtrackRow[] {
  const lines = csvText.split("\n").filter((line) => line.trim() !== "")
  if (lines.length < 2) return []

  // Parse header
  const headers = parseCsvLine(lines[0])

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = values[i] ?? ""
    })
    return row as unknown as YamtrackRow
  })
}

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles commas inside quotes and escaped double-quotes.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }
  }

  result.push(current)
  return result
}

// ---------------------------------------------------------------------------
// Row Mapping
// ---------------------------------------------------------------------------

/**
 * Map a single YamtrackRow to Arkiv schema.
 * Returns null if the row should be skipped (unsupported media_type).
 */
export function mapRow(row: YamtrackRow): MappedRow | null {
  const mediaType = row.media_type.toLowerCase().trim()

  // Only import games and books
  if (mediaType !== "game" && mediaType !== "book") return null

  const status = mapStatus(row.status)
  const source = mapSource(row.source)
  const dates = computeDateFields(status, row.start_date, row.end_date)
  const score = row.score ? parseFloat(row.score) : null
  const validScore = score !== null && !isNaN(score) ? score : null

  // Build external_id: combine source + media_id for uniqueness
  const externalId = `${row.source}:${row.media_id}`

  const item: MappedItem = {
    media_type: mediaType as MediaType,
    title: row.title,
    cover_url: row.image || null,
    genres: [],
    description: null,
    status,
    user_score: validScore,
    source_score: null,
    notes: row.notes || null,
    source,
    external_id: externalId,
    ...dates,
  }

  // Build media-specific extension
  if (mediaType === "book") {
    const extension: MappedBookExt = {
      author: null,
      publisher: null,
      publish_date: null,
      page_count: null,
      progress: parseBookProgress(row.progress),
      format: null,
      themes: [],
      isbn: null,
      collection: null,
    }
    return { item, extension }
  }

  // Game
  const { hours, minutes } = parseGameProgress(row.progress)
  const extension: MappedGameExt = {
    developer: null,
    publisher: null,
    release_date: null,
    platforms: [],
    format: null,
    themes: [],
    screenshots: [],
    progress_hours: hours,
    progress_minutes: minutes,
    collection: null,
  }
  return { item, extension }
}

// ---------------------------------------------------------------------------
// Main Parse + Map Pipeline
// ---------------------------------------------------------------------------

/**
 * Parse a Yamtrack CSV string and return mapped rows + skip summary.
 * This is the main entry point for the import pipeline.
 */
export function parseYamtrackCSV(csvText: string): ParseResult {
  const rawRows = parseCSV(csvText)
  const rows: MappedRow[] = []
  const skipped: { title: string; reason: string }[] = []

  for (const raw of rawRows) {
    const mapped = mapRow(raw)
    if (mapped) {
      rows.push(mapped)
    } else {
      skipped.push({
        title: raw.title,
        reason: `Unsupported media type: ${raw.media_type}`,
      })
    }
  }

  return { rows, skipped, totalParsed: rawRows.length }
}
