import { Link } from "react-router-dom"
import { useShelfStore } from "@/store/useShelfStore"
import { statusIcons, statusLabels } from "@/components/status-icons"
import { cn } from "@/lib/utils"
import type { FullItem, Status } from "@/types"

interface SeriesRowProps {
  item: FullItem
  maxItems?: number
}

/* Status bar colours — mirrors PosterItem */
const STATUS_BAR: Record<Status, string> = {
  in_collection: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
}

const COVER_FALLBACK =
  "https://books.google.com/googlebooks/images/no_cover_thumb.gif"

/**
 * Displays other books in the same series from the user's own library.
 * Uses the same poster card style as PosterItem.
 * Filters the Zustand store by matching `series_name` — no external API call needed.
 * "Back to" label shows the current book's title.
 */
export function SeriesRow({ item, maxItems = 10 }: SeriesRowProps) {
  const items = useShelfStore((s) => s.items)

  if (item.media_type !== "book" || !item.book.series_name) return null

  const seriesName = item.book.series_name
  const seriesBooks = items.filter(
    (i) =>
      i.media_type === "book" &&
      i.book.series_name === seriesName &&
      i.id !== item.id
  )

  if (seriesBooks.length === 0) return null

  // Sort by series position if available, otherwise by title
  const sorted = [...seriesBooks].sort((a, b) => {
    if (a.media_type !== "book" || b.media_type !== "book") return 0
    const posA = a.book.series_position ?? Infinity
    const posB = b.book.series_position ?? Infinity
    if (posA !== posB) return posA - posB
    return a.title.localeCompare(b.title)
  })

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 hidden md:block">
        More in {seriesName}
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {sorted.slice(0, maxItems).map((book) => (
          <Link
            key={book.id}
            to={`/item/${book.id}`}
            state={{ backLabel: item.title }}
            className="overflow-hidden bg-card dark:bg-[#0A0A0A] flex flex-col"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden">
              <img
                src={book.cover_url || COVER_FALLBACK}
                alt={book.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="px-2.5 pt-2 pb-1.5 flex-1">
              <h4 className="font-bold text-sm leading-tight line-clamp-1" title={book.title}>
                {book.title}
              </h4>
              <p className={cn(
                "text-[11px] text-muted-foreground truncate mt-0.5 min-h-[1rem]",
                !(book.media_type === "book" && book.book.author) && "invisible"
              )}>
                {book.media_type === "book" ? book.book.author || " " : " "}
              </p>
            </div>
            <div className={cn("w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px]", STATUS_BAR[book.status])}>
              <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">{statusIcons[book.status]}</span>
              <span className="truncate">{statusLabels[book.status]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
