import { useState } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { IconDots, IconPlaylistAdd, IconStar } from "@tabler/icons-react"
import type { FullItem, Status } from "@/types"
import { getStatusDate } from "@/store/useShelfStore"
import { cn } from "@/lib/utils"
import { statusIcons } from "@/components/status-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ManageListsDialog } from "@/components/lists/ManageListsDialog"
import { iconActionButtonClassName } from "@/lib/icon-action-button"

interface TableItemProps {
  item: FullItem
  onEdit: (item: FullItem) => void
  mobileTapAction?: "edit" | "details"
}


const statusColors: Record<Status, string> = {
  backlog: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20",
  dropped: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20",
}

export function TableItem({ item, onEdit, mobileTapAction = "edit" }: TableItemProps) {
  const [isManageListsOpen, setIsManageListsOpen] = useState(false)
  const statusDate = getStatusDate(item)
  const isGame = item.media_type === "game"
  const coverUrl = item.cover_url || (isGame 
    ? "https://images.igdb.com/igdb/image/upload/t_cover_small/nocover.png" 
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  const progressDisplay = isGame
    ? `${item.game.progress_hours}h ${item.game.progress_minutes}m`
    : `${item.book.progress ?? 0} / ${item.book.page_count ?? "?"}`

  return (
    <>
      <div className="group flex items-center gap-4 p-2 rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:bg-accent/50">
        {mobileTapAction === "edit" ? (
          <div onClick={() => onEdit(item)} className="flex flex-1 items-center gap-4 min-w-0 cursor-pointer md:hidden">
            {/* Cover (Small) */}
            <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
              <img
                src={coverUrl}
                alt={item.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Title & Author/Dev */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium leading-none truncate" title={item.title}>
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {isGame ? item.game.developer : item.book.author}
              </p>
            </div>

            {/* Score */}
            <div className="w-16 text-right text-sm font-medium hidden sm:flex items-center justify-end gap-1">
              {item.user_score ? (
                <>
                  <span className="font-medium">{item.user_score}</span>
                  <IconStar className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                </>
              ) : (
                <span className="text-muted-foreground/50">-</span>
              )}
            </div>

            {/* Progress */}
            <div className="w-24 text-right text-xs text-muted-foreground hidden md:block">
              {progressDisplay}
            </div>

            {/* Status */}
            <div className="w-28 flex justify-end">
              <Badge variant="outline" className={cn("gap-1.5", statusColors[item.status])}>
                {statusIcons[item.status]}
                <span className="capitalize">{item.status.replace("_", " ")}</span>
              </Badge>
            </div>

            {/* Date */}
            <div className="w-24 text-right text-xs text-muted-foreground hidden lg:flex items-center justify-end gap-1.5">
              {statusDate ? (
                <>
                  {statusIcons[item.status]}
                  {format(new Date(statusDate), "MMM d, yyyy")}
                </>
              ) : "-"}
            </div>
          </div>
        ) : (
          <Link to={`/item/${item.id}`} className="flex flex-1 items-center gap-4 min-w-0 cursor-pointer md:hidden">
            {/* Cover (Small) */}
            <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
              <img
                src={coverUrl}
                alt={item.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Title & Author/Dev */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium leading-none truncate" title={item.title}>
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {isGame ? item.game.developer : item.book.author}
              </p>
            </div>

            {/* Score */}
            <div className="w-16 text-right text-sm font-medium hidden sm:flex items-center justify-end gap-1">
              {item.user_score ? (
                <>
                  <span className="font-medium">{item.user_score}</span>
                  <IconStar className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                </>
              ) : (
                <span className="text-muted-foreground/50">-</span>
              )}
            </div>

            {/* Progress */}
            <div className="w-24 text-right text-xs text-muted-foreground hidden md:block">
              {progressDisplay}
            </div>

            {/* Status */}
            <div className="w-28 flex justify-end">
              <Badge variant="outline" className={cn("gap-1.5", statusColors[item.status])}>
                {statusIcons[item.status]}
                <span className="capitalize">{item.status.replace("_", " ")}</span>
              </Badge>
            </div>

            {/* Date */}
            <div className="w-24 text-right text-xs text-muted-foreground hidden lg:flex items-center justify-end gap-1.5">
              {statusDate ? (
                <>
                  {statusIcons[item.status]}
                  {format(new Date(statusDate), "MMM d, yyyy")}
                </>
              ) : "-"}
            </div>
          </Link>
        )}

        <Link to={`/item/${item.id}`} className="hidden md:flex flex-1 items-center gap-4 min-w-0">
          {/* Cover (Small) */}
          <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
            <img
              src={coverUrl}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Title & Author/Dev */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium leading-none truncate" title={item.title}>
              {item.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {isGame ? item.game.developer : item.book.author}
            </p>
          </div>

          {/* Score */}
          <div className="w-16 text-right text-sm font-medium hidden sm:flex items-center justify-end gap-1">
            {item.user_score ? (
              <>
                <span className="font-medium">{item.user_score}</span>
                <IconStar className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              </>
            ) : (
              <span className="text-muted-foreground/50">-</span>
            )}
          </div>

          {/* Progress */}
          <div className="w-24 text-right text-xs text-muted-foreground hidden md:block">
            {progressDisplay}
          </div>

          {/* Status */}
          <div className="w-28 flex justify-end">
            <Badge variant="outline" className={cn("gap-1.5", statusColors[item.status])}>
              {statusIcons[item.status]}
              <span className="capitalize">{item.status.replace("_", " ")}</span>
            </Badge>
          </div>

          {/* Date */}
          <div className="w-24 text-right text-xs text-muted-foreground hidden lg:flex items-center justify-end gap-1.5">
            {statusDate ? (
              <>
                {statusIcons[item.status]}
                {format(new Date(statusDate), "MMM d, yyyy")}
              </>
            ) : "-"}
          </div>
        </Link>

        {/* Actions */}
        <div className="w-8 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className={iconActionButtonClassName()} aria-label="Item actions">
              <IconDots className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                Edit Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManageListsOpen(true)}>
                <IconPlaylistAdd className="h-4 w-4 mr-2" />
                Add to List...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onEdit(item)}>
                Delete...
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
