import { useState, useEffect } from "react";
import { useShelfStore } from "@/store/useShelfStore";
import { useItems } from "@/hooks/useItems";
import { PosterItem } from "@/components/library/PosterItem";
import { TableItem } from "@/components/library/TableItem";
import { LibraryControls } from "@/components/library/LibraryControls";
import { StatusSheet } from "@/components/status-sheet/StatusSheet";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { IconLayoutGrid } from "@tabler/icons-react";
import type { FullItem, Status } from "@/types";

export default function Home() {
  const { items, viewMode, sort } = useShelfStore();
  const { fetchItems } = useItems();
  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(!items.length);
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([
    "in_progress",
  ]);

  // Fetch on mount
  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, [fetchItems]);

  const filteredItems = items.filter((item) =>
    selectedStatuses.includes(item.status),
  );

  // Sort using the shared store sort state
  const sortItems = (itemsToSort: FullItem[]) => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...itemsToSort].sort((a, b) => {
      switch (sort.field) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "rating":
          return ((a.user_score ?? -1) - (b.user_score ?? -1)) * dir;
        case "progress": {
          const pA =
            a.media_type === "book"
              ? (a.book.progress ?? 0)
              : (a.game.progress_hours ?? 0);
          const pB =
            b.media_type === "book"
              ? (b.book.progress ?? 0)
              : (b.game.progress_hours ?? 0);
          return (pA - pB) * dir;
        }
        case "started_at": {
          const dA = new Date(a.started_at || 0).getTime();
          const dB = new Date(b.started_at || 0).getTime();
          return (dA - dB) * dir;
        }
        default: {
          const dA = new Date(a.updated_at || a.created_at || 0).getTime();
          const dB = new Date(b.updated_at || b.created_at || 0).getTime();
          return (dB - dA) * dir;
        }
      }
    });
  };

  const filteredGames = sortItems(
    filteredItems.filter((i) => i.media_type === "game"),
  );
  const filteredBooks = sortItems(
    filteredItems.filter((i) => i.media_type === "book"),
  );

  const handleEdit = (item: FullItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setTimeout(() => setSelectedItem(null), 300);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b">
        <LibraryControls
          title={
            <>
              <span className="hidden md:inline">Home</span>
              <span className="md:hidden inline-flex items-center">
                <img
                  src="/logo/arkiv-logo-black.svg"
                  alt="Arkiv"
                  className="h-9 dark:hidden"
                />
                <img
                  src="/logo/arkiv-logo-white.svg"
                  alt="Arkiv"
                  className="h-9 hidden dark:block"
                />
              </span>
            </>
          }
          hideSearch
          statusFilterMode="multi"
          selectedStatuses={selectedStatuses}
          onSelectedStatusesChange={setSelectedStatuses}
        />
      </div>

      <div className="flex-1">
        {loading ? (
          <LoadingState />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No items found"
            description="Try changing your status filter."
            icon={<IconLayoutGrid className="h-10 w-10" />}
            className="m-4 sm:m-6 h-64 border-2 border-dashed rounded-lg bg-muted/10"
          />
        ) : (
          <>
            {filteredGames.length > 0 && (
              <section className="px-4 sm:px-6 py-6 bg-[#f5f5f5] dark:bg-[#171717] border-b border-border/60">
                <h2 className="text-3xl font-semibold mb-6">Video Games</h2>
                {viewMode === "poster" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredGames.map((item) => (
                      <PosterItem
                        key={item.id}
                        item={item}
                        onEdit={handleEdit}
                        hideStatusDate
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredGames.map((item) => (
                      <TableItem
                        key={item.id}
                        item={item}
                        onEdit={handleEdit}
                        hideStatusDate
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {filteredBooks.length > 0 && (
              <section className="px-4 sm:px-6 py-6 bg-[#E8E8E8] dark:bg-[#212121]">
                <h2 className="text-3xl font-semibold mb-6">Books</h2>
                {viewMode === "poster" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredBooks.map((item) => (
                      <PosterItem
                        key={item.id}
                        item={item}
                        onEdit={handleEdit}
                        hideStatusDate
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredBooks.map((item) => (
                      <TableItem
                        key={item.id}
                        item={item}
                        onEdit={handleEdit}
                        hideStatusDate
                      />
                    ))}
                  </div>
                )}
              </section>
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
  );
}
