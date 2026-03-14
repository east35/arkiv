import { useEffect, useState, useMemo } from "react";
import {
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { useShelfStore } from "@/store/useShelfStore";
import { useCollections } from "@/hooks/useCollections";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { CollectionTableRow } from "@/components/collections/CollectionTableRow";
import { cn } from "@/lib/utils";
import type { Collection, SortDirection, ViewMode } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { LibraryControls } from "@/components/library/LibraryControls";

type SortField = "name" | "item_count" | "created_at";
type SortDir = SortDirection;

function sortCollections(collections: Collection[], field: SortField, dir: SortDir): Collection[] {
  return [...collections].sort((a, b) => {
    let cmp = 0;
    if (field === "name") cmp = a.name.localeCompare(b.name);
    else if (field === "item_count")
      cmp = (a.item_count ?? 0) - (b.item_count ?? 0);
    else if (field === "created_at")
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function Collections() {
  const { collections } = useShelfStore();
  const { fetchCollections } = useCollections();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(
    !useShelfStore.getState().collections.length,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("poster");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCollections().finally(() => setLoading(false));
  }, [fetchCollections]);

  const filteredCollections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return collections;

    return collections.filter((collection) => {
      const name = collection.name.toLowerCase();
      const description = collection.description?.toLowerCase() ?? "";
      return name.includes(query) || description.includes(query);
    });
  }, [collections, search]);

  const sorted = useMemo(
    () => sortCollections(filteredCollections, sortField, sortDir),
    [filteredCollections, sortField, sortDir],
  );

  const collectionSortOptions = [
    { value: "name", label: "Name" },
    { value: "item_count", label: "Item Count" },
    { value: "created_at", label: "Date Created" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-20 bg-background px-4 sm:px-6 pt-4 sm:pt-6 sm:pb-6 pb-2">
        <LibraryControls
          title="Collections"
          hideSearch
          hideStatusFilter
          sortOptions={collectionSortOptions}
          sortValue={sortField}
          onSortValueChange={(value) => setSortField(value as SortField)}
          sortDirection={sortDir}
          onSortDirectionChange={setSortDir}
          viewModeValue={viewMode}
          onViewModeValueChange={setViewMode}
        />

        {/* Mobile: search + Filter & Sort on same row */}
        <div className="flex md:hidden items-center bg-background -mx-4 px-4">
          <IconSearch className="h-4 w-4 text-muted-foreground pointer-events-none shrink-0" />
          <Input
            placeholder="Search collections..."
            className="flex-1 h-11 border-0 focus-visible:ring-0 !bg-transparent dark:!bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#f5f5f5] dark:bg-[#171717]">
        {/* Desktop: search below sticky header */}
        <div className="hidden md:block relative bg-background">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search collections..."
            className="pl-12 h-11 border-0 focus-visible:ring-0 !bg-transparent dark:!bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div
          className={cn(
            viewMode === "poster" ? "p-4 sm:p-6" : "pb-8",
          )}
        >
          {loading ? (
            <div className="p-4 sm:p-6">
              <LoadingState />
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                title="No collections yet"
                description="Create collections to organize your library by theme, genre, or reading challenge."
                className="h-64 border-2 border-dashed rounded-lg bg-muted/10"
                titleClassName="mb-2"
                descriptionClassName="mb-4 max-w-sm"
                action={<CreateCollectionDialog />}
              />
            </div>
          ) : viewMode === "poster" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sorted.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="border-2 border-dashed bg-muted/10 text-left transition-colors hover:bg-muted/20"
                aria-label="Add new collection"
                title="Add new collection"
              >
                <div className="aspect-square w-full flex items-center justify-center">
                  <EmptyState
                    icon={<IconPlus className="h-10 w-10" />}
                    title="Add New Collection"
                    className="h-full px-3"
                    titleClassName="text-base"
                  />
                </div>
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {sorted.map((collection, index) => (
                <CollectionTableRow key={collection.id} collection={collection} stacked isFirst={index === 0} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateCollectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
