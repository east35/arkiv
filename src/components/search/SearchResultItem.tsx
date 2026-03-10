import { useState } from "react"
import { IconLoader2, IconPlus, IconCalendar, IconUser, IconDeviceGamepad2, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import type { SearchResult } from "@/hooks/useExternalSearch"

interface SearchResultItemProps {
  result: SearchResult
  onAdd: (result: SearchResult) => void
  isAdding: boolean
}

export function SearchResultItem({ result, onAdd, isAdding }: SearchResultItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const isGame = result.mediaType === "game"

  const coverUrl = result.cover || (isGame
    ? "https://images.igdb.com/igdb/image/upload/t_cover_small/nocover.png"
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  const largeCoverUrl = result.cover && isGame
    ? result.cover.replace("t_cover_small", "t_cover_big")
    : coverUrl

  const SubtitleIcon = isGame ? IconDeviceGamepad2 : IconUser

  return (
    <>
      {/* Result row */}
      <div
        className={`flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent/50 ${!isDesktop ? "cursor-pointer" : ""}`}
        onClick={() => !isDesktop && setIsDetailOpen(true)}
      >
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

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="hidden md:flex"
            onClick={() => setIsDetailOpen(true)}
          >
            Details
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={isAdding}
            onClick={() => onAdd(result)}
          >
            {isAdding ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <IconPlus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-xl p-4 pb-8" showCloseButton={false}>
          <div className="flex gap-4 items-start">
            {/* Cover */}
            <div className="w-28 shrink-0 rounded overflow-hidden bg-muted aspect-[2/3]">
              <img
                src={largeCoverUrl}
                alt={result.title}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Details — pr-8 keeps text clear of the IconX we place at top-right */}
            <div className="flex-1 min-w-0 flex flex-col gap-3 pr-8">
              <h2 className="font-bold text-lg leading-tight">{result.title}</h2>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SubtitleIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{result.subtitle}</span>
              </div>

              {result.year && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconCalendar className="h-4 w-4 shrink-0" />
                  <span>{result.year}</span>
                </div>
              )}

              <Button
                className="w-full mt-2"
                disabled={isAdding}
                onClick={() => { onAdd(result); setIsDetailOpen(false) }}
              >
                {isAdding ? (
                  <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <IconPlus className="h-4 w-4 mr-2" />
                )}
                Add to Collection
              </Button>


            </div>
          </div>

          {/* Manual close button — avoids SheetContent's default absolute IconX colliding with title */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3"
            onClick={() => setIsDetailOpen(false)}
          >
            <IconX className="h-4 w-4" />
          </Button>
        </SheetContent>
      </Sheet>
    </>
  )
}
