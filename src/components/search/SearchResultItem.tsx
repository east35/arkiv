import { Loader2, Plus, Calendar, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SearchResult } from "@/hooks/useExternalSearch"

interface SearchResultItemProps {
  result: SearchResult
  onAdd: (result: SearchResult) => void
  isAdding: boolean
}

export function SearchResultItem({ result, onAdd, isAdding }: SearchResultItemProps) {
  const isGame = result.mediaType === "game"
  const coverUrl = result.cover || (isGame 
    ? "https://images.igdb.com/igdb/image/upload/t_cover_small/nocover.png" 
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent/50">
      {/* Cover */}
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
        <img
          src={coverUrl}
          alt={result.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h3 className="font-semibold leading-tight line-clamp-1" title={result.title}>
          {result.title}
        </h3>
        <div className="flex items-center text-xs text-muted-foreground gap-3">
          <span className="flex items-center gap-1 truncate max-w-[150px]">
            <User className="h-3 w-3" />
            {result.subtitle}
          </span>
          {result.year && (
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="h-3 w-3" />
              {result.year}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <Button 
        size="sm" 
        variant="secondary"
        disabled={isAdding}
        onClick={() => onAdd(result)}
        className="shrink-0"
      >
        {isAdding ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </>
        )}
      </Button>
    </div>
  )
}
