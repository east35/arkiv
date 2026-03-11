import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { useLists } from "@/hooks/useLists"
import { PosterItem } from "@/components/library/PosterItem"
import { TableItem } from "@/components/library/TableItem"
import { LibraryControls } from "@/components/library/LibraryControls"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { ListCard } from "@/components/lists/ListCard"
import { CreateListDialog } from "@/components/lists/CreateListDialog"
import { MobileFab } from "@/components/ui/mobile-fab"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { IconLayoutGrid, IconPlus } from "@tabler/icons-react"
import type { FullItem } from "@/types"

export default function Home() {
  const { items, lists, viewMode, sort } = useShelfStore()
  const { fetchItems } = useItems()
  const { fetchLists } = useLists()
  const navigate = useNavigate()
  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [loading, setLoading] = useState(!items.length)

  // Fetch on mount
  useEffect(() => {
    Promise.all([fetchItems(), fetchLists()]).finally(() => setLoading(false))
  }, [fetchItems, fetchLists])

  // Filter for In Progress items
  const inProgressItems = items.filter(item => item.status === "in_progress")

  // Sort using the shared store sort state
  const sortItems = (itemsToSort: FullItem[]) => {
    const dir = sort.direction === "asc" ? 1 : -1
    return [...itemsToSort].sort((a, b) => {
      switch (sort.field) {
        case "title": return a.title.localeCompare(b.title) * dir
        case "rating": return ((a.user_score ?? -1) - (b.user_score ?? -1)) * dir
        case "progress": {
          const pA = a.media_type === "book" ? (a.book.progress ?? 0) : (a.game.progress_hours ?? 0)
          const pB = b.media_type === "book" ? (b.book.progress ?? 0) : (b.game.progress_hours ?? 0)
          return (pA - pB) * dir
        }
        case "started_at": {
          const dA = new Date(a.started_at || 0).getTime()
          const dB = new Date(b.started_at || 0).getTime()
          return (dA - dB) * dir
        }
        default: {
          const dA = new Date(a.updated_at || a.created_at || 0).getTime()
          const dB = new Date(b.updated_at || b.created_at || 0).getTime()
          return (dB - dA) * dir
        }
      }
    })
  }

  const inProgressGames = sortItems(inProgressItems.filter(i => i.media_type === "game"))
  const inProgressBooks = sortItems(inProgressItems.filter(i => i.media_type === "book"))

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

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-4">
        <LibraryControls
          title={
            <>
              <span className="hidden md:inline">Home</span>
              <span className="md:hidden inline-flex items-center">
                <img src="/logo/arkiv-logo-black.svg" alt="Arkiv" className="h-9 dark:hidden" />
                <img src="/logo/arkiv-logo-white.svg" alt="Arkiv" className="h-9 hidden dark:block" />
              </span>
            </>
          }
          hideSearch
        />
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8 space-y-8">
        {loading ? (
          <LoadingState />
        ) : inProgressItems.length === 0 ? (
          <EmptyState
            title="Nothing in progress"
            description="Start a new adventure from your backlog!"
            icon={<IconLayoutGrid className="h-10 w-10" />}
            className="h-64 border-2 border-dashed rounded-lg bg-muted/10"
          />
        ) : (
          <>
            {inProgressGames.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Video Games</h2>
                {viewMode === "poster" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {inProgressGames.map((item) => (
                      <PosterItem key={item.id} item={item} onEdit={handleEdit} hideStatusDate />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {inProgressGames.map((item) => (
                      <TableItem key={item.id} item={item} onEdit={handleEdit} hideStatusDate />
                    ))}
                  </div>
                )}
              </section>
            )}

            {inProgressBooks.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Books</h2>
                {viewMode === "poster" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {inProgressBooks.map((item) => (
                      <PosterItem key={item.id} item={item} onEdit={handleEdit} hideStatusDate />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {inProgressBooks.map((item) => (
                      <TableItem key={item.id} item={item} onEdit={handleEdit} hideStatusDate />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Lists Section */}
        <section className="pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Lists</h2>
            <CreateListDialog />
          </div>
          {lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
              <p className="text-sm">Create lists to organize your collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {lists.map((list) => (
                <ListCard key={list.id} list={list} />
              ))}
            </div>
          )}
        </section>
      </div>

      <StatusSheet 
        item={selectedItem} 
        open={isSheetOpen} 
        onOpenChange={handleSheetOpenChange} 
      />

      <MobileFab
        hiddenClassName="sm:hidden"
        onClick={() => navigate("/search")}
        label="Add item"
        icon={<IconPlus className="h-6 w-6" />}
      />
    </div>
  )
}
