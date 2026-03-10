import { Link } from "react-router-dom"
import { IconDots, IconTrash } from "@tabler/icons-react"

import type { List } from "@/types"
import { useShelfStore } from "@/store/useShelfStore"
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
  const items = useShelfStore(s => s.items)

  const coverItemId = list.cover_item_id ?? list.first_item_id ?? null
  const coverUrl = coverItemId
    ? (items.find(i => i.id === coverItemId)?.cover_url ?? null)
    : null

  const itemCount = list.item_count ?? 0
  const countLabel = `${itemCount} ${itemCount === 1 ? "item" : "items"}`

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
        {/* Cover */}
        <div className="aspect-[3/2] w-full bg-muted overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={list.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/20">
                {list.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col gap-0.5">
          <h3 className="font-semibold leading-tight truncate" title={list.name}>
            {list.name}
          </h3>
          {list.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{list.description}</p>
          )}
          <p className="text-xs text-muted-foreground">{countLabel}</p>
        </div>
      </Link>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 bg-background/50 backdrop-blur-sm hover:bg-background/80")}>
            <IconDots className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <IconTrash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
