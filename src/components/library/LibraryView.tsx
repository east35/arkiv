import { useState, useEffect } from "react"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { LibraryControls } from "./LibraryControls"
import { PosterItem } from "./PosterItem"
import { TableItem } from "./TableItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import type { FullItem, MediaType } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

interface LibraryViewProps {
  mediaType?: MediaType
  hideSearch?: boolean
}

export default function LibraryView({ mediaType, hideSearch }: LibraryViewProps) {
  const { viewMode, getFilteredItems } = useShelfStore()
  const { fetchItems } = useItems()
  const navigate = useNavigate()
  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [loading, setLoading] = useState(!useShelfStore.getState().items.length)

  // Initial fetch
  useEffect(() => {
    fetchItems().finally(() => setLoading(false))
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
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-4">
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

        <LibraryControls mediaType={mediaType} hideSearch={hideSearch} />
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
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

      {/* Mobile FAB for adding items */}
      <div className="sm:hidden fixed right-4 z-50" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => navigate("/search")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
