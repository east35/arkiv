import { useState, useEffect } from "react"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { LibraryControls } from "./LibraryControls"
import { PosterItem } from "./PosterItem"
import { TableItem } from "./TableItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import type { FullItem, MediaType } from "@/types"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { IconPlus, IconDeviceGamepad2, IconBook, IconSearch } from "@tabler/icons-react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { cn } from "@/lib/utils"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MobileFab } from "@/components/ui/mobile-fab"

const collectionTabs: { type: MediaType; label: string; icon: React.ComponentType<{ className?: string }>; href: string }[] = [
  { type: "game", label: "Games", icon: IconDeviceGamepad2, href: "/games" },
  { type: "book", label: "Books", icon: IconBook,           href: "/books" },
]

interface LibraryViewProps {
  mediaType?: MediaType
  hideSearch?: boolean
}

export default function LibraryView({ mediaType, hideSearch }: LibraryViewProps) {
  const { viewMode, getFilteredItems, filters, setFilters } = useShelfStore()
  const { fetchItems } = useItems()
  const navigate = useNavigate()
  const { navVisible = true } = useOutletContext<{ navVisible?: boolean }>()
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
        {!hideSearch && (
          <div className="relative mb-4 md:hidden">
            <IconSearch className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${mediaType ? mediaType + "s" : "shelf"}...`}
              className="pl-9 h-10"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState
            title="No items found"
            description="Try adjusting your filters or add some new items."
            className="h-64"
            titleClassName="mb-2"
          />
        ) : (
          <>
            {viewMode === "poster" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
                {items.map((item) => (
                  <PosterItem key={item.id} item={item} onEdit={handleEdit} mobileTapAction="details" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-8">
                {items.map((item) => (
                  <TableItem key={item.id} item={item} onEdit={handleEdit} mobileTapAction="details" />
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

      <MobileFab
        onClick={() => navigate(mediaType ? `/search?type=${mediaType}` : "/search")}
        label={`Add ${mediaType ?? "item"}`}
        icon={<IconPlus className="h-6 w-6" />}
        navVisible={navVisible}
        bottom="calc(8rem + env(safe-area-inset-bottom, 0px))"
      />

      {/* Mobile collection tab switcher */}
      {mediaType && (
        <div
          className={cn(
            "md:hidden fixed z-20 left-0 right-0 px-4 transition-transform duration-200 ease-out",
            navVisible ? "translate-y-0" : "translate-y-16"
          )}
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <SegmentedControl
            value={mediaType}
            onValueChange={(value) => {
              const next = collectionTabs.find((tab) => tab.type === value)
              if (next) navigate(next.href)
            }}
            items={collectionTabs.map((tab) => ({
              value: tab.type,
              label: tab.label,
              icon: tab.icon,
              ariaLabel: tab.label,
            }))}
            fullWidth
            className="w-full"
            listClassName="rounded-full bg-card shadow-lg"
            triggerClassName="py-2.5"
          />
        </div>
      )}
    </div>
  )
}
