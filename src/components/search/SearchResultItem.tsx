import { useState } from "react"
import { IconLoader2, IconPlus, IconCalendar, IconUser, IconDeviceGamepad2, IconArrowLeft } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { SearchResult } from "@/hooks/useExternalSearch"

interface SearchResultItemProps {
  result: SearchResult
  onAdd: (result: SearchResult) => void
  isAdding: boolean
}

export function SearchResultItem({ result, onAdd, isAdding }: SearchResultItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const isGame = result.mediaType === "game"

  const coverUrl = result.cover || (isGame
    ? "https://images.igdb.com/igdb/image/upload/t_cover_small/nocover.png"
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  const largeCoverUrl = result.cover && isGame
    ? result.cover.replace("t_cover_small", "t_cover_big")
    : result.cover || coverUrl

  const SubtitleIcon = isGame ? IconDeviceGamepad2 : IconUser

  return (
    <>
      {/* Result row */}
      <div
        className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent/50 cursor-pointer"
        onClick={() => setIsDetailOpen(true)}
      >
        <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
          <img src={coverUrl} alt={result.title} className="h-full w-full object-cover" loading="lazy" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-semibold leading-tight line-clamp-1">{result.title}</h3>
          <div className="flex items-center text-xs text-muted-foreground gap-3">
            <span className="flex items-center gap-1 truncate max-w-[150px]">
              <SubtitleIcon className="h-3 w-3" />
              {result.subtitle}
            </span>
            {result.year && (
              <span className="flex items-center gap-1 shrink-0">
                <IconCalendar className="h-3 w-3" />
                {result.year}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" disabled={isAdding} onClick={() => onAdd(result)}>
            {isAdding ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <><IconPlus className="h-4 w-4 mr-1" />Add</>}
          </Button>
        </div>
      </div>

      {/* Full-screen detail overlay */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-[70] bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center px-4 py-4 border-b bg-background/95 backdrop-blur shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsDetailOpen(false)}
            >
              <IconArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
              {/* Cover + meta */}
              <div className="flex gap-6 items-start">
                <div className="w-32 sm:w-44 shrink-0 rounded-lg overflow-hidden border shadow-sm aspect-[2/3] bg-muted">
                  <img src={largeCoverUrl} alt={result.title} className="h-full w-full object-cover" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-3 pt-1">
                  <h1 className="text-2xl font-bold leading-tight">{result.title}</h1>

                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <SubtitleIcon className="h-4 w-4 shrink-0" />
                      {result.subtitle}
                    </span>
                    {result.year && (
                      <span className="flex items-center gap-2">
                        <IconCalendar className="h-4 w-4 shrink-0" />
                        {result.year}
                      </span>
                    )}
                  </div>

                  <Badge variant="secondary" className="w-fit capitalize">
                    {result.mediaType}
                  </Badge>
                </div>
              </div>

              {/* Add CTA */}
              <Button
                size="lg"
                className="w-full"
                disabled={isAdding}
                onClick={() => { onAdd(result); setIsDetailOpen(false) }}
              >
                {isAdding
                  ? <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
                  : <IconPlus className="h-4 w-4 mr-2" />
                }
                Add to Collection
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
