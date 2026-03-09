import { Link } from "react-router-dom"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { format } from "date-fns"

import type { List } from "@/types"
import { useLists } from "@/hooks/useLists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buttonVariants } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ListCardProps {
  list: List
}

export function ListCard({ list }: ListCardProps) {
  const { deleteList } = useLists()

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
      try {
        await deleteList(list.id)
        toast.success("List deleted")
      } catch (error) {
        console.error(error)
        toast.error("Failed to delete list")
      }
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Link to={`/lists/${list.id}`} className="block h-full">
        {/* Cover Area (Placeholder for now, later use cover_item_id) */}
        <div className="aspect-[3/2] w-full bg-muted flex items-center justify-center text-muted-foreground/20">
          {/* TODO: Fetch cover item image */}
          <div className="text-4xl font-bold opacity-20">
            {list.name.charAt(0)}
          </div>
        </div>

        <div className="p-4 flex flex-col gap-1">
          <h3 className="font-semibold leading-tight truncate" title={list.name}>
            {list.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
            {list.description || "No description"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Created {format(new Date(list.created_at), "MMM d, yyyy")}
          </p>
        </div>
      </Link>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 bg-background/50 backdrop-blur-sm hover:bg-background/80")}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
