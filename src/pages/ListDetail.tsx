import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { IconArrowLeft, IconTrash, IconDots, IconLoader2, IconQuestionMark, IconSearch } from "@tabler/icons-react"

import { useShelfStore } from "@/store/useShelfStore"
import { useLists } from "@/hooks/useLists"
import { useItems } from "@/hooks/useItems"
import { LibraryControls } from "@/components/library/LibraryControls"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PosterItem } from "@/components/library/PosterItem"
import { TableItem } from "@/components/library/TableItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { toast } from "sonner"
import type { FullItem, ListItem } from "@/types"

export default function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { lists, items: allItems, viewMode } = useShelfStore()
  const { fetchLists, fetchListItems, deleteList, removeItemFromList } = useLists()
  const { fetchItems } = useItems() // To ensure we have items loaded

  const [listItems, setListItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Get list metadata from store
  const list = lists.find(l => l.id === id)

  // Fetch data
  useEffect(() => {
    if (!id) return

    const loadData = async () => {
      setLoading(true)
      try {
        // Ensure basics are loaded
        if (lists.length === 0) await fetchLists()
        if (allItems.length === 0) await fetchItems()
        
        // Fetch list members
        const members = await fetchListItems(id)
        setListItems(members)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load list details")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, lists.length, allItems.length, fetchLists, fetchItems, fetchListItems])

  // Hydrate + filter items
  const displayItems = useMemo(() => {
    const hydrated = listItems
      .map(li => allItems.find(i => i.id === li.item_id))
      .filter((i): i is FullItem => !!i)
    if (!search.trim()) return hydrated
    const q = search.toLowerCase()
    return hydrated.filter(i => i.title.toLowerCase().includes(q))
  }, [listItems, allItems, search])

  const handleDeleteList = async () => {
    if (!list) return
    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
      try {
        await deleteList(list.id)
        toast.success("List deleted")
        navigate("/lists")
      } catch (error) {
        console.error(error)
        toast.error("Failed to delete list")
      }
    }
  }

  const handleRemoveFromList = async (itemId: string) => {
    if (!list) return
    try {
      await removeItemFromList(list.id, itemId)
      setListItems(prev => prev.filter(li => li.item_id !== itemId))
      toast.success("Item removed from list")
    } catch (error) {
      console.error(error)
      toast.error("Failed to remove item")
    }
  }

  const handleEdit = (item: FullItem) => {
    setSelectedItem(item)
    setIsSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      setTimeout(() => setSelectedItem(null), 300)
    }
  }

  if (loading && !list) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <IconQuestionMark className="h-12 w-12" />
        <div className="text-center">
          <p className="text-lg font-medium">List not found</p>
          <p className="text-sm">It may have been deleted or the link is invalid.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header — matches other page headers */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <IconArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9">
              <IconDots className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={handleDeleteList}>
                <IconTrash className="h-4 w-4 mr-2" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-end justify-between gap-4 mt-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{list.name}</h1>
            {list.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{list.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {displayItems.length} {displayItems.length === 1 ? "item" : "items"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 w-40 sm:w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <LibraryControls hideSearch />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mx-4 sm:mx-0">
            <p className="text-lg font-medium mb-2">Empty List</p>
            <p className="text-sm">Add items from your shelf or search.</p>
          </div>
        ) : (
          <>
            {viewMode === "poster" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
                {displayItems.map((item) => (
                  <div key={item.id} className="relative group/list-item">
                    <PosterItem item={item} onEdit={handleEdit} />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-6 w-6 opacity-0 group-hover/list-item:opacity-100 focus:opacity-100 transition-opacity z-10"
                      title="Remove from list"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleRemoveFromList(item.id)
                      }}
                    >
                      <IconTrash className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-8">
                {displayItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group/list-item">
                    <div className="flex-1 min-w-0">
                      <TableItem item={item} onEdit={handleEdit} />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/list-item:opacity-100 focus:opacity-100 transition-opacity"
                      title="Remove from list"
                      onClick={() => handleRemoveFromList(item.id)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <StatusSheet 
        item={selectedItem} 
        open={isSheetOpen} 
        onOpenChange={handleSheetOpenChange} 
      />
    </div>
  )
}
