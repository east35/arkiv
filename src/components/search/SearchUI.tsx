import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { IconSearch, IconLoader2, IconDeviceGamepad2, IconBook } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { MediaTypePicker } from "./MediaTypePicker"
import { cn } from "@/lib/utils"
import { SearchResultItem } from "./SearchResultItem"
import { useDebounce } from "@/hooks/useDebounce"
import { useExternalSearch, SEARCH_DEBOUNCE_MS } from "@/hooks/useExternalSearch"
import { useCommitItem, SHEET_CLOSE_DELAY_MS } from "@/hooks/useCommitItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import type { MediaType, FullItem } from "@/types"

export function SearchUI() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mediaType, setMediaType] = useState<MediaType>(
    (searchParams.get("type") as MediaType) || "game"
  )
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const inputRef = useRef<HTMLInputElement>(null)

  // State for post-add editing
  const [newItem, setNewItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
  const { results, loading, search, clearResults } = useExternalSearch()
  const { commit, committingId } = useCommitItem()

  // Attempt focus on mount — works reliably on desktop, best-effort on iOS
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  // Keep URL in sync with query state
  useEffect(() => {
    if (query) {
      setSearchParams({ q: query }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [query, setSearchParams])

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery, mediaType)
    } else {
      clearResults()
    }
  }, [debouncedQuery, mediaType, search, clearResults])

  const handleAdd = async (result: { id: string | number; title: string }) => {
    const item = await commit(result.id, mediaType)
    if (item) {
      setNewItem(item)
      setIsSheetOpen(true)
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      setTimeout(() => setNewItem(null), SHEET_CLOSE_DELAY_MS)
    }
  }

  return (
    <div className="max-w-3xl mx-auto min-h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Add to Shelf</h1>
            <div className="hidden md:block">
              <MediaTypePicker value={mediaType} onChange={setMediaType} />
            </div>
          </div>

          <div className="relative">
            <IconSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              autoFocus
              inputMode="search"
              placeholder={`Search for ${mediaType}s...`}
              className="pl-9 h-10 text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 px-4 sm:px-6 pb-8">
        {results.map((result) => (
          <SearchResultItem
            key={result.id}
            result={result}
            onAdd={() => handleAdd(result)}
            isAdding={committingId === result.id}
          />
        ))}

        {!loading && debouncedQuery && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No results found for "{query}"
          </div>
        )}
      </div>

      <StatusSheet
        item={newItem}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
      />

      {/* Mobile floating type picker — full width, above bottom nav */}
      <div
        className="md:hidden fixed z-20 left-0 right-0 px-4"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center bg-card border rounded-full p-1 shadow-lg">
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-colors",
              mediaType === "game" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMediaType("game")}
          >
            <IconDeviceGamepad2 className="h-4 w-4" />
            Games
          </button>
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-colors",
              mediaType === "book" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMediaType("book")}
          >
            <IconBook className="h-4 w-4" />
            Books
          </button>
        </div>
      </div>
    </div>
  )
}
