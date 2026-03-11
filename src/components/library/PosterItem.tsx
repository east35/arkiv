import { useState } from "react"
import { Link } from "react-router-dom"
import { IconDots, IconStar } from "@tabler/icons-react"
import type { FullItem, Status } from "@/types"
import { getStatusDate, useShelfStore } from "@/store/useShelfStore"
import { cn, formatDate } from "@/lib/utils"
import { statusIcons } from "@/components/status-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ManageListsDialog } from "@/components/lists/ManageListsDialog"

interface PosterItemProps {
  item: FullItem
  onEdit: (item: FullItem) => void
  mobileTapAction?: "edit" | "details"
  hideStatusDate?: boolean
}

const STATUS_BAR: Record<Status, string> = {
  backlog: "bg-slate-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  paused: "bg-yellow-500",
  dropped: "bg-red-500",
}

function getProgressLabel(item: FullItem): string | null {
  if (item.media_type === "game") {
    const h = item.game.progress_hours
    const m = item.game.progress_minutes
    if (h > 0 || m > 0) return `${h}h ${String(m).padStart(2, "0")}min`
  } else {
    const p = item.book.progress
    if (p && p > 0) {
      return item.book.page_count ? `${p} / ${item.book.page_count}` : `${p}`
    }
  }
  return null
}

function CardBody({ item }: { item: FullItem }) {
  const isGame = item.media_type === "game"
  const progressLabel = getProgressLabel(item)
  const coverUrl =
    item.cover_url ||
    (isGame
      ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
      : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  const subtitle = isGame
    ? item.game.developer || item.game.publisher || ""
    : item.book.author || item.book.publisher || ""

  return (
    <div className="flex flex-col h-full">
      {/* Cover with overlays */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <img
          src={coverUrl}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Bottom: progress (left) | score (right) */}
        {(progressLabel || item.user_score != null) && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end gap-1 pointer-events-none">
            {progressLabel ? (
              <div className="rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-white text-xs font-semibold leading-none">
                {progressLabel}
              </div>
            ) : <div />}
            {item.user_score != null && (
              <div className="flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm px-2.5 py-1 text-white text-xs font-semibold leading-none shrink-0">
                <IconStar className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                <span>{item.user_score}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title + subtitle */}
      <div className="px-2.5 pt-2 pb-1.5 flex-1">
        <h3 className="font-bold text-sm leading-tight line-clamp-1" title={item.title}>
          {item.title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Status bar */}
      <div className={cn("h-1 w-full shrink-0", STATUS_BAR[item.status])} />
    </div>
  )
}

export function PosterItem({ item, onEdit, mobileTapAction = "edit", hideStatusDate }: PosterItemProps) {
  const [isManageListsOpen, setIsManageListsOpen] = useState(false)
  const statusDate = getStatusDate(item)
  const preferences = useShelfStore((s) => s.preferences)

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md">
        {/* Mobile: configurable tap behavior */}
        {mobileTapAction === "edit" ? (
          <div className="md:hidden cursor-pointer" onClick={() => onEdit(item)}>
            <CardBody item={item} />
          </div>
        ) : (
          <Link to={`/item/${item.id}`} className="md:hidden flex flex-col">
            <CardBody item={item} />
          </Link>
        )}

        {/* Desktop: navigates to detail */}
        <Link to={`/item/${item.id}`} className="hidden md:flex md:flex-col">
          <CardBody item={item} />
        </Link>

        {/* Status pill / hover menu — yamtrack style */}
        {/* Library: always visible pill; icon swaps to ⋯ on hover */}
        {/* Home: dots-only pill appears on hover */}
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-2.5 py-1 text-white text-xs font-semibold leading-none transition-opacity",
                  hideStatusDate
                    ? "opacity-0 group-hover:opacity-100 focus:opacity-100"
                    : "opacity-100",
                )}
                aria-label="Item actions"
              >
                {/* Status icon: visible at rest, hidden on hover */}
                {!hideStatusDate && (
                  <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5 group-hover:hidden">
                    {statusIcons[item.status]}
                  </span>
                )}
                {/* Dots icon: hidden at rest, visible on hover */}
                <span className={cn(
                  "shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5",
                  hideStatusDate ? "block" : "hidden group-hover:block"
                )}>
                  <IconDots className="h-3.5 w-3.5" />
                </span>
                {!hideStatusDate && statusDate && (
                  <span className="truncate max-w-[120px]">
                    {formatDate(statusDate, preferences?.date_format)}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onEdit(item)}>Edit Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManageListsOpen(true)}>Add to List…</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onEdit(item)}>
                Delete…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ManageListsDialog
        itemId={item.id}
        open={isManageListsOpen}
        onOpenChange={setIsManageListsOpen}
      />
    </>
  )
}
