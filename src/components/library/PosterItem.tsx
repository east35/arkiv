import { useState } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { MoreHorizontal, PlayCircle, CheckCircle2, PauseCircle, XCircle, Clock, BookOpen, Gamepad2, ListPlus } from "lucide-react"
import type { FullItem, Status } from "@/types"
import { getStatusDate } from "@/store/useShelfStore"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ManageListsDialog } from "@/components/lists/ManageListsDialog"

interface PosterItemProps {
  item: FullItem
  onEdit: (item: FullItem) => void
  onDelete?: (item: FullItem) => void
}

const statusIcons: Record<Status, React.ReactNode> = {
  backlog: <Clock className="h-3 w-3" />,
  in_progress: <PlayCircle className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  paused: <PauseCircle className="h-3 w-3" />,
  dropped: <XCircle className="h-3 w-3" />,
}

const statusColors: Record<Status, string> = {
  backlog: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20",
  dropped: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20",
}

export function PosterItem({ item, onEdit }: PosterItemProps) {
  const [isManageListsOpen, setIsManageListsOpen] = useState(false)
  const statusDate = getStatusDate(item)
  const isGame = item.media_type === "game"
  const coverUrl = item.cover_url || (isGame 
    ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png" 
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
        <Link to={`/item/${item.id}`} className="block h-full">
          {/* Cover Image */}
          <div className="aspect-[2/3] w-full overflow-hidden bg-muted relative">
            <img
              src={coverUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Status Badge (Top Right) */}
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className={cn("backdrop-blur-md bg-background/50", statusColors[item.status])}>
                {statusIcons[item.status]}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-3 space-y-1.5">
            <h3 className="font-semibold leading-tight line-clamp-1" title={item.title}>
              {item.title}
            </h3>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {isGame ? <Gamepad2 className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                {isGame 
                  ? (item.game.developer || "Unknown Dev")
                  : (item.book.author || "Unknown Author")
                }
              </span>
            </div>

            {/* Progress Bar / Score */}
            <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs">
               <div className="flex items-center gap-1 font-medium">
                  {item.user_score ? (
                    <span className="text-primary">{item.user_score}</span>
                  ) : (
                    <span className="text-muted-foreground/50">-</span>
                  )}
                  <span className="text-muted-foreground text-[10px]">/ 10</span>
               </div>
               
               <div className="text-muted-foreground truncate">
                 {statusDate ? format(new Date(statusDate), "MMM d, yyyy") : ""}
               </div>
            </div>
          </div>
        </Link>

        {/* Quick Actions Menu (Top Right - visible on hover or focus) */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-white hover:text-white hover:bg-black/20")} aria-label="Item actions">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                Edit Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManageListsOpen(true)}>
                <ListPlus className="h-4 w-4 mr-2" />
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
