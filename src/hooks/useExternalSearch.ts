/**
 * Arkiv — External Search Hook
 *
 * Handles searching IGDB and Hardcover via Supabase Edge Functions.
 * Returns unified search results for the UI.
 *
 * API response shapes are defined in types/index.ts and match the
 * objects returned by the igdb-proxy and hardcover-proxy Edge Functions.
 */

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type {
  MediaType,
  IgdbSearchResult,
  HardcoverSearchResult,
  HardcoverBookDetails,
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

function formatGameSubtitle(platforms: string[] | null | undefined): string {
  const clean = (platforms ?? []).filter(Boolean)
  if (!clean.length) return "Unknown Platform"
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]}, ${clean[1]}`
  return `${clean[0]} +${clean.length - 1} more`
}

async function hydrateBookSearchResults(
  results: HardcoverSearchResult[],
): Promise<HardcoverSearchResult[]> {
  const detailedResults = await Promise.all(
    results.map(async (result) => {
      const { data, error } = await supabase.functions.invoke("hardcover-proxy", {
        body: { action: "details", id: result.id },
      })

      if (error || !data) return result

      const details = data as HardcoverBookDetails
      return {
        ...result,
        title: details.title || result.title,
        authors: details.authors?.length ? details.authors : result.authors,
        image: details.image ?? result.image,
        pages: details.pages ?? result.pages,
        releaseYear: details.releaseDate ? parseInt(details.releaseDate.slice(0, 4), 10) || result.releaseYear : result.releaseYear,
      }
    }),
  )

  return detailedResults
}

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
      const functionName = type === "game" ? "igdb-proxy" : "hardcover-proxy"
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
          subtitle: formatGameSubtitle(g.platforms),
          cover: g.cover,
          year: g.releaseDate ? g.releaseDate.split("-")[0] : null,
          mediaType: "game",
        })))
      } else {
        const hydratedBooks = await hydrateBookSearchResults(data as HardcoverSearchResult[])

        setResults(hydratedBooks.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.authors?.join(", ") || "Unknown Author",
          cover: b.image,
          year: b.releaseYear ? String(b.releaseYear) : null,
          mediaType: "book",
        })))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      const name = err instanceof Error ? err.name : ""
      const code = typeof err === "object" && err !== null && "code" in err
        ? String((err as Record<string, unknown>).code ?? "")
        : ""
      const status = typeof err === "object" && err !== null && "context" in err
        ? String(((err as { context?: { status?: unknown } }).context?.status) ?? "")
        : ""
      const details = [name, code && `code=${code}`, status && `status=${status}`]
        .filter(Boolean)
        .join(" | ")
      toast.error(`Search failed: ${message}`)
      if (details) {
        toast.error(`Search error details: ${details}`)
      }
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => setResults([]), [])

  return { results, loading, search, clearResults }
}
