/**
 * Arkiv — External Search Hook
 *
 * Handles searching IGDB and Hardcover via Supabase Edge Functions.
 * Returns unified search results for the UI.
 *
 * API response shapes are defined in types/index.ts and match the
 * objects returned by the igdb-proxy and hardcover-proxy Edge Functions.
 */

import { useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type {
  MediaType,
  IgdbSearchResult,
  HardcoverSearchResult,
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
export const SEARCH_PAGE_SIZE = 20

interface PaginatedSearchPayload<T> {
  results: T[]
  hasMore: boolean
}

function formatGameSubtitle(platforms: string[] | null | undefined): string {
  const clean = (platforms ?? []).filter(Boolean)
  if (!clean.length) return "Unknown Platform"
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]}, ${clean[1]}`
  return `${clean[0]} +${clean.length - 1} more`
}

export function useExternalSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const activeSearchRef = useRef<{ query: string; type: MediaType; offset: number } | null>(null)

  const mapResults = useCallback(async (
    data: unknown,
    type: MediaType,
  ): Promise<PaginatedSearchPayload<SearchResult>> => {
    const payload = (Array.isArray(data)
      ? { results: data, hasMore: false }
      : data ?? {}) as Partial<PaginatedSearchPayload<IgdbSearchResult | HardcoverSearchResult>>
    const rawResults = Array.isArray(payload.results) ? payload.results : []

    if (type === "game") {
      return {
        results: (rawResults as IgdbSearchResult[]).map((g) => ({
          id: g.id,
          title: g.name,
          subtitle: formatGameSubtitle(g.platforms),
          cover: g.cover,
          year: g.releaseDate ? g.releaseDate.split("-")[0] : null,
          mediaType: "game",
        })),
        hasMore: Boolean(payload.hasMore),
      }
    }

    return {
      results: (rawResults as HardcoverSearchResult[]).map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.authors?.join(", ") || "Unknown Author",
        cover: b.image,
        year: b.releaseYear ? String(b.releaseYear) : null,
        mediaType: "book",
      })),
      hasMore: Boolean(payload.hasMore),
    }
  }, [])

  const search = useCallback(async (query: string, type: MediaType) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setResults([])
      setHasMore(false)
      activeSearchRef.current = null
      return
    }

    activeSearchRef.current = { query: normalizedQuery, type, offset: 0 }
    setLoading(true)
    try {
      const functionName = type === "game" ? "igdb-proxy" : "hardcover-proxy"
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: "search", query: normalizedQuery, limit: SEARCH_PAGE_SIZE, offset: 0 }
      })

      if (error) throw error

      const mapped = await mapResults(data, type)
      if (
        activeSearchRef.current?.query === normalizedQuery &&
        activeSearchRef.current?.type === type
      ) {
        setResults(mapped.results)
        setHasMore(mapped.hasMore)
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
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [mapResults])

  const loadMore = useCallback(async () => {
    const activeSearch = activeSearchRef.current
    if (!activeSearch || loading || loadingMore || !hasMore) return

    const nextOffset = results.length
    setLoadingMore(true)

    try {
      const functionName = activeSearch.type === "game" ? "igdb-proxy" : "hardcover-proxy"
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: "search",
          query: activeSearch.query,
          limit: SEARCH_PAGE_SIZE,
          offset: nextOffset,
        },
      })

      if (error) throw error

      const mapped = await mapResults(data, activeSearch.type)
      if (
        activeSearchRef.current?.query === activeSearch.query &&
        activeSearchRef.current?.type === activeSearch.type
      ) {
        setResults((current) => [...current, ...mapped.results])
        setHasMore(mapped.hasMore)
        activeSearchRef.current = { ...activeSearch, offset: nextOffset }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      toast.error(`Could not load more results: ${message}`)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loading, loadingMore, mapResults, results.length])

  const clearResults = useCallback(() => {
    setResults([])
    setHasMore(false)
    activeSearchRef.current = null
  }, [])

  return { results, loading, loadingMore, hasMore, search, loadMore, clearResults }
}
