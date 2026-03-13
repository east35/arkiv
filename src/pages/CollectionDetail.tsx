import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
  IconArrowLeft,
  IconTrash,
  IconQuestionMark,
  IconSearch,
} from "@tabler/icons-react";

import { useShelfStore } from "@/store/useShelfStore";
import { useCollections } from "@/hooks/useCollections";
import { useItems } from "@/hooks/useItems";
import { LibraryControls } from "@/components/library/LibraryControls";
import { ItemDetailHeader } from "@/components/item-detail/ItemDetailHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PosterItem } from "@/components/library/PosterItem";
import { TableItem } from "@/components/library/TableItem";
import { StatusSheet } from "@/components/status-sheet/StatusSheet";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import type { FullItem, CollectionItem } from "@/types";
import { cn } from "@/lib/utils";

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useOutletContext<{ scrolled?: boolean }>();

  const { collections, items: allItems, viewMode } = useShelfStore();
  const { fetchCollections, fetchCollectionItems, deleteCollection, removeItemFromCollection } =
    useCollections();
  const { fetchItems } = useItems(); // To ensure we have items loaded

  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Get collection metadata from store
  const collection = collections.find((entry) => entry.id === id);

  // Fetch data
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Ensure basics are loaded
        if (collections.length === 0) await fetchCollections();
        if (allItems.length === 0) await fetchItems();

        // Fetch collection members
        const members = await fetchCollectionItems(id);
        setCollectionItems(members);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load collection details");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    id,
    collections.length,
    allItems.length,
    fetchCollections,
    fetchItems,
    fetchCollectionItems,
  ]);

  const hydratedItems = useMemo(
    () =>
      collectionItems
      .map((membership) => allItems.find((item) => item.id === membership.item_id))
      .filter((item): item is FullItem => !!item),
    [collectionItems, allItems],
  );

  // Hydrate + filter items
  const displayItems = useMemo(() => {
    if (!search.trim()) return hydratedItems;
    const q = search.toLowerCase();
    return hydratedItems.filter((i) => i.title.toLowerCase().includes(q));
  }, [hydratedItems, search]);

  const gameCount = hydratedItems.filter((item) => item.media_type === "game").length;
  const bookCount = hydratedItems.filter((item) => item.media_type === "book").length;
  const collectionMetaParts = collection
    ? [
        collection.description,
        ...(gameCount > 0 ? [`${gameCount} ${gameCount === 1 ? "game" : "games"}`] : []),
        ...(bookCount > 0 ? [`${bookCount} ${bookCount === 1 ? "book" : "books"}`] : []),
      ]
        .filter(Boolean)
    : [];

  const handleDeleteCollection = async () => {
    if (!collection) return;
    try {
      await deleteCollection(collection.id);
      toast.success("Collection deleted");
      navigate("/collections");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete collection");
    }
  };

  const handleRemoveFromCollection = async (itemId: string) => {
    if (!collection) return;
    try {
      await removeItemFromCollection(collection.id, itemId);
      setCollectionItems((prev) => prev.filter((membership) => membership.item_id !== itemId));
      toast.success("Item removed from collection");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove item");
    }
  };

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

  if (loading && !collection) {
    return <LoadingState className="h-full" />;
  }

  if (!collection) {
    return (
      <EmptyState
        title="Collection not found"
        description="It may have been deleted or the link is invalid."
        icon={<IconQuestionMark className="h-12 w-12" />}
        className="h-full"
        action={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header bar — matches ItemDetailHeader styling */}
      <ItemDetailHeader
        backLabel="Collections"
desktopAction={
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center self-stretch px-3 md:px-5 text-sm font-semibold text-white bg-destructive hover:bg-destructive/90 transition-colors"
          >
            Delete Collection
          </button>
        }
      />

      <div className="bg-background px-4 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
            {collectionMetaParts.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-y-1 text-sm text-muted-foreground">
                {collectionMetaParts.map((part, index) => (
                  <div key={`${part}-${index}`} className="flex items-center">
                    {index > 0 && (
                      <span className="mx-3 text-border/60">|</span>
                    )}
                    <span>{part}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={cn("lg:min-w-[520px] lg:max-w-[620px] lg:w-auto")}>
            <LibraryControls hideSearch />
          </div>
        </div>
      </div>

      <div className="relative bg-background">
        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search collection..."
          className="pl-12 h-11 border-0 focus-visible:ring-0 !bg-transparent dark:!bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 px-4 sm:px-6 pt-6 pb-8 bg-[#f5f5f5] dark:bg-[#171717]">
        {displayItems.length === 0 ? (
          <EmptyState
            title="Empty Collection"
            description="Add items from your library or search."
            className="h-64 border-2 border-dashed rounded-lg bg-muted/10 mx-4 sm:mx-0"
            titleClassName="mb-2"
          />
        ) : (
          <>
            {viewMode === "poster" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
                {displayItems.map((item) => (
                  <div key={item.id} className="relative group/collection-item">
                    <PosterItem item={item} onEdit={handleEdit} />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-6 w-6 opacity-0 group-hover/collection-item:opacity-100 focus:opacity-100 transition-opacity z-10"
                      title="Remove from collection"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveFromCollection(item.id);
                      }}
                    >
                      <IconTrash className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="-mx-4 flex flex-col pb-8 sm:-mx-6">
                {displayItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="group/collection-item relative"
                  >
                    <div className="flex-1 min-w-0">
                      <TableItem
                        item={item}
                        onEdit={handleEdit}
                        stacked
                        isFirst={index === 0}
                        className="pr-10"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-destructive opacity-0 group-hover/collection-item:opacity-100 focus:opacity-100 transition-opacity"
                      title="Remove from collection"
                      onClick={() => handleRemoveFromCollection(item.id)}
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{collection.name}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCollection}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
