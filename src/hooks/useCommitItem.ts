/**
 * Arkiv — Commit Hook
 *
 * Handles the "Add to Library" flow:
 * 1. Fetch full details from external API (via Edge Function)
 * 2. Validate the response contains required fields
 * 3. Map external data to Arkiv schema
 * 4. Create item in Supabase
 *
 * API response shapes are defined in types/index.ts and match the
 * objects returned by the igdb-proxy and hardcover-proxy Edge Functions.
 */

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useItems } from "@/hooks/useItems"
import { useShelfStore } from "@/store/useShelfStore"
import type {
  MediaType,
  FullItem,
  Item,
  BookFields,
  GameFields,
  IgdbGameDetails,
  HardcoverBookDetails,
} from "@/types"
import { toast } from "sonner"

/** Duration (ms) to wait before clearing the sheet after it closes. */
export const SHEET_CLOSE_DELAY_MS = 300

/**
 * Normalize a 0–5 rating (Hardcover) to our 0–10 scale.
 * Returns null when the input is missing or out of range.
 */
function normalizeBookRating(rating: number | null): number | null {
  if (rating == null || rating < 0 || rating > 5) return null
  return Math.round(rating * 20) / 10 // e.g. 4.5 → 9.0
}

/**
 * Validate that the API response contains the minimum fields we need
 * to create a library item.
 */
function validateDetails(
  details: IgdbGameDetails | HardcoverBookDetails | null,
  mediaType: MediaType,
): asserts details is IgdbGameDetails | HardcoverBookDetails {
  if (!details) {
    throw new Error("No details returned from API")
  }
  const title = mediaType === "game"
    ? (details as IgdbGameDetails).name
    : (details as HardcoverBookDetails).title
  if (!title) {
    throw new Error("API returned an item with no title")
  }
}

export function useCommitItem() {
  const [committingId, setCommittingId] = useState<string | number | null>(null)
  const { createItem } = useItems()

  /**
   * Fetch full details for an external item, map it to our schema,
   * and persist it to Supabase. Returns the newly created FullItem
   * or null on failure.
   */
  const commit = async (
    id: string | number,
    mediaType: MediaType,
  ): Promise<FullItem | null> => {
    setCommittingId(id)
    try {
      // 1. Fetch full details via Edge Function
      const functionName = mediaType === "game" ? "igdb-proxy" : "hardcover-proxy"
      const { data: details, error: fetchError } = await supabase.functions.invoke(functionName, {
        body: { action: "details", id },
      })

      if (fetchError) throw fetchError

      // 2. Validate response
      validateDetails(details, mediaType)

      // 3. Map to core item schema
      const isGame = mediaType === "game"
      const gameDetails = isGame ? (details as IgdbGameDetails) : null
      const bookDetails = isGame ? null : (details as HardcoverBookDetails)

      const coreItem: Omit<Item, "id" | "user_id" | "created_at" | "updated_at"> = {
        media_type: mediaType,
        title: gameDetails?.name ?? bookDetails!.title,
        cover_url: gameDetails?.cover ?? bookDetails!.image ?? null,
        genres: gameDetails?.genres ?? bookDetails!.genres ?? [],
        description: gameDetails?.summary ?? bookDetails!.description ?? null,
        status: "in_collection",
        user_score: null,
        source_score: isGame
          ? (gameDetails!.sourceScore ?? null)
          : normalizeBookRating(bookDetails!.rating ?? null),
        source_votes: isGame ? (gameDetails!.ratingsCount ?? null) : (bookDetails!.ratingsCount ?? null),
        notes: null,
        source: isGame ? "igdb" : "hardcover",
        external_id: String(id),
        started_at: null,
        completed_at: null,
        paused_at: null,
        dropped_at: null,
      }

      // 4. Map to extension fields
      let extension: Omit<BookFields, "item_id"> | Omit<GameFields, "item_id">

      if (bookDetails) {
        extension = {
          author: bookDetails.authors?.[0] ?? null,
          publisher: bookDetails.publisher ?? null,
          publish_date: bookDetails.releaseDate ?? null,
          page_count: bookDetails.pages ?? null,
          progress: 0,
          format: "digital",
          themes: [],
          isbn: bookDetails.isbn ?? null,
          collection: null,
          series_name: bookDetails.seriesName ?? null,
          series_position: bookDetails.seriesPosition ?? null,
          tag_categories: Object.keys(bookDetails.tagCategories ?? {}).length
            ? bookDetails.tagCategories : null,
        } satisfies Omit<BookFields, "item_id">
      } else {
        extension = {
          developer: gameDetails!.developer ?? null,
          publisher: gameDetails!.publisher ?? null,
          release_date: gameDetails!.releaseDate ?? null,
          platforms: gameDetails!.platforms ?? [],
          format: "digital",
          themes: gameDetails!.themes ?? [],
          screenshots: gameDetails!.screenshots ?? [],
          progress_hours: 0,
          progress_minutes: 0,
          // Prefer the more specific collections name, fall back to franchise
          collection: gameDetails!.collection ?? gameDetails!.franchise ?? null,
          game_modes: gameDetails!.gameModes ?? [],
          player_perspectives: gameDetails!.playerPerspectives ?? [],
          game_category: gameDetails!.gameCategory ?? null,
          steam_id: gameDetails!.steamId ?? null,
          similar_games: gameDetails!.similarGames ?? [],
        } satisfies Omit<GameFields, "item_id">
      }

      // 5. Persist to Supabase
      const newItem = await createItem(coreItem, extension)
      return newItem
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as Record<string, unknown>).message)
          : String(err)
      const code = typeof err === "object" && err !== null && "code" in err
        ? String((err as Record<string, unknown>).code)
        : ""

      // Duplicate constraint — item already exists, return it so callers can navigate
      if (code === "23505" || message.includes("duplicate") || message.includes("unique")) {
        toast.info("Already in your collection.")
        const existing = useShelfStore.getState().items.find(
          i => i.external_id === String(id) && i.media_type === mediaType
        )
        return existing ?? null
      }

      toast.error(`Failed to add item: ${message}`)
      return null
    } finally {
      setCommittingId(null)
    }
  }

  return { commit, committingId }
}
