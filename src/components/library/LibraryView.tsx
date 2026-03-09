import { useState, useEffect } from "react"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { LibraryControls } from "./LibraryControls"
import { PosterItem } from "./PosterItem"
import { TableItem } from "./TableItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import type { FullItem, MediaType } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Link } from "react-router-dom"

interface LibraryViewProps {
  mediaType?: MediaType
}

export default function LibraryView({ mediaType }: LibraryViewProps) {
  const { viewMode, getFilteredItems } = useShelfStore()
  const { fetchItems } = useItems()
  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  
  // Initial fetch
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const items = getFilteredItems(mediaType)

  const handleEdit = (item: FullItem) => {
    setSelectedItem(item)
    setIsSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      // Clear selection after animation roughly finishes
      setTimeout(() => setSelectedItem(null), 300)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold tracking-tight capitalize">
          {mediaType ? mediaType + "s" : "Library"}
        </h1>
        <Link to="/search">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </Link>
      </div>

      <LibraryControls mediaType={mediaType} />

      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No items found</p>
            <p className="text-sm">Try adjusting your filters or add some new items.</p>
          </div>
        ) : (
          <>
            {viewMode === "poster" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
                {items.map((item) => (
                  <PosterItem key={item.id} item={item} onEdit={handleEdit} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-8">
                {items.map((item) => (
                  <TableItem key={item.id} item={item} onEdit={handleEdit} />
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
