import { IconLoader2, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SearchResult } from "@/hooks/useExternalSearch"
import type { ViewMode } from "@/types"

interface SearchResultItemProps {
  result: SearchResult
  viewMode: ViewMode
  isDesktop: boolean
  isAdding: boolean
  onAdd: (result: SearchResult) => void
  onMobileTap: (result: SearchResult) => void
}

function getCoverUrl(result: SearchResult): string {
  if (result.cover) return result.cover

  return result.mediaType === "game"
    ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif"
}

function getMetaText(result: SearchResult): string {
  return [result.subtitle, result.year].filter(Boolean).join(" • ")
}

function PosterSearchResult({
  result,
  isDesktop,
  isAdding,
  onAdd,
  onMobileTap,
}: Omit<SearchResultItemProps, "viewMode">) {
  const coverUrl = getCoverUrl(result)
  const metaText = getMetaText(result)
  const handleActivate = () => {
    if (isAdding) return
    if (isDesktop) {
      onAdd(result)
      return
    }
    onMobileTap(result)
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden bg-card dark:bg-[#0A0A0A] shadow-sm transition-shadow hover:shadow-md",
        "cursor-pointer",
        isAdding && "opacity-75",
      )}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleActivate()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Add ${result.title} to collection`}
      aria-disabled={isAdding}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={result.title}
          className="h-full w-full object-cover transition-transform duration-300 md:group-hover:scale-105"
          loading="lazy"
        />

        {isDesktop && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-black/10 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              className="w-full"
              size="sm"
              disabled={isAdding}
              onClick={(event) => {
                event.stopPropagation()
                handleActivate()
              }}
            >
              {isAdding ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconPlus className="mr-2 h-4 w-4" />
              )}
              Add to Collection
            </Button>
          </div>
        )}

        {isAdding && !isDesktop && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <IconLoader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="px-2.5 pt-2 pb-3">
        <h3 className="line-clamp-1 text-sm font-bold leading-tight" title={result.title}>
          {result.title}
        </h3>
        <p
          className={cn(
            "mt-0.5 min-h-[1rem] truncate text-[11px] text-muted-foreground",
            !metaText && "invisible",
          )}
          title={metaText}
        >
          {metaText || " "}
        </p>
      </div>
    </div>
  )
}

function TableSearchResult({
  result,
  isDesktop,
  isAdding,
  onAdd,
  onMobileTap,
}: Omit<SearchResultItemProps, "viewMode">) {
  const coverUrl = getCoverUrl(result)
  const metaText = getMetaText(result)
  const handleActivate = () => {
    if (isAdding) return
    if (isDesktop) {
      onAdd(result)
      return
    }
    onMobileTap(result)
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-4 border bg-card p-2 text-card-foreground shadow-sm transition-all hover:bg-accent/50",
        "cursor-pointer",
        isAdding && "opacity-75",
      )}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleActivate()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Add ${result.title} to collection`}
      aria-disabled={isAdding}
    >
      <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
        <img
          src={coverUrl}
          alt={result.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium leading-none" title={result.title}>
          {result.title}
        </h3>
        <p
          className={cn(
            "mt-1 truncate text-xs text-muted-foreground",
            !metaText && "invisible",
          )}
          title={metaText}
        >
          {metaText || " "}
        </p>
      </div>

      {isDesktop ? (
        <div className="w-44 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            className="w-full"
            size="sm"
            disabled={isAdding}
            onClick={(event) => {
              event.stopPropagation()
              handleActivate()
            }}
          >
            {isAdding ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <IconPlus className="mr-2 h-4 w-4" />
            )}
            Add to Collection
          </Button>
        </div>
      ) : (
        <div className="w-8 shrink-0 text-right text-muted-foreground">
          {isAdding ? <IconLoader2 className="ml-auto h-4 w-4 animate-spin" /> : null}
        </div>
      )}
    </div>
  )
}

export function SearchResultItem(props: SearchResultItemProps) {
  if (props.viewMode === "table") {
    return <TableSearchResult {...props} />
  }

  return <PosterSearchResult {...props} />
}
