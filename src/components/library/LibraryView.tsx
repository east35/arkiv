import { useState, useEffect } from "react"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { LibraryControls } from "./LibraryControls"
import { PosterItem } from "./PosterItem"
import { TableItem } from "./TableItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import type { FullItem, MediaType } from "@/types"
import { Button } from "@/components/ui/button"
import { IconPlus, IconLoader2, IconDeviceGamepad2, IconBook } from "@tabler/icons-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

const collectionTabs: { type: MediaType; label: string; icon: React.ComponentType<{ className?: string }>; href: string }[] = [
  { type: "game", label: "Games", icon: IconDeviceGamepad2, href: "/games" },
  { type: "book", label: "Books", icon: IconBook,           href: "/books" },
]

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
        <LibraryControls
          mediaType={mediaType}
          hideSearch={hideSearch}
          title={mediaType ? mediaType + "s" : "Shelf"}
          addHref={`/search${mediaType ? `?type=${mediaType}` : ""}`}
        />
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      <div className="sm:hidden fixed right-4 z-50" style={{ bottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => navigate(mediaType ? `/search?type=${mediaType}` : "/search")}
        >
          <IconPlus className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile collection tab switcher */}
      {mediaType && (
        <div
          className="md:hidden fixed z-20 left-0 right-0 px-4"
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex items-center bg-card border rounded-full p-1 shadow-lg">
            {collectionTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = mediaType === tab.type
              return (
                <button
                  key={tab.type}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-colors",
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => navigate(tab.href)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
