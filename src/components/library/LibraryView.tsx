import { useState, useEffect } from "react";
import { useShelfStore } from "@/store/useShelfStore";
import { useItems } from "@/hooks/useItems";
import { LibraryControls } from "./LibraryControls";
import { PosterItem } from "./PosterItem";
import { TableItem } from "./TableItem";
import { StatusSheet } from "@/components/status-sheet/StatusSheet";
import type { FullItem, MediaType } from "@/types";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { IconSearch } from "@tabler/icons-react";
import { useOutletContext } from "react-router-dom";

interface LibraryViewProps {
  mediaType?: MediaType;
  hideSearch?: boolean;
}

export default function LibraryView({
  mediaType,
  hideSearch,
}: LibraryViewProps) {
  const { viewMode, getFilteredItems, filters, setFilters } = useShelfStore();
  const { fetchItems } = useItems();
  useOutletContext<{ scrolled?: boolean }>();
  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(
    !useShelfStore.getState().items.length,
  );

  // Initial fetch
  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, [fetchItems]);

  const items = getFilteredItems(mediaType);

  const handleEdit = (item: FullItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      // Clear selection after animation roughly finishes
      setTimeout(() => setSelectedItem(null), 300);
    }
  };

  // Logo icon title for Home (no mediaType): mobile shows icon, desktop shows text
  const titleNode = !mediaType ? (
    <>
      <span className="md:hidden flex items-center justify-center h-9 w-9 bg-primary rounded-sm shrink-0">
        <img src="/logo/arkiv-icon-white.svg" alt="arkiv" className="h-5 w-5" />
      </span>
      <span className="hidden md:inline">Library</span>
    </>
  ) : (
    mediaType + "s"
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-20 bg-background px-4 sm:px-6 pt-4 sm:pt-6 sm:pb-6">
        <LibraryControls
          mediaType={mediaType}
          hideSearch={hideSearch}
          title={titleNode}
        />

        {/* Mobile: search + Filter & Sort on same row (only for Books/Games, not Home) */}
        {!hideSearch && !!mediaType && (
          <div className="flex md:hidden items-center bg-background -mx-4 px-4">
            <IconSearch className="h-4 w-4 text-muted-foreground pointer-events-none shrink-0" />
            <Input
              placeholder={`Search ${mediaType}s...`}
              className="flex-1 h-11 border-0 focus-visible:ring-0 !bg-transparent dark:!bg-transparent"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#f5f5f5] dark:bg-[#171717]">
        {/* Desktop: search below sticky header */}
        {!hideSearch && (
          <div className="hidden md:block relative bg-background">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${mediaType ? mediaType + "s" : "library"}...`}
              className="pl-12 h-11 border-0 focus-visible:ring-0 !bg-transparent dark:!bg-transparent"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        )}

        <div data-transition-boundary="content-start" className="h-0" />

        <div className={viewMode === "table" ? "pb-8" : "p-4"}>
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
                <div className="poster-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {items.map((item) => (
                    <PosterItem
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      mobileTapAction="details"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col">
                  {items.map((item, index) => (
                    <TableItem
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      mobileTapAction="details"
                      stacked
                      isFirst={index === 0}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <StatusSheet
        item={selectedItem}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </div>
  );
}
