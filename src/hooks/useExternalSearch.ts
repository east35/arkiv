/**
 * ShelfLog — External Search Hook
 *
 * Handles searching IGDB and Google Books via Supabase Edge Functions.
 * Returns unified search results for the UI.
 *
 * API response shapes are defined in types/index.ts and match the
 * objects returned by the igdb-proxy and google-books-proxy Edge Functions.
 */

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type {
  MediaType,
  IgdbSearchResult,
  GoogleBooksSearchResult,
} from "@/types"
import { toast } from "sonner"

/** Unified search result presented to the UI layer. */
export interface SearchResult {
  id: string | number
  title: string
  subtitle: string
  cover?: string | null
  year?: string | null
  mediaType: MediaType
}

/** Delay (ms) the UI should debounce keystrokes before triggering search. */
export const SEARCH_DEBOUNCE_MS = 500

export function useExternalSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string, type: MediaType) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const functionName = type === "game" ? "igdb-proxy" : "google-books-proxy"
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: "search", query }
      })

      if (error) throw error

      // Guard: Edge Function may return null/undefined on empty results
      if (!Array.isArray(data)) {
        setResults([])
        return
      }

      if (type === "game") {
        setResults((data as IgdbSearchResult[]).map((g) => ({
          id: g.id,
          title: g.name,
          subtitle: g.platforms?.join(", ") || "Unknown Platform",
          cover: g.cover,
          year: g.releaseDate ? g.releaseDate.split("-")[0] : null,
          mediaType: "game",
        })))
      } else {
        setResults((data as GoogleBooksSearchResult[]).map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.authors?.join(", ") || "Unknown Author",
          cover: b.thumbnail,
          year: b.publishedDate ? b.publishedDate.split("-")[0] : null,
          mediaType: "book",
        })))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      toast.error(`Search failed: ${message}`)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => setResults([]), [])

  return { results, loading, search, clearResults }
}
