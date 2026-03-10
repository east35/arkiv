import { useState, useEffect, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { IconSearch, IconLoader2, IconDeviceGamepad2, IconBook, IconX } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchResultItem } from "./SearchResultItem"
import { useDebounce } from "@/hooks/useDebounce"
import { useExternalSearch, SEARCH_DEBOUNCE_MS } from "@/hooks/useExternalSearch"
import { useCommitItem, SHEET_CLOSE_DELAY_MS } from "@/hooks/useCommitItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import type { MediaType, FullItem } from "@/types"
import { SegmentedControl } from "@/components/ui/segmented-control"

export function SearchUI() {
  const navigate = useNavigate()
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

  const typeItems = [
    { value: "game" as MediaType, label: "Games", icon: IconDeviceGamepad2 },
    { value: "book" as MediaType, label: "Books", icon: IconBook },
  ]

  return (
    <div className="flex flex-col fixed md:relative inset-0 md:inset-auto z-[60] md:z-auto bg-background">
      {/* Full-width header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 py-4 border-b mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Add to Collection</h1>
          <div className="flex items-center gap-2">
            <SegmentedControl
              value={mediaType}
              onValueChange={(value) => setMediaType(value as MediaType)}
              items={typeItems.map(({ value, label, icon }) => ({
                value,
                label,
                icon,
                ariaLabel: label,
              }))}
              size="sm"
              className="hidden md:block"
            />
            {/* Mobile close */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => navigate(-1)}
            >
              <IconX className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoFocus
            inputMode="search"
            placeholder={`Search for ${mediaType}s...`}
            className="pl-9 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 px-4 sm:px-6 pb-8 overflow-y-auto flex-1 max-w-3xl w-full mx-auto">
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

      {/* Mobile type picker — pinned to bottom of full-screen overlay */}
      <div className="md:hidden fixed z-20 left-0 right-0 px-4 pb-safe" style={{ bottom: '1rem' }}>
        <SegmentedControl
          value={mediaType}
          onValueChange={(value) => setMediaType(value as MediaType)}
          items={typeItems.map(({ value, label, icon }) => ({
            value,
            label,
            icon,
            ariaLabel: label,
          }))}
          fullWidth
          className="w-full"
          listClassName="rounded-full bg-card shadow-lg"
          triggerClassName="py-2.5"
        />
      </div>
    </div>
  )
}
