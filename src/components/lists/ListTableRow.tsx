import { Link } from "react-router-dom"
import { format } from "date-fns"
import { IconDots, IconTrash } from "@tabler/icons-react"
import type { List } from "@/types"
import { useShelfStore } from "@/store/useShelfStore"
import { useLists } from "@/hooks/useLists"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ListTableRowProps {
  list: List
}

export function ListTableRow({ list }: ListTableRowProps) {
  const { deleteList } = useLists()
  const items = useShelfStore(s => s.items)

  const coverItemId = list.cover_item_id ?? list.first_item_id ?? null
  const coverUrl = coverItemId ? (items.find(i => i.id === coverItemId)?.cover_url ?? null) : null
  const itemCount = list.item_count ?? 0

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
      try {
        await deleteList(list.id)
        toast.success("List deleted")
      } catch {
        toast.error("Failed to delete list")
      }
    }
  }

  return (
    <div className="group flex items-center gap-4 p-2 rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:bg-accent/50">
      <Link to={`/lists/${list.id}`} className="flex flex-1 items-center gap-4 min-w-0">
        {/* Cover thumbnail */}
        <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
          {coverUrl ? (
            <img src={coverUrl} alt={list.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm font-bold text-muted-foreground/30">
              {list.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name & description */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium leading-none truncate">{list.name}</h3>
          {list.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{list.description}</p>
          )}
        </div>

        {/* Item count */}
        <div className="w-20 text-right text-sm text-muted-foreground shrink-0">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </div>

        {/* Date */}
        {list.created_at && (
          <div className="w-28 text-right text-xs text-muted-foreground shrink-0 hidden sm:block">
            {format(new Date(list.created_at), "MMM d, yyyy")}
          </div>
        )}
      </Link>

      {/* Actions */}
      <div className="w-8 flex justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")} aria-label="List actions">
            <IconDots className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
              <IconTrash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
